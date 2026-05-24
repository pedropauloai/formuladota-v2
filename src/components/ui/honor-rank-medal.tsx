/**
 * HonorRankMedal — Medalha de HONOR FormulaDota (eixo paralelo ao DotaRankMedal de SKILL)
 *
 * FormulaDota opera em 2 eixos separados (PHILOSOPHY.md):
 *   - SKILL / PERFORMANCE  → DotaRankMedal (9 tiers, baseado em MMR Valve)
 *   - HONOR / CONDUTA      → HonorRankMedal (8 tiers, baseado em comportamento)
 *
 * Visual DISTINTO do DotaRankMedal:
 *   - DotaRankMedal: imagens PNG oficiais Valve (asas, brasões militares)
 *   - HonorRankMedal: SVG inline com formas geométricas cerimoniais (laurel, escudo, estrela, brasão)
 *
 * Progressão cromática:
 *   Tiers 1-3 (aprendiz→confiavel)    : bronze/cobre — laurel + círculo simples
 *   Tiers 4-5 (respeitado→honrado)    : prata        — escudo cerimonial
 *   Tiers 6-7 (mestre→lendario)       : ouro         — estrela cerimonial
 *   Tier 8    (imortal-da-formula)    : brand-primary vermelho — símbolo exclusivo com "F"
 *
 * Server Component: sem interatividade, sem motion, sem sound.
 * Design V2.5 AAA-Grade: zero hex hardcoded, apenas tokens semânticos.
 */

import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------
 * Tipos públicos
 * ------------------------------------------------------------------ */

/** 8 tiers de HONOR — eixo de conduta e comportamento */
export type HonorRank =
  | "aprendiz"
  | "disciplinado"
  | "confiavel"
  | "respeitado"
  | "honrado"
  | "mestre"
  | "lendario"
  | "imortal-da-formula"

/**
 * Labels PT-BR para cada tier de HONOR.
 * Nomes cerimoniais que refletem conduta, não mecânica de jogo.
 */
export const HONOR_RANK_LABELS: Record<HonorRank, string> = {
  aprendiz: "Aprendiz",
  disciplinado: "Disciplinado",
  confiavel: "Confiável",
  respeitado: "Respeitado",
  honrado: "Honrado",
  mestre: "Mestre",
  lendario: "Lendário",
  "imortal-da-formula": "Imortal da Fórmula",
}

/* ------------------------------------------------------------------
 * Tokens de cor por tier (CSS var — zero hex hardcoded)
 * ------------------------------------------------------------------ */

/**
 * Cor primária do SVG por tier.
 * Bronze → Prata → Ouro → Brand (vermelho FormulaDota).
 * Usa variáveis CSS raw do design system.
 */
const TIER_COLORS: Record<HonorRank, { primary: string; secondary: string; glow?: string }> = {
  aprendiz: {
    primary: "var(--fd-raw-amber-700, #b45309)",
    secondary: "var(--fd-raw-amber-900, #78350f)",
  },
  disciplinado: {
    primary: "var(--fd-raw-amber-600, #d97706)",
    secondary: "var(--fd-raw-amber-800, #92400e)",
  },
  confiavel: {
    primary: "var(--fd-raw-amber-500, #f59e0b)",
    secondary: "var(--fd-raw-amber-700, #b45309)",
  },
  respeitado: {
    primary: "var(--fd-raw-slate-300, #cbd5e1)",
    secondary: "var(--fd-raw-slate-500, #64748b)",
  },
  honrado: {
    primary: "var(--fd-raw-slate-200, #e2e8f0)",
    secondary: "var(--fd-raw-slate-400, #94a3b8)",
  },
  mestre: {
    primary: "var(--fd-raw-yellow-400, #facc15)",
    secondary: "var(--fd-raw-yellow-600, #ca8a04)",
  },
  lendario: {
    primary: "var(--fd-raw-yellow-300, #fde047)",
    secondary: "var(--fd-raw-yellow-500, #eab308)",
  },
  "imortal-da-formula": {
    primary: "var(--color-brand-primary)",
    secondary: "var(--color-brand-primary-deep)",
    glow: "var(--glow-brand)",
  },
}

/* ------------------------------------------------------------------
 * Tamanhos
 * ------------------------------------------------------------------ */

const SIZE_PX: Record<NonNullable<HonorRankMedalProps["size"]>, number> = {
  sm: 24,
  md: 40,
  lg: 64,
  xl: 96,
}

