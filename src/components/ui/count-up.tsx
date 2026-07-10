"use client";

// CountUp — anima um número do valor anterior até o atual (rubrica micro-fx §1: "números
// que mudam não trocam seco"). requestAnimationFrame + easeOutCubic, ~900ms. Respeita
// prefers-reduced-motion (mostra o valor final, sem contar). Barato: só re-renderiza o
// texto. Use em números de DESTAQUE (MMR, XP, nível) — NÃO em listas grandes (>8 juntos
// vira ruído; a rubrica desaconselha).

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/particles/hooks";

interface Props {
  /** Valor alvo. */
  value: number;
  /** Valor inicial na montagem — passe 0 pra CONTAR na entrada (efeito de destaque).
   *  Omitido = começa no próprio value (só anima quando o value muda depois). */
  from?: number;
  /** Duração da contagem (ms). */
  durationMs?: number;
  className?: string;
  /** Texto ANTES do número (ex. "+", "R$ "). String serializável — pode vir de Server
   *  Component (função NÃO pode: quebra o RSC → não usar `format`). */
  prefix?: string;
  /** Texto DEPOIS do número (ex. "%", " XP"). String serializável. */
  suffix?: string;
}

export function CountUp({
  value,
  from,
  durationMs = 900,
  className,
  prefix = "",
  suffix = "",
}: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(from ?? value);
  const fromRef = useRef(from ?? value);
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      // Sem animação: mantém a base sincronizada (ref em effect = ok). O valor exibido
      // vem direto de `value` no render (ver `shown`), sem setState em effect.
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic — chega e assenta
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, durationMs, reduced]);

  // Reduced-motion mostra o valor final direto (derivado no render, sem passar por state).
  const shown = reduced ? value : display;

  return (
    <span className={className}>
      {prefix}
      {shown.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}
