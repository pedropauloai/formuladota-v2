/**
 * Badge — Componente primitivo DF6.5
 *
 * Variantes base: default, secondary, outline, success, warning, error
 * Variantes tier (MMR Herald→Immortal): tier-1 a tier-8
 * Glow especial no tier-8 (Immortal) via shadow token semântico --glow-brand
 * Tabular nums habilitado em toda a base (stats numéricos / MMR)
 *
 * Server Component: sem interatividade, sem motion, sem sound
 * Design V2.5 AAA-Grade: zero hex hardcoded, zero Tailwind inline colors
 */

import { forwardRef, type HTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------
 * Mapeamento MMR Tier → Herald ... Immortal
 * ------------------------------------------------------------------ */

/**
 * TIER_NAMES — label PT-BR de cada faixa MMR interna
 * tier-1 = Herald (menor MMR), tier-8 = Immortal (maior MMR)
 */
export const TIER_NAMES = {
  1: "Herald",
  2: "Guardian",
  3: "Crusader",
  4: "Archon",
  5: "Legend",
  6: "Ancient",
  7: "Divine",
  8: "Immortal",
} as const

export type Tier = keyof typeof TIER_NAMES

/* ------------------------------------------------------------------
 * CVA — Variants
 *
 * Cores de tier usam apenas paleta Tailwind nomeada (amber-*, orange-*
 * etc.) — nenhum hex literal. Tailwind resolve via seu design system.
 * Tier-8 (Immortal) usa shadow-[var(--glow-brand)] que aponta para o
 * token semântico --glow-brand definido em semantic.css.
 * ------------------------------------------------------------------ */

const badgeVariants = cva(
  [
    // Layout inline
    "inline-flex items-center justify-center gap-1",
    // Tipografia: Cinzel (font-display) — estilo game client AAA
    "font-display tracking-widest uppercase text-xs",
    // Espaçamento e borda
    "px-2 py-0.5 border",
    // Radius quadrado — estilo Dota 2 (não pill/rounded-full)
    "rounded-sm",
    // Tabular nums: alinhamento uniforme de MMR e números
    "tabular-nums",
    // Transição base rápida para hover
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        /* ---- Variantes base ---- */

        // Fundo elevado + texto body + borda sutil → label genérico
        default:
          "bg-bg-elevated text-text-body border-border-subtle",

        // Superfície de card + texto muted → label secundário
        secondary:
          "bg-bg-surface text-text-muted border-border-subtle",

        // Transparente + borda forte → destaque contornado
        outline:
          "bg-transparent text-text-body border-border-strong",

        // Verde semântico: confirmação / positivo
        success:
          "bg-success/10 text-success border-success/30",

        // Âmbar semântico: atenção / pendente
        warning:
          "bg-warning/10 text-warning border-warning/30",

        // Vermelho semântico: erro / bloqueio
        error:
          "bg-error/10 text-error border-error/30",

        /* ---- Variantes tier (MMR Herald → Immortal) ----
         *
         * Paleta Tailwind nomeada — zero hex literal.
         * Tiers 6-8 são prestígio com cores geladas/distintas.
         * ------------------------------------------------- */

        // tier-1: Herald — cinza neutro, patamar mais básico
        "tier-1":
          "bg-neutral-800 text-neutral-200 border-neutral-700",

        // tier-2: Guardian — âmbar escuro (bronze crepuscular)
        "tier-2":
          "bg-amber-900/30 text-amber-300 border-amber-700/50",

        // tier-3: Crusader — laranja queimado (bronze mais quente)
        "tier-3":
          "bg-orange-900/30 text-orange-300 border-orange-700/50",

        // tier-4: Archon — amarelo dourado (prata/ouro inicial)
        "tier-4":
          "bg-yellow-900/30 text-yellow-300 border-yellow-700/50",

        // tier-5: Legend — verde (ascensão, cor do mapa Dota)
        "tier-5":
          "bg-green-900/30 text-green-300 border-green-700/50",

        // tier-6: Ancient — ciano frio (prestígio inicial, visível)
        "tier-6":
          "bg-cyan-900/30 text-cyan-300 border-cyan-700/50",

        // tier-7: Divine — roxo intenso (raridade máxima pré-Immortal)
        "tier-7":
          "bg-purple-900/30 text-purple-300 border-purple-700/50",

        // tier-8: Immortal — vermelho brand + glow duplo via token semântico
        // shadow-[var(--glow-brand)] → --glow-brand de semantic.css
        // = dupla camada 0 0 16px + 0 0 48px via --color-brand-primary-glow
        "tier-8":
          "bg-brand-primary/20 text-brand-primary border-brand-primary shadow-[var(--glow-brand)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/* ------------------------------------------------------------------
 * Tipos públicos
 * ------------------------------------------------------------------ */

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/* ------------------------------------------------------------------
 * Componente
 * ------------------------------------------------------------------ */

/**
 * Badge — label visual para MMR tier, status e flags de sistema.
 *
 * @example
 * // Tier Immortal com MMR
 * <Badge variant="tier-8">Immortal · 7.2k</Badge>
 *
 * @example
 * // Status de assinatura
 * <Badge variant="success">Ativo</Badge>
 *
 * @example
 * // Label dinâmico via TIER_NAMES
 * <Badge variant={`tier-${tier}` as BadgeProps["variant"]}>{TIER_NAMES[tier]}</Badge>
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

/* ------------------------------------------------------------------
 * Exports nomeados
 * ------------------------------------------------------------------ */

export { badgeVariants }
