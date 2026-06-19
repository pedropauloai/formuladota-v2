/**
 * Button — FORMULADOTA V2.5-F6 AAA-Grade
 *
 * 5 variantes: primary | secondary | ghost | destructive | cinematic
 * 5 estados:   default | hover | pressed | disabled | loading
 *
 * Regras obrigatórias (DF6.1 + PRODUCT_CORE § 7):
 *   - Primary tem weight visual MUITO maior que secondary (maior altura, bold, glow)
 *   - Sound acoplado: hover + click via useSound() (C16)
 *   - Motion: scale 1.02 hover, 0.97 pressed via spring (DF4)
 *   - Disabled: sem som, sem hover motion, opacity 0.5, cursor not-allowed
 *   - Loading: sem animate-spin — usa texto pulsante "..." (C19)
 *   - Zero hex hardcoded — apenas tokens semânticos (C14)
 */

"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { m } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import { useMotionSafe } from "@/lib/motion/hooks";
import { SPRING_CONFIG } from "@/lib/motion/presets";

// ---------------------------------------------------------------------------
// CVA — todas as classes via tokens semânticos, zero hex hardcoded
// ---------------------------------------------------------------------------

const buttonVariants = cva(
  // Base: compartilhado por todas as variantes
  [
    "inline-flex items-center justify-center gap-2",
    "font-display tracking-widest uppercase select-none",
    "transition-colors duration-[var(--motion-duration-micro)]",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    // Foco WCAG 2.1 AA — ring vermelho brand
    "focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2",
    // Remove conflitos com motion (eventos de drag)
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /**
         * Primary — hierarquia máxima. Regra B-2 do PRODUCT_CORE:
         * NUNCA tem o mesmo peso visual que o secundário.
         * Background sólido brand-red + glow + font-bold + padding generoso.
         */
        primary: [
          "bg-brand-primary text-text-display font-bold",
          "hover:bg-brand-primary-hover",
          "shadow-[var(--glow-brand)]",
        ].join(" "),

        /**
         * Secondary — peso visual claramente menor.
         * Fundo elevado + borda sutil + texto body.
         */
        secondary: [
          "bg-bg-elevated text-text-body",
          "hover:bg-bg-surface",
          "border border-border-subtle",
        ].join(" "),

        /**
         * Ghost — mínimo peso visual, sem fundo.
         * Ideal para ações terciárias (ex: Cancelar ao lado de Primary).
         */
        ghost: [
          "bg-transparent text-text-body",
          "hover:bg-bg-elevated",
        ].join(" "),

        /**
         * Destructive — ação com consequência permanente (banir, remover).
         * Vermelho de erro, não o vermelho brand.
         */
        destructive: [
          "bg-error text-text-display font-semibold",
          "hover:opacity-90",
        ].join(" "),

        /**
         * Cinematic — CTA de máximo impacto: Entrar na Fila, Aceitar Partida.
         * Verde play + glow verde + texto maior + máximo peso.
         */
        cinematic: [
          "bg-play-primary text-text-display font-bold",
          "hover:bg-play-primary-hover",
          "shadow-[var(--glow-play)]",
        ].join(" "),
      },

      size: {
        /** sm — botões compactos em contextos densos (badges, tooltips) */
        sm: "h-9 px-4 text-sm rounded-[var(--radius-sm)]",
        /** md — padrão; primary usa compound variant pra h-12 */
        md: "h-11 px-6 text-sm rounded-[var(--radius-sm)]",
        /** lg — destaque maior em seções de produto */
        lg: "h-14 px-10 text-base rounded-[var(--radius-md)]",
        /** xl — máximo impacto; cinematic compound usa h-16 */
        xl: "h-16 px-12 text-lg rounded-[var(--radius-md)]",
      },
    },

    compoundVariants: [
      /**
       * Primary no tamanho padrão (md) sempre fica h-12 —
       * garante diferença visual clara vs secondary h-11.
       * PRODUCT_CORE § 7: "padding vertical generoso (py-4 ou maior)".
       */
      {
        variant: "primary",
        size: "md",
        class: "h-12 px-8",
      },
      /**
       * Cinematic no tamanho lg: h-16 + text-xl —
       * máximo impacto para o CTA "ENTRAR NA FILA".
       */
      {
        variant: "cinematic",
        size: "lg",
        class: "h-16 px-12 text-xl",
      },
      /**
       * Cinematic xl: override para garantir consistência.
       */
      {
        variant: "cinematic",
        size: "xl",
        class: "h-20 px-14 text-2xl",
      },
    ],

    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    // Omit props que conflitam com m.button
    "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"
  >,
  VariantProps<typeof buttonVariants> {
  /** Ativa estado de loading interno — sem animate-spin, usa texto pulsante */
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      disabled,
      onMouseEnter,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const t = useTranslations("ui");
    // Som acoplado — C16: sempre via hook, nunca direto em onClick
    const play = useSound();

    // Motion safe — respeita prefers-reduced-motion
    // Retorna true quando animações são permitidas
    const canAnimate = useMotionSafe(true, false);

    // Botão efetivamente bloqueado (disabled ou loading)
    const isBlocked = disabled ?? loading;

    // Handler de hover: dispara som "hover" apenas quando ativo
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Disabled e loading são silenciosos — PRODUCT_CORE § 7 "Estado: Disabled"
      if (!isBlocked) {
        play("hover");
      }
      onMouseEnter?.(e);
    };

    // Handler de click: dispara som "click" e delega ao onClick original
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isBlocked) {
        play("click");
      }
      onClick?.(e);
    };

    // Props de motion: scale 1.02 hover, 0.97 pressed (spring physics)
    // Sem motion quando reduzido — apenas os handlers sem transform
    const motionProps = canAnimate
      ? {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.97 },
          transition: SPRING_CONFIG.press, // stiffness: 400, damping: 25
        }
      : {};

    return (
      <m.button
        ref={ref}
        disabled={isBlocked}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        className={cn(buttonVariants({ variant, size }), className)}
        {...motionProps}
        {...props}
      >
        {loading ? (
          // Loading state — sem spinner (C19). Texto pulsante em fonte display.
          // aria-label anuncia estado para leitores de tela.
          <span
            className="inline-flex items-center gap-1 font-display tracking-widest"
            aria-label={t("loading")}
            role="status"
          >
            <span className="animate-pulse">...</span>
          </span>
        ) : (
          children
        )}
      </m.button>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