const SIZE_CLASS: Record<NonNullable<HonorRankMedalProps["size"]>, string> = {
  sm: "size-6",
  md: "size-10",
  lg: "size-16",
  xl: "size-24",
}

/* ------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------ */

/** Estado de calibração no eixo HONOR — alinhado com DotaRankMedal */
export type HonorCalibrationStatus = "visitante" | "calibrando" | "ranqueado"

export interface HonorRankMedalProps {
  /** Tier de HONOR a exibir */
  rank: HonorRank

  /**
   * Tamanho da medalha.
   * sm=24px | md=40px | lg=64px | xl=96px
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
   * Aplica efeito de brilho (box/drop-shadow) na medalha.
   * "imortal-da-formula" sempre recebe glow brand vermelho.
   * @default false
   */
  glow?: boolean

  /**
   * Estado de calibração no eixo HONOR.
   * - "visitante": placeholder cinza com Lock — sem partidas
   * - "calibrando": tier 1 (aprendiz) com badge overlay
   * - "ranqueado" ou undefined: exibição normal do rank
   */
  calibrationStatus?: HonorCalibrationStatus

  /** Classes CSS adicionais para o container externo */
  className?: string
}

/* ------------------------------------------------------------------
 * SVG Helpers — formas geométricas cerimoniais por grupo de tier
 * ------------------------------------------------------------------ */

/**
 * Tiers 1-3 (aprendiz, disciplinado, confiavel): Laurel simples
 * Forma: círculo central + folhas simétricas ao redor
 * Simbolismo: aprendizado, crescimento, começo da jornada de conduta
 */
function LaurelSVG({ primary, secondary, px }: { primary: string; secondary: string; px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Folha esquerda */}
      <ellipse cx="10" cy="20" rx="5" ry="9" fill={secondary} opacity="0.85" transform="rotate(-30 10 20)" />
      <ellipse cx="8" cy="20" rx="3.5" ry="7" fill={primary} opacity="0.9" transform="rotate(-30 8 20)" />
      {/* Folha direita */}
      <ellipse cx="30" cy="20" rx="5" ry="9" fill={secondary} opacity="0.85" transform="rotate(30 30 20)" />
      <ellipse cx="32" cy="20" rx="3.5" ry="7" fill={primary} opacity="0.9" transform="rotate(30 32 20)" />
      {/* Folha superior esquerda */}
      <ellipse cx="13" cy="10" rx="4" ry="8" fill={secondary} opacity="0.75" transform="rotate(-55 13 10)" />
      <ellipse cx="12" cy="10" rx="2.8" ry="6" fill={primary} opacity="0.85" transform="rotate(-55 12 10)" />
      {/* Folha superior direita */}
      <ellipse cx="27" cy="10" rx="4" ry="8" fill={secondary} opacity="0.75" transform="rotate(55 27 10)" />
      <ellipse cx="28" cy="10" rx="2.8" ry="6" fill={primary} opacity="0.85" transform="rotate(55 28 10)" />
      {/* Círculo central */}
      <circle cx="20" cy="20" r="7" fill={secondary} />
      <circle cx="20" cy="20" r="5.5" fill={primary} />
      <circle cx="20" cy="20" r="3" fill={secondary} opacity="0.6" />
    </svg>
  )
}

/**
 * Tiers 4-5 (respeitado, honrado): Escudo cerimonial
 * Forma: escudo clássico com divisão interna
 * Simbolismo: proteção, confiança estabelecida, respeito conquistado
 */
function ShieldSVG({ primary, secondary, px }: { primary: string; secondary: string; px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sombra/borda do escudo */}
      <path
        d="M20 4L6 10v10c0 9 6.5 15.5 14 17 7.5-1.5 14-8 14-17V10L20 4z"
        fill={secondary}
      />
      {/* Corpo do escudo */}
      <path
        d="M20 7L9 12v8c0 7.5 5.5 13 11 14.5 5.5-1.5 11-7 11-14.5v-8L20 7z"
        fill={primary}
      />
      {/* Divisão interna horizontal */}
      <line x1="9" y1="20" x2="31" y2="20" stroke={secondary} strokeWidth="1.5" opacity="0.7" />
      {/* Divisão interna vertical */}
      <line x1="20" y1="7" x2="20" y2="34" stroke={secondary} strokeWidth="1.5" opacity="0.7" />
      {/* Ponto central */}
      <circle cx="20" cy="20" r="3" fill={secondary} />
      <circle cx="20" cy="20" r="1.8" fill={primary} opacity="0.5" />
    </svg>
  )
}

