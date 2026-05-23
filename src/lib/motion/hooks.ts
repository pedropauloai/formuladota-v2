/**
 * FORMULADOTA V2.5 — Motion Hooks
 * Hooks React para integração com o sistema de motion.
 *
 * REGRA: nunca checar prefers-reduced-motion diretamente via window.matchMedia
 * nos componentes — centralizar aqui.
 *
 * Todos os hooks são "use client" — não rodam no servidor.
 * Referência: docs/foundations/MOTION_SYSTEM.md — seções 7 (Reduced-Motion Strategy)
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

// ---------------------------------------------------------------------------
// useMotionSafe
// ---------------------------------------------------------------------------
/**
 * Detecta se o usuário prefere movimento reduzido e retorna o valor adequado.
 *
 * Usa `useReducedMotion()` do Motion v12 internamente — delega a detecção
 * para a biblioteca, que já trata SSR e mudanças dinâmicas da preferência.
 *
 * @param full    Valor quando animações são seguras (motion ativado)
 * @param reduced Valor quando o usuário prefere movimento reduzido
 * @returns       `full` se animações são seguras, `reduced` caso contrário
 *
 * @example
 * // Selecionar variant com ou sem translate
 * const variant = useMotionSafe(fadeInUp, fadeIn);
 *
 * // Selecionar duration (0 = instantâneo em reduced)
 * const duration = useMotionSafe(0.24, 0);
 *
 * // Verificar diretamente (retorna boolean)
 * const motionSafe = useMotionSafe(true, false);
 */
export function useMotionSafe<T>(full: T, reduced: T): T {
  const prefersReduced = useReducedMotion();
  return prefersReduced ? reduced : full;
}

// ---------------------------------------------------------------------------
// useMotionSafeBool
// ---------------------------------------------------------------------------
/**
 * Versão simplificada que retorna `true` quando motion é seguro.
 * Atalho para o caso mais comum: verificar se deve animar ou não.
 *
 * @returns true quando animações são seguras, false quando reduced-motion ativo
 *
 * @example
 * const canAnimate = useMotionSafeBool();
 * if (!canAnimate) return <div>{children}</div>;
 * return <motion.div variants={fadeIn}>{children}</motion.div>;
 */
export function useMotionSafeBool(): boolean {
  return useMotionSafe(true, false);
}

// ---------------------------------------------------------------------------
// useStaggerChildren
// ---------------------------------------------------------------------------
/**
 * Retorna configuração de transição para stagger de filhos.
 * Usado internamente pelo wrapper <Stagger> e por componentes que
 * precisam de controle granular sobre o stagger.
 *
 * @param delay Delay em segundos entre cada filho (padrão: 0.06 = 60ms)
 * @returns Objeto de transição para usar em `transition` do container
 *
 * @example
 * const staggerConfig = useStaggerChildren(0.08); // 80ms entre itens
 * <motion.ul transition={staggerConfig} variants={staggerChildren}>
 */
export function useStaggerChildren(delay = 0.06): {
  staggerChildren: number;
  delayChildren: number;
} {
  return {
    staggerChildren: delay,
    delayChildren: 0.04, // 40ms antes do primeiro filho começar
  };
}

// ---------------------------------------------------------------------------
// useInViewport
// ---------------------------------------------------------------------------
/**
 * Detecta se um elemento está visível no viewport usando IntersectionObserver.
 * Retorna true uma vez que o elemento entra no viewport (sem resetar ao sair).
 *
 * Uso típico: disparar animações de entrada quando o elemento aparece ao rolar.
 * Uma vez animado, o elemento permanece no estado visível mesmo ao sair do viewport.
 *
 * @param ref       Referência ao elemento DOM a observar
 * @param threshold Porcentagem do elemento que deve estar visível (padrão: 0.1 = 10%)
 * @returns         true quando o elemento entrou no viewport, false antes disso
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * const inView = useInViewport(ref);
 *
 * return (
 *   <motion.div
 *     ref={ref}
 *     variants={fadeInUp}
 *     initial="hidden"
 *     animate={inView ? "visible" : "hidden"}
 *   />
 * );
 */
export function useInViewport<T extends Element>(
  ref: React.RefObject<T>,
  threshold = 0.1
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // Não rodar no servidor (SSR) — IntersectionObserver não existe lá
    if (typeof window === "undefined") return;
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry !== undefined && entry.isIntersecting) {
          setInView(true);
          // Para de observar após entrar — animação acontece uma única vez
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}

// ---------------------------------------------------------------------------
// useInViewportReset
// ---------------------------------------------------------------------------
/**
 * Variante de useInViewport que reseta ao sair do viewport.
 * Útil para elementos que devem animar toda vez que aparecem (ex: seções de scroll).
 *
 * @param ref       Referência ao elemento DOM a observar
 * @param threshold Porcentagem de visibilidade para disparar (padrão: 0.1)
 * @returns         Estado atual de visibilidade (muda ao entrar/sair)
 */
export function useInViewportReset<T extends Element>(
  ref: React.RefObject<T>,
  threshold = 0.1
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry !== undefined) {
          setInView(entry.isIntersecting);
        }
      },
      { threshold }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}

// ---------------------------------------------------------------------------
// useAnimationComplete
// ---------------------------------------------------------------------------
/**
 * Hook utilitário para executar um callback quando uma animação terminar.
 * Usa uma ref interna para persistir o callback sem re-renderizar.
 *
 * @param callback Função a executar quando a animação completar
 * @returns        Função handler para passar ao `onAnimationComplete` do Motion
 *
 * @example
 * const onComplete = useAnimationComplete(() => console.log("animação pronta"));
 * <motion.div onAnimationComplete={onComplete} variants={pageEnter} />
 */
export function useAnimationComplete(callback: () => void): () => void {
  const callbackRef = useRef(callback);
  // Atualiza o ref via efeito — evita mutação durante render
  useEffect(() => {
    callbackRef.current = callback;
  });
  return () => callbackRef.current();
}
