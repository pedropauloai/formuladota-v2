/**
 * HonorRankMedal — Medalha do eixo HONOR/NÍVEL (ladder 0–30, 6 bandas).
 *
 * Redesign 2026-06-02: HONOR = nível da conta (0–30). 5 medalhas + Novato (pré-medalha):
 *   Novato (0–5) · Aprendiz (6) · Piloto (12) · Ás (18) · Lendário (25) · Místico (30).
 * Ver docs/foundations/HONOR_SYSTEM.md, PROGRESSION_PUBLIC.md, src/lib/levels.ts.
 *
 * Distinto do DotaRankMedal (SKILL / medalha Valve): este usa SVG cerimonial.
 * Progressão de forma: Laurel (Novato/Aprendiz) → Escudo (Piloto/Ás) → Estrela (Lendário)
 * → Símbolo Fórmula (Místico, topo com glow brand).
 *
 * Server Component: sem interatividade, sem motion, sem sound.
 */

import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------
 * Tipos públicos — 6 bandas do ladder 0–30
 * ------------------------------------------------------------------ */

export type HonorRank =
  | "novato"
  | "aprendiz"
  | "piloto"
  | "as"
  | "lendario"
  | "mistico"

export const HONOR_RANK_LABELS: Record<HonorRank, string> = {
  novato: "Novato",
  aprendiz: "Aprendiz",
  piloto: "Piloto",
  as: "Ás",
  lendario: "Lendário",
  mistico: "Místico",
}

/* ------------------------------------------------------------------
 * Compat: mapeia os 8 tiers ANTIGOS de honor-score pras 6 bandas novas.
 * Transitório — enquanto callers ainda derivam do honor_ledger (score).
 * O end-state é derivar a banda do nível da conta via getTierForLevel (levels.ts).
 * ------------------------------------------------------------------ */

export type LegacyHonorTier =
  | "aprendiz"
  | "disciplinado"
  | "confiavel"
  | "respeitado"
  | "honrado"
  | "mestre"
  | "lendario"
  | "imortal-da-formula"

const LEGACY_TO_BAND: Record<LegacyHonorTier, HonorRank> = {
  aprendiz: "novato",
  disciplinado: "novato",
  confiavel: "aprendiz",
  respeitado: "piloto",
  honrado: "piloto",
  mestre: "as",
  lendario: "lendario",
  "imortal-da-formula": "mistico",
}

export function legacyHonorToBand(tier: string): HonorRank {
  return LEGACY_TO_BAND[tier as LegacyHonorTier] ?? "novato"
}

/* ------------------------------------------------------------------
 * Tokens de cor por banda (CSS var com fallback hex — segue padrão antigo)
 * ------------------------------------------------------------------ */