/**
 * Tiers 6-7 (mestre, lendario): Estrela cerimonial de 6 pontas
 * Forma: estrela hexagonal com detalhes internos
 * Simbolismo: excelência, maestria, reconhecimento amplo
 */
function StarSVG({ primary, secondary, px }: { primary: string; secondary: string; px: number }) {
  /* Estrela 6 pontas via path manual */
  const pts = Array.from({ length: 6 }).map((_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    const outerR = 17
    const innerR = 9
    const ox = 20 + outerR * Math.cos(angle)
    const oy = 20 + outerR * Math.sin(angle)
    const ix = 20 + innerR * Math.cos(angle + Math.PI / 6)
    const iy = 20 + innerR * Math.sin(angle + Math.PI / 6)
    return `${ox},${oy} ${ix},${iy}`
  })
  const starPath = "M " + pts.join(" L ") + " Z"

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sombra externa */}
      <polygon
        points="20,2 24.5,14 37,14 27,22 31,34 20,26 9,34 13,22 3,14 15.5,14"
        fill={secondary}
        opacity="0.7"
      />
      {/* Estrela 5 pontas principal — reconhecível e impactante */}
      <polygon
        points="20,4 24,13 34,13 26,20 29,30 20,24 11,30 14,20 6,13 16,13"
        fill={primary}
      />
      {/* Círculo central para dar peso */}
      <circle cx="20" cy="19" r="5" fill={secondary} opacity="0.8" />
      <circle cx="20" cy="19" r="3.5" fill={primary} />
      <circle cx="20" cy="19" r="2" fill={secondary} opacity="0.6" />
    </svg>
  )
}

/**
 * Tier 8 (imortal-da-formula): Símbolo único FormulaDota
 * Forma: estrela 8 pontas + letra "F" central — exclusivo e inconfundível
 * Simbolismo: excelência absoluta de conduta, identidade FormulaDota incorporada
 * Glow: brand vermelho automático (independe da prop `glow`)
 */
