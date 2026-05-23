/**
 * FORMULADOTA V2.5 — <Stagger> Wrapper
 * Container que orquestra entrada sequencial dos filhos com delay entre cada um.
 *
 * Quando usar: listas, grids, qualquer conjunto de elementos que devem
 * aparecer em sequência — cards do dashboard, items de ranking, resultados de busca.
 *
 * Nunca usar para um único elemento — usar <FadeIn> nesses casos.
 *
 * Os filhos DEVEM usar um variant com estados "hidden"/"visible" para o
 * stagger funcionar. O <StaggerItem> exportado abaixo facilita isso.
 *
 * Uso:
 *   <Stagger>
 *     {items.map(item => (
 *       <StaggerItem key={item.id}>
 *         <Card>{item.name}</Card>
 *       </StaggerItem>
 *     ))}
 *   </Stagger>
 *
 *   // Com delay personalizado entre itens (padrão: 60ms)
 *   <Stagger delay={0.08}>...</Stagger>
 */

"use client";

import { m } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import { staggerChildren, fadeInUp } from "@/lib/motion/presets";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ---------------------------------------------------------------------------
// Tags HTML suportadas para `as` prop
// ---------------------------------------------------------------------------
type SupportedTag =
  | "div"
  | "section"
  | "article"
  | "main"
  | "ul"
  | "ol"
  | "nav";

// ---------------------------------------------------------------------------
// <Stagger> — container que orquestra filhos
// ---------------------------------------------------------------------------
interface StaggerProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "animate"> {
  /** Tag HTML do container (padrão: "div") */
  as?: SupportedTag;
  /** Delay em segundos entre cada filho (padrão: 0.06 = 60ms) */
  delay?: number;
  children: React.ReactNode;
}

export function Stagger({ as = "div", delay = 0.06, children, ...props }: StaggerProps) {
  const motionSafe = useMotionSafeBool();

  // Sem stagger quando prefers-reduced-motion — todos aparecem juntos
  if (!motionSafe) {
    const Tag = as;
    return <Tag {...(props as React.HTMLAttributes<HTMLElement>)}>{children}</Tag>;
  }

  const Component = m[as] as React.ComponentType<HTMLMotionProps<typeof as>>;

  // Personaliza o delay entre filhos se diferente do padrão
  const variantWithDelay =
    delay !== 0.06
      ? {
          ...staggerChildren,
          visible: {
            transition: {
              staggerChildren: delay,
              delayChildren: 0.04,
            },
          },
        }
      : staggerChildren;

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

// ---------------------------------------------------------------------------
// <StaggerItem> — filho individual do <Stagger>
// ---------------------------------------------------------------------------
type SupportedItemTag =
  | "div"
  | "li"
  | "article"
  | "section"
  | "span"
  | "p";

interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  /** Tag HTML do item (padrão: "div") */
  as?: SupportedItemTag;
  children: React.ReactNode;
}

/**
 * Item individual dentro de um <Stagger>.
 * Aplica fadeInUp com duração standard — recebe o timing do container pai.
 *
 * @example
 * <Stagger>
 *   <StaggerItem as="li">Item 1</StaggerItem>
 *   <StaggerItem as="li">Item 2</StaggerItem>
 * </Stagger>
 */
export function StaggerItem({ as = "div", children, ...props }: StaggerItemProps) {
  const Component = m[as] as React.ComponentType<HTMLMotionProps<typeof as>>;

  return (
    <Component
      variants={fadeInUp}
      {...(props as HTMLMotionProps<typeof as>)}
    >
      {children}
    </Component>
  );
}
