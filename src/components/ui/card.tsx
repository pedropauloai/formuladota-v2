"use client";
/**
 * Card — FormulaDota V2.5-F6 (DF6.2)
 *
 * 4 variantes via CVA:
 *   flat        — superficie base sem elevação
 *   elevated    — elevação com sombra padrão
 *   interactive — responde a hover (border + sound)
 *   hero        — treatment cinematográfico (ambient glow + hover lift via motion)
 *
 * Regras obrigatórias:
 *   C14 — zero hex hardcoded; somente tokens semânticos via var()
 *   C15 — duração de motion via var(--motion-duration-*)
 *   C16 — som via hook useSound(), nunca chamado diretamente
 *   C17 — z-index via var(--z-*)
 *   C20 — interação acoplada a sound + motion
 *
 * Compound components exportados para compatibilidade com shadcn pattern:
 *   Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
 */

import { forwardRef, type HTMLAttributes } from "react";
import { m } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ---------------------------------------------------------------------------
// cardVariants — CVA com 4 variantes DF6.2
// Zero hex hardcoded — todos via tokens semânticos
// ---------------------------------------------------------------------------
const cardVariants = cva(
  // Base: cor de fundo e cor de texto via tokens semânticos
  "bg-[var(--color-bg-elevated)] text-[var(--color-text-body)]",
  {
    variants: {
      variant: {
        // flat — superficie sem elevação, border sutil, radius padrão de card
        flat: [
          "border border-[var(--color-border-subtle)]",
          "rounded-[var(--radius-lg)]",
          "p-4",
        ],

        // elevated — adiciona sombra de profundidade
        elevated: [
          "border border-[var(--color-border-subtle)]",
          "rounded-[var(--radius-lg)]",
          "p-5",
          "shadow-[var(--shadow-elevated)]",
        ],

        // interactive — feedback visual em hover (border se intensifica)
        // Sound acoplado via handler onMouseEnter no componente
        interactive: [
          "border border-[var(--color-border-subtle)]",
          "rounded-[var(--radius-lg)]",
          "p-5",
          "shadow-[var(--shadow-elevated)]",
          "cursor-pointer",
          // Transição de border via token de duração (C15)
          "transition-colors",
          "duration-[var(--motion-duration-micro)]",
          "hover:border-[var(--color-border-strong)]",
        ],

        // hero — treatment cinematográfico: sem radius (peso máximo),
        // sombra cinematic, glow ambient via camada absoluta interna.
        // hover lift é gerenciado pelo m.div quando motionSafe=true.
        hero: [
          "rounded-none",
          "p-8",
          "shadow-[var(--shadow-cinematic)]",
          "relative overflow-hidden",
          // Borda brand sutil para identidade visual
          "border border-[var(--color-border-brand)]",
        ],
      },
    },
    defaultVariants: { variant: "flat" },
  }
);

// ---------------------------------------------------------------------------
// CardProps — estende HTMLAttributes excluindo props conflitantes com motion
// ---------------------------------------------------------------------------
interface CardProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"
  >,
    VariantProps<typeof cardVariants> {}

// ---------------------------------------------------------------------------
// Card — componente principal com roteamento por variante
// ---------------------------------------------------------------------------
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "flat", onMouseEnter, children, ...props }, ref) => {
    // Hook de som — retorna callback estável, no-op se muted (C16)
    const play = useSound();
    // Hook de motion — false quando prefers-reduced-motion está ativo
    const motionSafe = useMotionSafeBool();

    // Handler de mouseEnter: acoplamento sound + interação (C20)
    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      if (variant === "interactive") {
        play("hover");
      }
      onMouseEnter?.(e);
    };

    // Hero variant com motion habilitado:
    // whileHover lift de -4px via spring (AAA feel)
    if (variant === "hero" && motionSafe) {
      return (
        <m.div
          ref={ref}
          whileHover={{ y: -4 }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 30,
          }}
          className={cn(cardVariants({ variant }), className)}
          onMouseEnter={handleMouseEnter}
          {...props}
        >
          {/* Ambient glow radial no topo — identidade cinematográfica (C14: var()) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at top, var(--color-brand-primary-glow) 0%, transparent 65%)",
            }}
          />
          {/* Conteúdo acima do glow (relative garante z-order) */}
          <div className="relative">{children}</div>
        </m.div>
      );
    }

    // Hero variant com prefers-reduced-motion: sem motion, mantém estética
    if (variant === "hero") {
      return (
        <div
          ref={ref}
          className={cn(cardVariants({ variant }), className)}
          onMouseEnter={handleMouseEnter}
          {...props}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at top, var(--color-brand-primary-glow) 0%, transparent 65%)",
            }}
          />
          <div className="relative">{children}</div>
        </div>
      );
    }

    // flat / elevated / interactive — div simples (sem overhead de motion)
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant }), className)}
        onMouseEnter={handleMouseEnter}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

// ---------------------------------------------------------------------------
// Compound components — shadcn pattern para compatibilidade com código existente
// ---------------------------------------------------------------------------

/** Agrupa título e descrição no topo do card */
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5 mb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

/** Título principal do card — fonte display (Cinzel), tracking adequado */
const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-[family-name:var(--font-display)]",
        "text-lg",
        "text-[var(--color-text-display)]",
        "tracking-wide",
        "font-semibold",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

/** Descrição secundária — fonte body, cor muted */
const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-[var(--color-text-muted)]",
      className
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/** Área de conteúdo principal — sem padding próprio (herda do Card) */
const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

/** Rodapé do card — separador border-subtle, alinhamento flex */
const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-2",
        "mt-4 pt-4",
        "border-t border-[var(--color-border-subtle)]",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
