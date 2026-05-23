/**
 * FORMULADOTA V2.5 — <PageTransition> Wrapper
 * Transição cinematográfica entre rotas do Next.js App Router.
 *
 * Quando usar: EXCLUSIVAMENTE no root layout, envolvendo o {children}.
 * Nunca usar dentro de componentes internos de página.
 *
 * Comportamento:
 * - Exit: opacity → 0 em 240ms (Standard, ease cinematic) — rápido, usuário já processou
 * - Enter: opacity + y → visible em 500ms (Hero, ease soft-landing) — usuário precisa se orientar
 * - AnimatePresence mode="wait" — exit completa antes de enter começar
 *
 * A assimetria exit (rápido) vs enter (lento) é intencional — ver MOTION_SYSTEM.md seção 2.
 *
 * Uso no layout.tsx:
 *   <PageTransition>{children}</PageTransition>
 *
 * Uso com key para forçar re-animação em mudança de rota:
 *   <PageTransition key={pathname}>{children}</PageTransition>
 */

"use client";

import { AnimatePresence, m } from "motion/react";
import { pageEnter, pageExit } from "@/lib/motion/presets";
import { useMotionSafe } from "@/lib/motion/hooks";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";

// ---------------------------------------------------------------------------
// Variant reduzido — apenas fade rápido sem translate, para reduced-motion
// ---------------------------------------------------------------------------
const pageEnterReduced = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.micro,  // 100ms — quase instantâneo
      ease: EASINGS.softLanding,
    },
  },
};

const pageExitReduced = {
  visible: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.micro,
      ease: EASINGS.snappy,
    },
  },
};

// ---------------------------------------------------------------------------
// <PageTransition>
// ---------------------------------------------------------------------------
interface PageTransitionProps {
  /** Conteúdo da página — normalmente o {children} do layout */
  children: React.ReactNode;
  /** className aplicado ao wrapper de motion (opcional) */
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  // Seleciona variants completos ou reduzidos baseado em prefers-reduced-motion
  const enterVariant = useMotionSafe(pageEnter, pageEnterReduced);
  const exitVariant = useMotionSafe(pageExit, pageExitReduced);

  // Mescla enter + exit em um único objeto de variants
  const combinedVariants = {
    ...enterVariant,
    ...exitVariant,
  };

  return (
    <AnimatePresence mode="wait">
      <m.div
        key="page-transition"
        variants={combinedVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={className}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