const TIER_COLORS: Record<HonorRank, { primary: string; secondary: string }> = {
  novato: {
    primary: "var(--fd-raw-zinc-400, #a1a1aa)",
    secondary: "var(--fd-raw-zinc-600, #52525b)",
  },
  aprendiz: {
    primary: "var(--fd-raw-sky-400, #38bdf8)",
    secondary: "var(--fd-raw-sky-600, #0284c7)",
  },
  piloto: {
    primary: "var(--fd-raw-emerald-400, #34d399)",
    secondary: "var(--fd-raw-emerald-600, #059669)",
  },
  as: {
    primary: "var(--fd-raw-violet-400, #a78bfa)",
    secondary: "var(--fd-raw-violet-600, #7c3aed)",
  },
  lendario: {
    primary: "var(--fd-raw-orange-400, #fb923c)",
    secondary: "var(--fd-raw-orange-600, #ea580c)",
  },
  mistico: {
    primary: "var(--color-brand-primary)",
    secondary: "var(--color-brand-primary-deep, #7f1d1d)",
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

export type HonorCalibrationStatus = "visitante" | "calibrando" | "ranqueado"

export interface HonorRankMedalProps {
  /** Banda de HONOR a exibir (ladder 0–30). */
  rank: HonorRank

  /**
   * Tamanho da medalha.
   * sm=24px | md=40px | lg=64px | xl=96px
   * @default "md"
   */
  size?: "sm" | "md" | "lg" | "xl"

  /** Exibe label de texto abaixo da medalha. @default false */
  showLabel?: boolean

  /**
   * Aplica brilho. "mistico" (topo) sempre recebe glow brand. @default false
   */
  glow?: boolean

  /**
   * Estado de calibração no eixo HONOR.
   * - "visitante": placeholder cinza com Lock
   * - "calibrando": Novato com badge overlay
   * - "ranqueado" ou undefined: exibição normal
   */
  calibrationStatus?: HonorCalibrationStatus

  /** Classes CSS adicionais para o container externo */
  className?: string
}

/* ------------------------------------------------------------------
 * SVG Helpers — formas cerimoniais por grupo de banda
 * ------------------------------------------------------------------ */

function LaurelSVG({ primary, secondary, px }: { primary: string; secondary: string; px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="10" cy="20" rx="5" ry="9" fill={secondary} opacity="0.85" transform="rotate(-30 10 20)" />
      <ellipse cx="8" cy="20" rx="3.5" ry="7" fill={primary} opacity="0.9" transform="rotate(-30 8 20)" />
      <ellipse cx="30" cy="20" rx="5" ry="9" fill={secondary} opacity="0.85" transform="rotate(30 30 20)" />
      <ellipse cx="32" cy="20" rx="3.5" ry="7" fill={primary} opacity="0.9" transform="rotate(30 32 20)" />
      <ellipse cx="13" cy="10" rx="4" ry="8" fill={secondary} opacity="0.75" transform="rotate(-55 13 10)" />
      <ellipse cx="12" cy="10" rx="2.8" ry="6" fill={primary} opacity="0.85" transform="rotate(-55 12 10)" />
      <ellipse cx="27" cy="10" rx="4" ry="8" fill={secondary} opacity="0.75" transform="rotate(55 27 10)" />
      <ellipse cx="28" cy="10" rx="2.8" ry="6" fill={primary} opacity="0.85" transform="rotate(55 28 10)" />
      <circle cx="20" cy="20" r="7" fill={secondary} />
      <circle cx="20" cy="20" r="5.5" fill={primary} />
      <circle cx="20" cy="20" r="3" fill={secondary} opacity="0.6" />
    </svg>
  )
}

function ShieldSVG({ primary, secondary, px }: { primary: string; secondary: string; px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 4L6 10v10c0 9 6.5 15.5 14 17 7.5-1.5 14-8 14-17V10L20 4z" fill={secondary} />
      <path d="M20 7L9 12v8c0 7.5 5.5 13 11 14.5 5.5-1.5 11-7 11-14.5v-8L20 7z" fill={primary} />
      <line x1="9" y1="20" x2="31" y2="20" stroke={secondary} strokeWidth="1.5" opacity="0.7" />
      <line x1="20" y1="7" x2="20" y2="34" stroke={secondary} strokeWidth="1.5" opacity="0.7" />
      <circle cx="20" cy="20" r="3" fill={secondary} />
      <circle cx="20" cy="20" r="1.8" fill={primary} opacity="0.5" />
    </svg>
  )
}

function StarSVG({ primary, secondary, px }: { primary: string; secondary: string; px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="20,2 24.5,14 37,14 27,22 31,34 20,26 9,34 13,22 3,14 15.5,14" fill={secondary} opacity="0.7" />
      <polygon points="20,4 24,13 34,13 26,20 29,30 20,24 11,30 14,20 6,13 16,13" fill={primary} />
      <circle cx="20" cy="19" r="5" fill={secondary} opacity="0.8" />
      <circle cx="20" cy="19" r="3.5" fill={primary} />
      <circle cx="20" cy="19" r="2" fill={secondary} opacity="0.6" />
    </svg>
  )
}

function MisticoSVG({ primary, secondary, px }: { primary: string; secondary: string; px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill={secondary} opacity="0.2" />
      <circle cx="20" cy="20" r="17" fill="none" stroke={primary} strokeWidth="1.5" opacity="0.6" />
      <rect x="9" y="9" width="22" height="22" rx="2" fill={secondary} opacity="0.7" />
      <rect x="9" y="9" width="22" height="22" rx="2" fill={primary} opacity="0.85" transform="rotate(45 20 20)" />
      <rect x="11" y="11" width="18" height="18" rx="2" fill={secondary} opacity="0.5" />
      <circle cx="20" cy="20" r="8" fill={secondary} />
      <circle cx="20" cy="20" r="6.5" fill={primary} />
      <path d="M17 15h6M17 15v10M17 19h5" stroke={secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HonorSVG({ rank, px }: { rank: HonorRank; px: number }) {
  const colors = TIER_COLORS[rank]
  if (rank === "mistico") return <MisticoSVG primary={colors.primary} secondary={colors.secondary} px={px} />
  if (rank === "lendario") return <StarSVG primary={colors.primary} secondary={colors.secondary} px={px} />
  if (rank === "piloto" || rank === "as") return <ShieldSVG primary={colors.primary} secondary={colors.secondary} px={px} />
  return <LaurelSVG primary={colors.primary} secondary={colors.secondary} px={px} />
}

/* ------------------------------------------------------------------
 * Componente principal
 * ------------------------------------------------------------------ */

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

  const hasGlow = glow || rank === "mistico"

  /* visitante — placeholder cinza com Lock */
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
          <span className="font-display-condensed text-sm uppercase tracking-widest text-text-faded whitespace-nowrap">
            Sem nível
          </span>
        )}
      </div>
    )
  }

  /* calibrando — Novato com badge overlay */
  if (calibrationStatus === "calibrando") {
    const c = TIER_COLORS["novato"]
    return (
      <div className={cn("inline-flex flex-col items-center gap-1", className)}>
        <div className={cn(sizeClass, "relative flex items-center justify-center isolate opacity-60")}>
          <LaurelSVG primary={c.primary} secondary={c.secondary} px={px} />
          <span
            className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-sm px-1 py-px",
              "font-display text-sm font-semibold whitespace-nowrap",
              "bg-warning/20 border border-warning/40 text-warning",
            )}
          >
            Calibrando
          </span>
        </div>
        {showLabel && (
          <span className="font-display-condensed text-sm uppercase tracking-widest text-warning whitespace-nowrap">
            Em calibração
          </span>
        )}
      </div>
    )
  }

  /* ranqueado (ou undefined) — exibição normal */
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div
        className={cn(sizeClass, "relative flex items-center justify-center isolate transition-[filter] duration-300")}
        style={
          hasGlow
            ? {
                filter:
                  rank === "mistico"
                    ? "drop-shadow(0 0 8px var(--color-brand-primary-glow)) drop-shadow(0 0 20px var(--color-brand-primary-glow))"
                    : "drop-shadow(0 0 6px var(--color-warning))",
              }
            : undefined
        }
      >
        <HonorSVG rank={rank} px={px} />
      </div>

      {showLabel && (
        <span
          className={cn(
            "font-display-condensed text-sm uppercase tracking-widest whitespace-nowrap",
            rank === "mistico" ? "text-brand-primary" : "text-text-muted",
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
