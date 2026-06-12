/**
 * HonorRankMedal — Medalha do eixo HONOR/NÍVEL (ladder 0–30, 6 bandas).
 *
 * Redesign 2026-06-02: HONOR = nível da conta (0–30). 5 medalhas + Novato (pré-medalha):
 *   Novato (0–5) · Aprendiz (6) · Piloto (12) · Ás (18) · Lendário (25) · Místico (30).
 * Ver docs/foundations/HONOR_SYSTEM.md, PROGRESSION_PUBLIC.md, src/lib/levels.ts.
 *
 * Arte 2026-06-11 (decisão Pedro): PNGs do pack "Gold Rank Badges" (LadyLuck,
 * itch.io — licença comercial declarada na página do pack, feito sem IA), arte
 * ORIGINAL dourada do artista, sem recolorização. A progressão é comunicada
 * pelo nível de ORNAMENTO: círculo simples → asas → coroa.
 * Assets em public/medals/honor/{banda}.png — fonte free 128px; ao comprar o
 * HD, basta rodar scripts/process-honor-medals.py no spritesheet novo.
 *
 * Distinto do DotaRankMedal (SKILL / medalha Valve oficial).
 * Server Component: sem interatividade, sem motion, sem sound.
 */

import Image from "next/image"
import { Lock } from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
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

/**
 * Hover educacional por banda (voz Mestre) — nome + faixa de nível + como sobe.
 * Faixas espelham src/lib/levels.ts (TIER_CONFIG); co-requisito de SKILL no
 * topo espelha getGatedTierForLevel (Lendário exige Divine+, Místico exige Imortal).
 */
const HONOR_RANK_TOOLTIPS: Record<HonorRank, string> = {
  novato:
    "Novato · nível 0–5 (HONOR). Complete as lições da doutrina pra provar conhecimento e conquistar a primeira medalha.",
  aprendiz:
    "Aprendiz · nível 6–11 (HONOR). Doutrinado. Suba completando lições da doutrina e jogando PTs.",
  piloto:
    "Piloto · nível 12–17 (HONOR). Aplicando o método nas partidas. Suba completando lições da doutrina e jogando PTs.",
  as: "Ás · nível 18–24 (HONOR). Domínio da pista. Suba completando lições da doutrina e jogando PTs.",
  lendario:
    "Lendário · nível 25–29 (HONOR). Guardião da cultura — além do nível, exige medalha Valve Divine ou superior.",
  mistico:
    "Místico · nível 30 (HONOR). Topo do ladder — exige medalha Valve Imortal. Compreende o jogo além do jogo.",
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

  /**
   * Mostra o showcase no hover. Desligue quando a medalha está dentro de um
   * <MedalPair> (que tem hover combinado único). @default true
   */
  tooltip?: boolean
}

/* ------------------------------------------------------------------
 * HonorShowcase — hover estilo Dota (ref: hover-medalhas.png): a atual em
 * destaque + régua com TODAS as bandas (anteriores acesas, futuras apagadas).
 * ------------------------------------------------------------------ */

const BAND_ORDER: HonorRank[] = [
  "novato",
  "aprendiz",
  "piloto",
  "as",
  "lendario",
  "mistico",
]

export function HonorShowcase({ current }: { current: HonorRank }) {
  const currentIdx = BAND_ORDER.indexOf(current)
  return (
    <span className="block w-[400px] max-w-[88vw]">
      <span className="block text-center font-display-condensed text-lg uppercase leading-none tracking-[0.2em] text-text-muted">
        Medalhas de nível
      </span>
      {/* Atual em destaque */}
      <span className="mt-2 flex flex-col items-center gap-1">
        <Image
          src={`/medals/honor/${current}.png`}
          alt=""
          width={64}
          height={64}
          className="object-contain"
          aria-hidden="true"
        />
        <span
          className={cn(
            "font-display-condensed text-xl uppercase leading-none tracking-widest",
            current === "mistico" ? "text-brand-primary" : "text-gold",
          )}
        >
          {HONOR_RANK_LABELS[current]}
        </span>
      </span>
      <span className="mt-1 block text-center text-xs leading-snug text-text-muted">
        {HONOR_RANK_TOOLTIPS[current]}
      </span>
      {/* Régua com todas as bandas */}
      <span className="mt-2.5 flex items-end justify-between gap-1 border-t border-border-subtle pt-2.5">
        {BAND_ORDER.map((band, i) => (
          <span key={band} className="flex flex-1 flex-col items-center gap-0.5">
            <Image
              src={`/medals/honor/${band}.png`}
              alt=""
              width={36}
              height={36}
              className={cn(
                "object-contain transition-opacity",
                i > currentIdx && "opacity-40",
                band === current && "scale-110",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "font-display-condensed text-[10px] uppercase tracking-wide",
                band === current ? "text-gold" : "text-text-faded",
              )}
            >
              {HONOR_RANK_LABELS[band]}
            </span>
          </span>
        ))}
      </span>
      <span className="mt-2 block text-center text-[11px] leading-snug text-text-faded">
        Suba completando lições da doutrina e jogando PTs. O topo exige também a
        medalha Valve correspondente.
      </span>
    </span>
  )
}

/* ------------------------------------------------------------------
 * Imagem da medalha (asset PNG do pack LadyLuck)
 * ------------------------------------------------------------------ */

function MedalImage({ rank, px }: { rank: HonorRank; px: number }) {
  return (
    <Image
      src={`/medals/honor/${rank}.png`}
      alt=""
      width={px}
      height={px}
      className="object-contain"
      aria-hidden="true"
    />
  )
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
  tooltip = true,
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

  /* calibrando — Novato esmaecido com badge overlay */
  if (calibrationStatus === "calibrando") {
    return (
      <div className={cn("inline-flex flex-col items-center gap-1", className)}>
        <div className={cn(sizeClass, "relative flex items-center justify-center isolate opacity-60")}>
          <MedalImage rank="novato" px={px} />
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
  const medal = (
    <div
      className={cn(sizeClass, "relative flex items-center justify-center isolate transition-[filter] duration-300")}
      style={
        hasGlow
          ? {
              filter:
                rank === "mistico"
                  ? "drop-shadow(0 0 8px var(--color-brand-primary-glow)) drop-shadow(0 0 20px var(--color-brand-primary-glow))"
                  : "drop-shadow(0 0 6px var(--fd-raw-gold-glow, rgba(200,170,110,0.25)))",
            }
          : undefined
      }
    >
      <MedalImage rank={rank} px={px} />
    </div>
  )

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      {/* Hover showcase (desligável quando dentro de <MedalPair>) */}
      {tooltip ? (
        <Tooltip content={<HonorShowcase current={rank} />} contentClassName="max-w-none p-3">
          {medal}
        </Tooltip>
      ) : (
        medal
      )}

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
