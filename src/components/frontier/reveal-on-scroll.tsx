/**
 * RevealOnScroll — anima o elemento quando ele entra na viewport (scroll reveal).
 *
 * Replica o comportamento AOS (Animate On Scroll) do site oficial Dota 2
 * (New Frontiers), mas usando a infra que o projeto já tem, sem inflar bundle:
 *   - useInViewport (IntersectionObserver puro, já em @/lib/motion/hooks)
 *   - transição via CSS transition (não framer whileInView)
 *
 * IMPORTANTE: o MotionProvider do projeto carrega LazyMotion `domAnimation`,
 * que NÃO inclui o feature `whileInView` (esse só vem no `domMax`, ~34kb).
 * Por isso NÃO usamos m.div + whileInView aqui — usamos IntersectionObserver +
 * CSS, que funciona com qualquer bundle e respeita prefers-reduced-motion.
 *
 * A New Frontiers usa 2 movimentos: "fade-up" (seções subindo) e "fade-left"
 * (laterais). Reproduzimos os dois + fade puro.
 */

"use client";

import { useRef } from "react";
import { useInViewport, useMotionSafeBool } from "@/lib/motion/hooks";

type RevealDirection = "up" | "left" | "right" | "none";

const HIDDEN_TRANSFORM: Record<RevealDirection, string> = {
  up: "translateY(32px)",
  left: "translateX(40px)",
  right: "translateX(-40px)",
  none: "none",
};

interface RevealOnScrollProps {
  /** Direção do movimento de entrada. @default "up" */
  direction?: RevealDirection;
  /** Delay em segundos antes de animar. @default 0 */
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

export function RevealOnScroll({
  direction = "up",
  delay = 0,
  className,
  children,
}: RevealOnScrollProps) {
  const motionSafe = useMotionSafeBool();
  const ref = useRef<HTMLDivElement>(null);
  // Dispara uma única vez ao entrar na viewport (não reseta ao sair).
  // Cast: useInViewport espera RefObject<Element>; o ref pode ser null até montar
  // (comportamento normal de ref), o hook trata isso internamente (if !ref.current).
  const inView = useInViewport(ref as React.RefObject<HTMLDivElement>, 0.15);

  // Sem animação quando o usuário pediu menos movimento — sempre visível.
  if (!motionSafe) {
    return <div className={className}>{children}</div>;
  }

  const hidden = !inView;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? HIDDEN_TRANSFORM[direction] : "none",
        transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
