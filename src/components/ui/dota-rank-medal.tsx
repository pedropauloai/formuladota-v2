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
import { Lock, Star, Crown } from "lucide-react"
import { useTranslations } from "next-intl"
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
 * Pele da medalha:
 * - "valve" (padrão): medalha oficial Valve crua = SKILL legado (Eixo 1).
 * - "formuladota": MESMA arte, mas com moldura de marca = RANK sazonal da liga
 *   (Eixo 2). Reusa a escala das 8 medalhas (decisão GamersClub), diferenciada
 *   pela pele — nunca confundir com a Valve crua.
 */
export type DotaMedalVariant = "valve" | "formuladota"

/**
 * Lista canônica dos rankIds (ordem Herald→Immortal + Top 100 especial).
 * Os NOMES EXIBIDOS são resolvidos por i18n (namespace "ranks", chave
 * ranks.dota.<rankId>) — em EN saem os nomes oficiais Valve (Herald, Guardian…),
 * em PT os equivalentes (Arauto, Guardião…). Este map serve só pra iterar/validar
 * os ids; NÃO use os valores como label de UI.
 */
export const RANK_LABELS: Record<DotaRank, true> = {
  herald: true,
  guardian: true,
  crusader: true,
  archon: true,
  legend: true,
  ancient: true,
  divine: true,
  immortal: true,
  "immortal-top-100": true,
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
  const t = useTranslations("ui")
  const tr = useTranslations("ranks")
  // Top 100 ocupa o mesmo degrau do Imortal na régua
  const rulerCurrent = current === "immortal-top-100" ? "immortal" : current
  const currentIdx = SKILL_ORDER.indexOf(rulerCurrent)
  return (
    <span className="block w-[420px] max-w-[88vw]">
      <span className="block text-center font-display-condensed text-lg uppercase leading-none tracking-[0.2em] text-text-muted">
        {t("skillShowcaseTitle")}
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
          {tr(`dota.${current}`)}
        </span>
      </span>
      <span className="mt-1 block text-center text-xs leading-snug text-text-muted">
        {t("skillShowcaseSubtitle")}
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
              {tr(`dota.${r}`)}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}


/**
 * RankShowcase — hover do RANK FormulaDota (Eixo 2). Mesma régua das 8 medalhas
 * Valve (decisão GamersClub: reusar a escala), mas enquadrado como o rank SAZONAL
 * da liga — o que vale aqui dentro (a medalha Valve é só o legado/semente).
 */
export function RankShowcase({ current }: { current: DotaRank }) {
  const t = useTranslations("ui")
  const tr = useTranslations("ranks")
  const rulerCurrent = current === "immortal-top-100" ? "immortal" : current
  const currentIdx = SKILL_ORDER.indexOf(rulerCurrent)
  return (
    <span className="block w-[420px] max-w-[88vw]">
      <span className="block text-center font-display-condensed text-lg uppercase leading-none tracking-[0.2em] text-brand-primary">
        {t("rankShowcaseTitle")}
      </span>
      <span className="mt-2 flex flex-col items-center gap-1">
        {/* Medalha atual com a moldura FormulaDota (mesma pele do selo compacto) */}
        <span className="inline-flex rounded-sm border border-brand-primary/45 bg-bg-deep/50 p-1">
          <Image
            src={`/icons/dota-ranks/${current}.png`}
            alt=""
            width={64}
            height={64}
            className="object-contain"
            aria-hidden="true"
          />
        </span>
        <span className="font-display-condensed text-xl uppercase leading-none tracking-widest text-gold">
          {tr(`dota.${current}`)}
        </span>
      </span>
      <span className="mt-1 block text-center text-xs leading-snug text-text-muted">
        {t("rankShowcaseSubtitle")}
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
              {tr(`dota.${r}`)}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}


/** Wrapper condicional do showcase — <MedalPair> desliga o hover individual.
 *  variant "formuladota" mostra o RankShowcase (rank sazonal); "valve" o SkillShowcase. */
function MaybeTooltip({
  enabled,
  rank,
  variant,
  children,
}: {
  enabled: boolean
  rank: DotaRank
  variant: DotaMedalVariant
  children: React.ReactNode
}) {
  if (!enabled) return <>{children}</>
  const content =
    variant === "formuladota" ? <RankShowcase current={rank} /> : <SkillShowcase current={rank} />
  return (
    <Tooltip content={content} contentClassName="max-w-none p-3">
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
  // Reduzido 16→8px (Pedro 2026-06-12: glow do Imortal estava forte demais)
  immortal: "drop-shadow-[0_0_8px_var(--color-warning)]",
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

  /**
   * Pele da medalha — "valve" (crua, SKILL legado) ou "formuladota" (moldura de
   * marca, RANK sazonal). @default "valve"
   */
  variant?: DotaMedalVariant

  /**
   * Estrelas da sub-divisão (1–5, como no cliente Dota 2). Só faz sentido abaixo do
   * Imortal (que não tem estrela). `undefined` = uso decorativo/genérico (não mostra).
   * Cada estrela ≈ 154 MMR até Ancião e ≈ 200 no Divino (escala oficial, ver src/lib/mmr.ts).
   */
  stars?: number

  /**
   * Número do leaderboard de Imortais (posição da temporada). Quando setado, desenha
   * o número DENTRO da medalha (estilo oficial do Dota). Só pra Imortal no top da temporada.
   */
  leaderboardNumber?: number

  /** Coroa sobre a medalha — reservado ao #1 do leaderboard (único). */
  crown?: boolean
}

/**
 * StarPips — fileira de estrelas douradas sobre a base da medalha (a Valve embute
 * as estrelas na arte; como usamos a arte-base sem elas, sobrepomos os pips). Não
 * renderiza no Imortal/Top 100 (sem sub-divisão). Escala com o tamanho da medalha.
 */
function StarPips({ stars, rank, px }: { stars: number; rank: DotaRank; px: number }) {
  if (rank === "immortal" || rank === "immortal-top-100") return null
  const count = Math.min(5, Math.max(1, Math.round(stars)))
  const starSize = Math.max(5, Math.round(px * 0.17))
  return (
    <span
      className="pointer-events-none absolute inset-x-0 bottom-[6%] flex items-center justify-center gap-[1px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          size={starSize}
          strokeWidth={1.75}
          className="fill-gold text-bg-deep"
        />
      ))}
    </span>
  )
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
  variant = "valve",
  stars,
  leaderboardNumber,
  crown,
}: DotaRankMedalProps) {
  const t = useTranslations("ui")
  const tr = useTranslations("ranks")
  const px = SIZE_PX[size]
  const sizeClass = SIZE_CLASS[size]
  const glowClass = glow ? (GLOW_CLASS[rank] ?? "") : ""
  const label = tr(`dota.${rank}`)
  const isFd = variant === "formuladota"

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
            {t("notCalibrated")}
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
            alt={t("rankCalibratingAlt")}
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
            {t("calibratingBadge")}
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
            {t("calibratingLabel")}
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
          Hover educacional: SKILL (Valve) é eixo distinto do HONOR (FormulaDota).
          variant "formuladota" = MESMA arte com moldura de marca (rank sazonal). */}
      <MaybeTooltip enabled={tooltip} rank={rank} variant={variant}>
        <div
          className={cn(
            sizeClass,
            "relative",
            "flex items-center justify-center",
            /* Isolamento de contexto para o drop-shadow funcionar corretamente */
            "isolate",
            /* Pele FormulaDota: identidade dada pelo MONOGRAMA FD (canto), sem caixa
               em volta — a moldura+fundo poluíam e davam sensação de baixa definição
               (Pedro 2026-07-02). A medalha respira limpa, no tamanho cheio. */
          )}
        >
          <Image
            src={src}
            alt={`${label} rank medal`}
            width={px}
            height={px}
            /* unoptimized: serve o PNG 256px cheio pro browser redimensionar (nítido em
               telas HiDPI). O pipeline do Next reamostrava pra 32/48px e borrava a
               medalha — era a "baixa definição" que o Pedro via (2026-07-02). */
            unoptimized
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
          {/* Estrelas da sub-divisão (1–5) — fiel ao cliente Dota 2. */}
          {typeof stars === "number" && <StarPips stars={stars} rank={rank} px={px} />}
          {/* Número do leaderboard DENTRO da medalha (estilo oficial): posição da
              temporada pros Imortais no topo. */}
          {typeof leaderboardNumber === "number" && (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <span
                className="font-display-condensed font-bold leading-none text-gold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                style={{ fontSize: px * 0.42 }}
              >
                {leaderboardNumber}
              </span>
            </span>
          )}
          {/* Coroa do #1 (única). */}
          {crown && (
            <Crown
              size={Math.max(10, Math.round(px * 0.34))}
              className="absolute -top-1 left-1/2 -translate-x-1/2 fill-gold text-gold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              aria-hidden="true"
            />
          )}
          {/* Monograma FD — só em md+ (em sm poluiria); assina a pele de marca. */}
          {isFd && size !== "sm" && (
            <span
              className="absolute -bottom-1 -right-1 rounded-sm bg-brand-primary px-1 font-display-condensed text-[9px] font-bold uppercase leading-tight tracking-wide text-white shadow-sm"
              aria-hidden="true"
            >
              FD
            </span>
          )}
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
            /* Cor semântica: muted (Valve) ou marca (rank FormulaDota) */
            isFd ? "text-brand-primary" : "text-text-muted",
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
