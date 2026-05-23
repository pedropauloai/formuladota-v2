/**
 * DotaRankMedal — Medalha oficial Dota 2 com imagem real
 *
 * Substituição visual do Badge tier-N CSS-only para contextos onde
 * a imagem da medalha oficial tem espaço para ser exibida (cards hero,
 * perfil, ProCard tamanho grande).
 *
 * Para textos compactos onde 48px não cabe (MatchCard, labels inline),
 * continue usando <Badge variant="tier-N"> de badge.tsx.
 *
 * Fonte das imagens: Liquipedia (SeasonalRank{N}-1.png / SeasonalRankTop*.png)
 * Diretório local: /public/icons/dota-ranks/
 *
 * Mapeamento das medalhas Immortal (corrigido 2026-05-23 — Pedro):
 *   - immortal.png             = SeasonalRankTop0 (Imortal base com asas)
 *   - immortal-top-100.png     = SeasonalRankTop2 (medalha VERMELHA exclusiva Top 100 Mundial)
 *
 * Server Component: sem interatividade, sem motion, sem sound.
 * Design V2.5 AAA-Grade: zero hex hardcoded, apenas tokens semânticos.
 */

import Image from "next/image"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------
 * Tipos públicos
 * ------------------------------------------------------------------ */

/** 9 ranks disponíveis — 8 tiers base + Immortal Top 100 especial */
export type DotaRank =
  | "herald"
  | "guardian"
  | "crusader"
  | "archon"
  | "legend"
  | "ancient"
  | "divine"
  | "immortal"
  | "immortal-top-100"

/**
 * Labels PT-BR legíveis de cada rank (regra Pedro 2026-05-23: plataforma exclusiva BR).
 * Tradução literal dos rank names oficiais Valve.
 * Top 100 mantém "Top 100" (jargão universal) + sufixo "Mundial" pra contexto.
 */
export const RANK_LABELS: Record<DotaRank, string> = {
  herald: "Arauto",
  guardian: "Guardião",
  crusader: "Cruzado",
  archon: "Arconte",
  legend: "Lenda",
  ancient: "Ancião",
  divine: "Divino",
  immortal: "Imortal",
  "immortal-top-100": "Top 100 Mundial",
}

/**
 * Tamanhos em pixels para cada variant de size.
 * sm=32 md=48 lg=72 xl=128
 */
const SIZE_PX: Record<NonNullable<DotaRankMedalProps["size"]>, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 128,
}

/**
 * Classes Tailwind de dimensão para cada size variant.
 * Usa classes size-* do Tailwind v3+ (equivale a w-* h-*).
 */
const SIZE_CLASS: Record<NonNullable<DotaRankMedalProps["size"]>, string> = {
  sm: "size-8",
  md: "size-12",
  lg: "size-[4.5rem]",
  xl: "size-32",
}

/**
 * Glow color por rank — Immortal usa âmbar queimado (brand warning),
 * Divine usa roxo, tiers inferiores sem glow especial.
 *
 * Usa CSS filter drop-shadow com variáveis de cor do design system.
 * NUNCA hex literal aqui — apenas variáveis CSS semânticas.
 */
const GLOW_CLASS: Partial<Record<DotaRank, string>> = {
  divine: "drop-shadow-[0_0_12px_var(--color-purple-500)]",
  immortal: "drop-shadow-[0_0_16px_var(--color-warning)]",
  "immortal-top-100":
    "drop-shadow-[0_0_24px_var(--color-warning)] drop-shadow-[0_0_48px_var(--color-brand-primary-glow)]",
}

/* ------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------ */

export interface DotaRankMedalProps {
  /** Rank a exibir — determina qual imagem PNG carregar */
  rank: DotaRank

  /**
   * Tamanho da medalha.
   * sm=32px | md=48px | lg=72px | xl=128px
   * @default "md"
   */
  size?: "sm" | "md" | "lg" | "xl"

  /**
   * Exibe label de texto abaixo da medalha.
   * Usa font-display-condensed (Teko) uppercase tracking-widest.
   * @default false
   */
  showLabel?: boolean

  /**
   * Aplica efeito de brilho (drop-shadow) na medalha.
   * Especialmente impactante para Divine, Immortal e Immortal Top 100.
   * @default false
   */
  glow?: boolean

  /** Classes CSS adicionais para o container externo */
  className?: string
}

/* ------------------------------------------------------------------
 * Componente
 * ------------------------------------------------------------------ */

/**
 * DotaRankMedal — imagem oficial da medalha de rank do Dota 2.
 *
 * @example
 * // Medalha Immortal com glow e label
 * <DotaRankMedal rank="immortal" size="lg" glow showLabel />
 *
 * @example
 * // Medalha compacta sem label (dentro de cards)
 * <DotaRankMedal rank="divine" size="md" />
 *
 * @example
 * // Top 100 com máximo impacto visual
 * <DotaRankMedal rank="immortal-top-100" size="xl" glow showLabel />
 */
export function DotaRankMedal({
  rank,
  size = "md",
  showLabel = false,
  glow = false,
  className,
}: DotaRankMedalProps) {
  const px = SIZE_PX[size]
  const sizeClass = SIZE_CLASS[size]
  const glowClass = glow ? (GLOW_CLASS[rank] ?? "") : ""
  const label = RANK_LABELS[rank]

  /* Caminho da imagem no diretório público */
  const src = `/icons/dota-ranks/${rank}.png`

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-1",
        className
      )}
    >
      {/* Medalha — imagem oficial Dota 2 carregada via next/image */}
      <div
        className={cn(
          sizeClass,
          "relative",
          "flex items-center justify-center",
          /* Isolamento de contexto para o drop-shadow funcionar corretamente */
          "isolate",
        )}
      >
        <Image
          src={src}
          alt={`${label} rank medal`}
          width={px}
          height={px}
          className={cn(
            "object-contain",
            "w-full h-full",
            /* Glow via CSS filter — aplicado na imagem, não no container */
            glowClass,
            /* Transição suave ao aparecer */
            "transition-[filter] duration-300",
          )}
          /* Carregamento lazy — medalhas geralmente não estão no above-the-fold */
          loading="lazy"
          /* Sem placeholder blur — imagens pequenas não precisam */
          placeholder="empty"
        />
      </div>

      {/* Label condicional — font-display-condensed Teko uppercase */}
      {showLabel && (
        <span
          className={cn(
            /* Fonte condensada display — Teko via font-display-condensed */
            "font-display-condensed",
            /* Tamanho relativo ao size da medalha */
            size === "sm" ? "text-[9px]" : size === "xl" ? "text-sm" : "text-xs",
            /* Estilo de label game client: uppercase + tracking largo */
            "uppercase tracking-widest",
            /* Cor semântica: muted para não competir com a medalha */
            "text-text-muted",
            /* Sem quebra de linha */
            "whitespace-nowrap",
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