function ImmortalFormulaSVG({ primary, secondary, px }: { primary: string; secondary: string; px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Halo externo */}
      <circle cx="20" cy="20" r="18" fill={secondary} opacity="0.2" />
      {/* Anel */}
      <circle cx="20" cy="20" r="17" fill="none" stroke={primary} strokeWidth="1.5" opacity="0.6" />
      {/* Estrela 8 pontas — construída com 2 quadrados rotacionados */}
      <rect x="9" y="9" width="22" height="22" rx="2" fill={secondary} transform="rotate(0 20 20)" opacity="0.7" />
      <rect x="9" y="9" width="22" height="22" rx="2" fill={primary} opacity="0.85" transform="rotate(45 20 20)" />
      {/* Quadrado frontal para dar corpo */}
      <rect x="11" y="11" width="18" height="18" rx="2" fill={secondary} opacity="0.5" />
      {/* Círculo central */}
      <circle cx="20" cy="20" r="8" fill={secondary} />
      <circle cx="20" cy="20" r="6.5" fill={primary} />
      {/* Letra "F" — FormulaDota, desenhada manualmente para fitting perfeito */}
      <path
        d="M17 15h6M17 15v10M17 19h5"
        stroke={secondary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------
 * Selector de SVG por tier
 * ------------------------------------------------------------------ */

function HonorSVG({
  rank,
  px,
}: {
  rank: HonorRank
  px: number
}) {
  const colors = TIER_COLORS[rank]

  if (rank === "imortal-da-formula") {
    return <ImmortalFormulaSVG primary={colors.primary} secondary={colors.secondary} px={px} />
  }

  if (rank === "mestre" || rank === "lendario") {
    return <StarSVG primary={colors.primary} secondary={colors.secondary} px={px} />
  }

  if (rank === "respeitado" || rank === "honrado") {
    return <ShieldSVG primary={colors.primary} secondary={colors.secondary} px={px} />
  }

  // aprendiz, disciplinado, confiavel → Laurel
  return <LaurelSVG primary={colors.primary} secondary={colors.secondary} px={px} />
}

/* ------------------------------------------------------------------
 * Componente principal
 * ------------------------------------------------------------------ */

/**
 * HonorRankMedal — SVG cerimonial que representa o tier de HONOR do jogador.
 *
 * Deve ser exibido SEMPRE ao lado de DotaRankMedal (SKILL) — os 2 eixos
 * são complementares e nenhum substitui o outro (PHILOSOPHY.md).
 *
 * @example
 * // Par canônico: SKILL + HONOR lado a lado
 * <div className="flex items-center gap-4">
 *   <DotaRankMedal rank="immortal" size="md" showLabel />
 *   <HonorRankMedal rank="honrado" size="md" showLabel />
 * </div>
 *
 * @example
 * // Imortal da Fórmula com glow automático
 * <HonorRankMedal rank="imortal-da-formula" size="lg" showLabel glow />
 *
 * @example
 * // Compact sem label (dentro de cards)
 * <HonorRankMedal rank="mestre" size="sm" />
 */
export function HonorRankMedal({
  rank,
  size = "md",
  showLabel = false,
  glow = false,
  calibrationStatus,
  className,
}: HonorRankMedalProps) {
  const px = SIZE_PX[size]
  const sizeClass = SIZE_CLASS[size]
  const label = HONOR_RANK_LABELS[rank]

  /*
   * "imortal-da-formula" SEMPRE tem glow brand vermelho (independe da prop).
   * Outros ranks só recebem glow quando a prop for true.
   */
  const hasGlow = glow || rank === "imortal-da-formula"

  /* ------------------------------------------------------------------
   * Estado: visitante — placeholder cinza com ícone Lock
   * ------------------------------------------------------------------ */
  if (calibrationStatus === "visitante") {
    return (
      <div className={cn("inline-flex flex-col items-center gap-1", className)}>
        <div
          className={cn(
            sizeClass,
            "flex items-center justify-center rounded-full",
            "bg-bg-elevated border border-border-subtle text-text-faded",
          )}
        >
          <Lock size={px * 0.45} strokeWidth={1.5} aria-hidden="true" />
        </div>
        {showLabel && (
          <span
            className={cn(
              "font-display-condensed",
              size === "sm" ? "text-[9px]" : size === "xl" ? "text-sm" : "text-xs",
              "uppercase tracking-widest text-text-faded whitespace-nowrap",
            )}
          >
            Sem HONOR
          </span>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------
   * Estado: calibrando — tier aprendiz com badge overlay
   * ------------------------------------------------------------------ */
  if (calibrationStatus === "calibrando") {
    const calibratingColors = TIER_COLORS["aprendiz"]
    return (
      <div className={cn("inline-flex flex-col items-center gap-1", className)}>
        <div className={cn(sizeClass, "relative flex items-center justify-center isolate opacity-60")}>
          <LaurelSVG primary={calibratingColors.primary} secondary={calibratingColors.secondary} px={px} />
          <span
            className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2",
              "rounded-sm px-1 py-px",
              "font-mono text-[8px] uppercase tracking-widest whitespace-nowrap",
              "bg-warning/20 border border-warning/40 text-warning",
            )}
          >
            Calibrando
          </span>
        </div>
        {showLabel && (
          <span
            className={cn(
              "font-display-condensed",
              size === "sm" ? "text-[9px]" : size === "xl" ? "text-sm" : "text-xs",
              "uppercase tracking-widest text-warning whitespace-nowrap",
            )}
          >
            Em calibração
          </span>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------
   * Estado: ranqueado (ou undefined) — exibição normal
   * ------------------------------------------------------------------ */

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-1",
        className
      )}
    >
      {/* Container da medalha SVG */}
      <div
        className={cn(
          sizeClass,
          "relative",
          "flex items-center justify-center",
          /* Isolamento de contexto para filtros funcionarem corretamente */
          "isolate",
          /* Transição suave ao aparecer */
          "transition-[filter] duration-300",
        )}
        style={
          hasGlow
            ? {
                filter:
                  rank === "imortal-da-formula"
                    ? "drop-shadow(0 0 8px var(--color-brand-primary-glow)) drop-shadow(0 0 20px var(--color-brand-primary-glow))"
                    : "drop-shadow(0 0 6px var(--color-warning))",
              }
            : undefined
        }
      >
        <HonorSVG rank={rank} px={px} />
      </div>

      {/* Label condicional — font-display-condensed Teko uppercase */}
      {showLabel && (
        <span
          className={cn(
            /* Fonte condensada display — Teko via font-display-condensed */
            "font-display-condensed",
            /* Tamanho relativo ao size da medalha */
            size === "sm" ? "text-[9px]" : size === "xl" ? "text-sm" : "text-xs",
            /* Estilo cerimonial: uppercase + tracking largo */
            "uppercase tracking-widest",
            /* Imortal da Fórmula recebe cor brand, outros ficam muted */
            rank === "imortal-da-formula" ? "text-brand-primary" : "text-text-muted",
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
