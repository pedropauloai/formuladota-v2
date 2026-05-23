/**
 * FORMULADOTA V2.5 — <FadeIn> Wrapper
 * Wrapper polimórfico para fade de entrada/saída.
 *
 * Quando usar: qualquer elemento que entra no DOM e precisa aparecer gradualmente.
 * Ex: conteúdo carregado via data fetching, mensagens de erro, tooltips.
 *
 * Prop `as` — define a tag HTML renderizada (padrão: "div").
 * Reduced-motion — retorna conteúdo sem animação se prefers-reduced-motion ativo.
 *
 * Uso:
 *   <FadeIn>Conteúdo</FadeIn>
 *   <FadeIn as="section" className="mt-4">Conteúdo</FadeIn>
 *   <FadeIn delay={0.2}>Conteúdo com delay</FadeIn>
 */

"use client";

import { m, AnimatePresence } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import { fadeIn } from "@/lib/motion/presets";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ---------------------------------------------------------------------------
// Tipos suportados para a prop `as` (tag polimórfica)
// Limitado às tags HTML mais comuns — sem over-engenharia de generics TS.
// ---------------------------------------------------------------------------
type SupportedTag =
  | "div"
  | "section"
  | "article"
  | "main"
  | "aside"
  | "header"
  | "footer"
  | "nav"
  | "ul"
  | "ol"
  | "li"
  | "span"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6";

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "animate"> {
  /** Tag HTML renderizada (padrão: "div") */
  as?: SupportedTag;
  /** Delay em segundos antes da animação começar (padrão: 0) */
  delay?: number;
  children: React.ReactNode;
}

export function FadeIn({
  as = "div",
  delay,
  children,
  ...props
}: FadeInProps) {
  const motionSafe = useMotionSafeBool();

  // Sem animação quando prefers-reduced-motion está ativo
  if (!motionSafe) {
    const Tag = as;
    return <Tag {...(props as React.HTMLAttributes<HTMLElement>)}>{children}</Tag>;
  }

  // Seleciona o componente motion correspondente à tag
  // m.div, m.section, m.article, etc. são equivalentes a motion.div mas mais leves
  const Component = m[as] as React.ComponentType<HTMLMotionProps<typeof as>>;

  // Variant com delay opcional — cria novo objeto de transition com delay
  const visibleState = fadeIn.visible;
  const baseTransition =
    visibleState && typeof visibleState === "object" && "transition" in visibleState
      ? (visibleState as { transition?: object }).transition
      : {};

  const variantWithDelay = delay
    ? {
        ...fadeIn,
        visible: {
          ...visibleState,
          transition: { ...baseTransition, delay },
        },
      }
    : fadeIn;

  return (
    <Component
      variants={variantWithDelay}
      initial="hidden"
      animate="visible"
      exit="exit"
      {...(props as HTMLMotionProps<typeof as>)}
    >
      {children}
    </Component>
  );
}

/**
 * <FadeInPresence> — versão com AnimatePresence embutido.
 * Uso: quando o elemento pode ser montado/desmontado e precisa de exit animation.
 *
 * @example
 * <FadeInPresence>
 *   {isVisible && <FadeIn>Conteúdo</FadeIn>}
 * </FadeInPresence>
 */
export function FadeInPresence({ children }: { children: React.ReactNode }) {
  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
}
