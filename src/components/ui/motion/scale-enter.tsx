/**
 * FORMULADOTA V2.5 — <ScaleEnter> Wrapper
 * Elemento que aparece com scale sutil (96% → 100%) e fade simultâneo.
 *
 * Quando usar: modais, popovers, dropdowns, qualquer elemento que "aparece"
 * a partir de um ponto de origem. Comunicar "surgiu do nada" visualmente.
 *
 * Prop `origin` controla a origem do scale via CSS transform-origin:
 * - "center" (padrão) — escala a partir do centro
 * - "top"    — escala de cima pra baixo (ex: dropdown abaixo de botão)
 * - "bottom" — escala de baixo pra cima (ex: popup acima de elemento)
 *
 * Uso:
 *   <ScaleEnter>
 *     <Modal>Conteúdo</Modal>
 *   </ScaleEnter>
 *
 *   <ScaleEnter origin="top" as="menu">
 *     <DropdownContent />
 *   </ScaleEnter>
 */

"use client";

import { m } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import { scaleIn } from "@/lib/motion/presets";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type SupportedTag =
  | "div"
  | "section"
  | "article"
  | "aside"
  | "nav"
  | "menu"
  | "ul"
  | "span";

type ScaleOrigin = "center" | "top" | "bottom" | "left" | "right";

// Mapeamento de origin para CSS transform-origin
const originMap: Record<ScaleOrigin, string> = {
  center: "center",
  top: "top center",
  bottom: "bottom center",
  left: "center left",
  right: "center right",
};

// ---------------------------------------------------------------------------
// <ScaleEnter>
// ---------------------------------------------------------------------------
interface ScaleEnterProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "animate"> {
  /** Tag HTML renderizada (padrão: "div") */
  as?: SupportedTag;
  /** Ponto de origem do scale (padrão: "center") */
  origin?: ScaleOrigin;
  /** Delay em segundos antes da animação iniciar */
  delay?: number;
  children: React.ReactNode;
}

export function ScaleEnter({
  as = "div",
  origin = "center",
  delay,
  children,
  style,
  ...props
}: ScaleEnterProps) {
  const motionSafe = useMotionSafeBool();

  const transformOriginValue = originMap[origin];

  // Sem scale quando prefers-reduced-motion — apenas fade simples inline
  if (!motionSafe) {
    const Tag = as;
    return (
      <Tag
        style={{ transformOrigin: transformOriginValue, ...style } as React.CSSProperties}
        {...(props as React.HTMLAttributes<HTMLElement>)}
      >
        {children}
      </Tag>
    );
  }

  const Component = m[as] as React.ComponentType<HTMLMotionProps<typeof as>>;

  // Variant com delay opcional
  const visibleState = scaleIn.visible;
  const baseTransition =
    visibleState && typeof visibleState === "object" && "transition" in visibleState
      ? (visibleState as { transition?: object }).transition
      : {};

  const variantWithConfig = delay
    ? {
        ...scaleIn,
        visible: {
          ...visibleState,
          transition: { ...baseTransition, delay },
        },
      }
    : scaleIn;

  return (
    <Component
      variants={variantWithConfig}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ transformOrigin: transformOriginValue, ...style } as React.CSSProperties}
      {...(props as HTMLMotionProps<typeof as>)}
    >
      {children}
    </Component>
  );
}
