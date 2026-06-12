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
import { Lock } from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
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
 * Labels PT-BR dos rank names oficiais Valve (regra Pedro 2026-05-23: plataforma BR).
 * APENAS nomes de medalhas traduzidos — jargões como "Streak", "Season", "Top 100"
 * mantêm inglês por serem universalmente reconhecidos na comunidade Dota BR.
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
  "immortal-top-100": "Imortal Top 100",
}

/**
 * SkillShowcase — hover estilo Dota (ref: hover-medalhas.png): medalha atual
 * em destaque + régua com TODAS as medalhas Valve (futuras apagadas).
 */
const SKILL_ORDER: DotaRank[] = [
  "herald",
  "guardian",
  "crusader",
  "archon",
  "legend",
  "ancient",
  "divine",
  "immortal",
]

export function SkillShowcase({ current }: { current: DotaRank }) {
  // Top 100 ocupa o mesmo degrau do Imortal na régua
  const rulerCurrent = current === "immortal-top-100" ? "immortal" : current
  const currentIdx = SKILL_ORDER.indexOf(rulerCurrent)
  return (
    <span className="block w-[420px] max-w-[88vw]">
      <span className="block text-center font-display-condensed text-lg uppercase leading-none tracking-[0.2em] text-text-muted">
        Medalhas de classificação
      </span>
      <span className="mt-2 flex flex-col items-center gap-1">
        <Image
          src={`/icons/dota-ranks/${current}.png`}
          alt=""
          width={64}
          height={64}
          className="object-contain"
          aria-hidden="true"
        />
        <span className="font-display-condensed text-xl uppercase leading-none tracking-widest text-gold">
          {RANK_LABELS[current]}
        </span>
      </span>
      <span className="mt-1 block text-center text-xs leading-snug text-text-muted">
        Medalha oficial Valve — mede SKILL (MMR). Distinta do seu nível
        FormulaDota, que mede HONOR.
      </span>
      <span className="mt-2.5 flex items-end justify-between gap-1 border-t border-border-subtle pt-2.5">
        {SKILL_ORDER.map((r, i) => (
          <span key={r} className="flex flex-1 flex-col items-center gap-0.5">
            <Image
              src={`/icons/dota-ranks/${r}.png`}
              alt=""
              width={36}
              height={36}
              className={cn(
                "object-contain transition-opacity",
                i > currentIdx && "opacity-40",
                r === rulerCurrent && "scale-110",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "font-display-condensed text-[10px] uppercase tracking-wide",
                r === rulerCurrent ? "text-gold" : "text-text-faded",
              )}
            >
              {RANK_LABELS[r]}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}


/** Wrapper condicional do showcase — <MedalPair> desliga o hover individual. */
function MaybeTooltip({
  enabled,
  rank,
  children,
}: {
  enabled: boolean
  rank: DotaRank
  children: React.ReactNode
}) {
  if (!enabled) return <>{children}</>
  return (
    <Tooltip content={<SkillShowcase current={rank} />} contentClassName="max-w-none p-3">
      {children}
    </Tooltip>
  )
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
 * Calibration status — estado de progressão do usuário no sistema
 * ------------------------------------------------------------------ */

export type CalibrationStatus = "visitante" | "calibrando" | "ranqueado"

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

  /**
   * Estado de calibração do usuário.
   * - "visitante": usuário sem partidas — mostra placeholder cinza com Lock
   * - "calibrando": em processo — mostra tier 1 com badge overlay
   * - "ranqueado" ou undefined: exibe medalha normal
   */
  calibrationStatus?: CalibrationStatus

  /** Classes CSS adicionais para o container externo */
  className?: string

  /**
   * Mostra o showcase no hover. Desligue quando a medalha está dentro de um
   * <MedalPair> (hover combinado único). @default true
   */
  tooltip?: boolean
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
  calibrationStatus,
  className,
  tooltip = true,
}: DotaRankMedalProps) {
  const px = SIZE_PX[size]
  const sizeClass = SIZE_CLASS[size]
  const glowClass = glow ? (GLOW_CLASS[rank] ?? "") : ""
  const label = RANK_LABELS[rank]

  /* ------------------------------------------------------------------
   * Estado: visitante — placeholder cinza com ícone Lock
   * ------------------------------------------------------------------ */
  if (calibrationStatus === "visitante") {
    return (
      <div
        className={cn(
          "inline-flex flex-col items-center gap-1",
          className
        )}
      >
        <div
          className={cn(
            sizeClass,
            "relative flex items-center justify-center",
            "rounded-full bg-bg-elevated border border-border-subtle",
            "text-text-faded",
          )}
        >
          <Lock
            size={px * 0.45}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        {showLabel && (
          <span
            className={cn(
              "font-display-condensed",
              size === "sm" ? "text-sm" : size === "xl" ? "text-sm" : "text-sm",
              "uppercase tracking-widest text-text-faded whitespace-nowrap",
            )}
          >
            Não calibrado
          </span>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------
   * Estado: calibrando — tier 1 (herald) com badge overlay
   * ------------------------------------------------------------------ */
  if (calibrationStatus === "calibrando") {
    const calibratingSrc = `/icons/dota-ranks/herald.png`
    return (
      <div
        className={cn(
          "inline-flex flex-col items-center gap-1",
          className
        )}
      >
        <div
          className={cn(
            sizeClass,
            "relative flex items-center justify-center isolate",
          )}
        >
          <Image
            src={calibratingSrc}
            alt="Rank em calibração"
            width={px}
            height={px}
            className="object-contain w-full h-full opacity-60"
            loading="lazy"
            placeholder="empty"
          />
          {/* Overlay badge "Calibrando" */}
          <span
            className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2",
              "rounded-sm px-1 py-px",
              "font-display text-sm font-semibold whitespace-nowrap",
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
              size === "sm" ? "text-sm" : size === "xl" ? "text-sm" : "text-sm",
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
   * Estado: ranqueado (ou sem calibrationStatus) — exibição normal
   * ------------------------------------------------------------------ */
  const src = `/icons/dota-ranks/${rank}.png`

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-1",
        className
      )}
    >
      {/* Medalha — imagem oficial Dota 2 carregada via next/image.
          Hover educacional: SKILL (Valve) é eixo distinto do HONOR (FormulaDota). */}
      <MaybeTooltip enabled={tooltip} rank={rank}>
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
      </MaybeTooltip>

      {/* Label condicional — font-display-condensed Teko uppercase */}
      {showLabel && (
        <span
          className={cn(
            /* Fonte condensada display — Teko via font-display-condensed */
            "font-display-condensed",
            /* Tamanho relativo ao size da medalha */
            size === "sm" ? "text-sm" : size === "xl" ? "text-sm" : "text-sm",
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
