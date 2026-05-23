/**
 * FORMULADOTA — Hooks para controle da camada atmosférica
 *
 * Exporta:
 *  - useReducedMotion()    → detecta prefers-reduced-motion do SO
 *  - useAmbientControl()   → estado e controles da AmbientLayer
 *
 * Estes hooks são usados pela AmbientLayer internamente e podem ser
 * consumidos por páginas que precisem controlar a atmosfera.
 *
 * Exemplo de opt-out por página:
 *   const { setDensity } = useAmbientControl()
 *   useEffect(() => { setDensity("off"); return () => setDensity("medium") }, [])
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import type { AmbientDensity } from "@/components/layout/AmbientLayer";

/**
 * useReducedMotion
 *
 * Detecta se o usuário ativou "Reduzir movimento" nas configurações do SO.
 * Em Windows: Configurações > Facilidade de Acesso > Exibição > Animações
 * Em macOS: Preferências > Acessibilidade > Movimento > Reduzir movimento
 * Em Linux: depende do DE, mas a media query é respeitada por browsers modernos.
 *
 * Retorna `true` se o usuário prefere movimento reduzido.
 * Retorna `false` em SSR (sem acesso ao window) — hydration safe.
 */
export function useReducedMotion(): boolean {
  /* Lazy initializer lê a media query uma única vez no momento da criação.
   * Seguro para SSR: typeof window === "undefined" retorna false como padrão.
   * Evita setState síncrono dentro de useEffect (regra react-hooks/set-state-in-effect). */
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    /* window não existe em SSR — verificação de segurança */
    if (typeof window === "undefined") return;

    /* Cria media query pra monitorar a preferência do SO */
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* Listener pra mudanças em tempo real (usuário altera config enquanto usa).
     * Chamado apenas em resposta a evento externo — correto para useEffect. */
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    /* addEventListener é mais moderno que addListener (deprecated) */
    mediaQuery.addEventListener("change", handleChange);

    /* Cleanup: remove listener quando componente desmonta */
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReduced;
}

/**
 * Estado compartilhado da AmbientLayer.
 *
 * Implementação simples sem Context para evitar re-renders.
 * Componentes que modificam via setDensity causam re-render apenas
 * nos subscribers do estado (AmbientLayer).
 */

/* Estado global simples — sem Provider React (evita re-render em árvore) */
let _globalDensity: AmbientDensity = "medium";
const _subscribers = new Set<(d: AmbientDensity) => void>();

function subscribeToAmbient(fn: (d: AmbientDensity) => void) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

function setGlobalDensity(d: AmbientDensity) {
  _globalDensity = d;
  _subscribers.forEach((fn) => fn(d));
}

/**
 * useAmbientControl
 *
 * Retorna o estado e controles da camada atmosférica.
 * Qualquer componente pode chamar setDensity("off") para desligar
 * as partículas naquela página.
 *
 * Exemplo de uso em página:
 * ```tsx
 * export default function MinhaPage() {
 *   const { setDensity } = useAmbientControl()
 *   // Desliga partículas apenas nesta página
 *   useEffect(() => {
 *     setDensity("off")
 *     return () => setDensity("medium") // restaura ao sair
 *   }, [setDensity])
 *   return <main>...</main>
 * }
 * ```
 *
 * @returns objeto com density atual, setter e flags de estado
 */
export function useAmbientControl() {
  const [density, setDensityState] = useState<AmbientDensity>(_globalDensity);
  const isReducedMotion = useReducedMotion();

  /* Estado de pausa — true quando a aba está oculta */
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    /* Subscreve a mudanças externas no density global */
    const unsubscribe = subscribeToAmbient(setDensityState);

    /* Monitora Page Visibility API para saber se a aba está oculta */
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /* Setter estável (sem re-criar a cada render) */
  const setDensity = useCallback((d: AmbientDensity) => {
    setGlobalDensity(d);
  }, []);

  return {
    density,
    setDensity,
    isReducedMotion,
    isPaused,
  };
}
