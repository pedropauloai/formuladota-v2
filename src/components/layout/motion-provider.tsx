/**
 * FORMULADOTA V2.5 — MotionProvider
 * Provider client-side que ativa LazyMotion domAnimation no root layout.
 *
 * Por que existe:
 * - layout.tsx é Server Component (sem "use client")
 * - LazyMotion precisa rodar no client
 * - Solução: Client Component wrapper que o layout importa
 *
 * LazyMotion domAnimation (~10kb gzipped) cobre:
 *   animate, initial, exit, whileHover, whileTap, whileFocus, variants, AnimatePresence
 *
 * Se precisar de layout animations ou shared element transitions (drag, layout prop),
 * trocar domAnimation por domMax (~34kb). Documentar e validar antes de trocar.
 *
 * strict={true} — lança erro se usar motion.div fora do LazyMotion.
 * Isso garante que nenhum componente acidentalmente importa o bundle completo.
 */

"use client";

import { LazyMotion, domAnimation } from "motion/react";

interface MotionProviderProps {
  children: React.ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
