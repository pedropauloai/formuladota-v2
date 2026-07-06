"use client";

// XpAvatarRing — avatar do usuário com uma BORDA que é a barra de progresso de XP, e o
// LEVEL da conta num badge no centro-inferior da borda (Pedro 2026-06-03).
// O avatar é QUADRADO (rounded-sm) — padrão Steam/Dota, nunca circular
// (ver memory/feedback_avatar_quadrado). A barra anima quando `pct` muda → sobe em
// tempo real conforme o usuário ganha XP respondendo o quiz.
//
// COSMÉTICOS (Compendium Fase 0): o GLOW e a MOLDURA são equipáveis. Se `ringVariant`
// for passado, ele dita o glow (tier específico ou 'none'=sem glow); senão, fallback =
// tier do próprio nível (comportamento histórico). `frame` desenha a moldura equipada.

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { TIER_CONFIG, getTierForLevel, type Tier } from "@/lib/levels";
import { useReducedMotion } from "@/lib/particles/hooks";
import type { RingAsset, FrameAsset, RingEffectId } from "@/lib/cosmetics";
import { cn } from "@/lib/utils";

const TIER_ORDER: Tier[] = ["novato", "aprendiz", "piloto", "as", "lendario", "mistico"];

// Cor da corrente elétrica por efeito de anel equipado (cosmético). Cores da MARCA
// (nunca ciano/cyberpunk). O efeito é uma moldura elétrica-neon no contorno (ref do
// Pedro: avatar-frame-eletric), não um glow atrás.
const EFFECT_COLOR: Record<RingEffectId, string> = {
  ember: "var(--color-gold)",
  inferno: "var(--color-brand-primary)",
  pulse: "var(--color-play-primary)",
  aurora: "var(--color-gold-bright)",
  electric: "#2ad4ff", // azul ciano elétrico (ref do Pedro — nada proibido)
  arcane: "#a855f7", // roxo arcano
};

interface Props {
  src?: string | null;
  alt: string;
  /** Iniciais pro fallback quando não há avatar. */
  fallback: string;
  /** Nível da conta (0-30). */
  level: number;
  /** Progresso de XP dentro do nível atual (0-1). */
  pct: number;
  /** Tier opcional (senão derivado do nível). */
  tier?: Tier;
  /** Tamanho do avatar interno, em px. */
  size?: number;
  /** Cosmético de ring equipado (glow). null/undefined = default por tier. */
  ringVariant?: RingAsset | null;
  /** Cosmético de moldura equipado. null/undefined/none = sem moldura. */
  frame?: FrameAsset | null;
}

export function XpAvatarRing({
  src,
  alt,
  fallback,
  level,
  pct,
  tier,
  size = 44,
  ringVariant,
  frame,
}: Props) {
  const t = useTranslations("ui");
  const prefersReducedMotion = useReducedMotion();
  const resolvedTier = tier ?? getTierForLevel(level);

  // Tier VISUAL do glow: cosmético equipado manda; senão, o tier real (fallback).
  const glowOff = ringVariant?.kind === "none";
  const visualTier: Tier =
    ringVariant?.kind === "tier" ? ringVariant.tier : resolvedTier;
  const cfg = TIER_CONFIG[visualTier];

  const intensity = glowOff ? 0 : Math.max(0, TIER_ORDER.indexOf(visualTier));

  // Cosmético de EFEITO equipado (moldura elétrica no contorno) → a cor da corrente.
  // null = sem efeito rico (usa o glow/neon por tier no próprio stroke da barra).
  const effectColor =
    ringVariant?.kind === "effect" ? EFFECT_COLOR[ringVariant.effect] : null;

  const frameColor =
    frame && frame.kind !== "none"
      ? frame.color === "gold"
        ? "border-gold"
        : "border-brand-primary"
      : null;

  // Geometria CONCÊNTRICA (Pedro 2026-07-06 — corrigir "arestas bugadas"): o avatar, a
  // folga e o anel compartilham o MESMO centro de curvatura, então os cantos são
  // paralelos (offset uniforme) e não há descompasso avatar-quadrado × anel-redondo.
  const stroke = 3;
  const gap = 3;               // folga entre o avatar e o anel
  const avatarR = 4;           // raio do avatar (quadrado suave, estilo Steam/Dota)
  const pad = gap + stroke;    // inset do avatar dentro do box
  const box = size + pad * 2;
  const inset = stroke / 2;    // linha central do stroke, a stroke/2 da borda do box
  // Raio do anel = raio do avatar + distância até a linha central do stroke → concêntrico.
  const rx = avatarR + (pad - inset);
  const clamped = Math.max(0, Math.min(1, pct));

  // Caminho do anel: um GAP no CENTRO-INFERIOR (onde fica o badge de level) "quebra" o
  // anel — estilo Dota, e ELIMINA a emenda de dois caps no meio da base (a aresta
  // bugada). O path vai da ponta ESQUERDA do gap, dá a volta e termina na ponta DIREITA;
  // as pontas (linecap round) ficam limpas. A barra de XP nasce do badge e cresce.
  const L = inset;
  const T = inset;
  const R = box - inset;
  const B = box - inset;
  const cx = box / 2;
  const gapHalf = Math.max(9, Math.min(16, size * 0.18)); // meia-largura do gap do badge
  const ringPath = [
    `M ${cx - gapHalf} ${B}`,
    `L ${L + rx} ${B}`,
    `A ${rx} ${rx} 0 0 1 ${L} ${B - rx}`,
    `L ${L} ${T + rx}`,
    `A ${rx} ${rx} 0 0 1 ${L + rx} ${T}`,
    `L ${R - rx} ${T}`,
    `A ${rx} ${rx} 0 0 1 ${R} ${T + rx}`,
    `L ${R} ${B - rx}`,
    `A ${rx} ${rx} 0 0 1 ${R - rx} ${B}`,
    `L ${cx + gapHalf} ${B}`,
  ].join(" ");

  // BRILHO NA PONTA do progresso (Pedro 2026-07-06): um ponto de luz na posição atual
  // do preenchimento de XP, com faísca/neon SUTIL — indica "seu progresso está aqui".
  // NÃO é moldura no contorno inteiro (isso ficou "carnaval"). Calcula a posição real
  // ao longo do path via getPointAtLength (client-only). A cor é a do efeito equipado
  // (cosmético) ou a do tier.
  const progressRef = useRef<SVGPathElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const p = progressRef.current;
    if (!p || clamped <= 0) {
      setTip(null);
      return;
    }
    const len = p.getTotalLength();
    const at = p.getPointAtLength(clamped * len);
    setTip({ x: at.x, y: at.y });
  }, [clamped, box, rx, ringPath]);
  // 3 faíscas minúsculas ao redor da ponta (offsets fixos), cintilando fora de fase.
  const TIP_SPARKS = [
    { dx: 2, dy: -1.5 },
    { dx: -1.5, dy: -2 },
    { dx: 1, dy: 2 },
  ];

  return (
    <div
      className={cn("relative isolate shrink-0", cfg.color)}
      style={{ width: box, height: box }}
      aria-label={t("xpRingAria", { level, pct: Math.round(clamped * 100) })}
    >
      {/* Moldura equipada (frame) — borda decorativa ao redor do avatar. */}
      {frameColor && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -inset-[3px] rounded-md border-2",
            frameColor,
            frame?.kind === "animated" && !prefersReducedMotion && "animate-pulse"
          )}
        />
      )}
      {/* Borda-progresso */}
      <svg
        className={cn("absolute inset-0", cfg.color)}
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        fill="none"
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        {/* Track neutro */}
        <path
          d={ringPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-15"
        />
        {/* Progresso (cor do efeito equipado, ou do tier) — nasce no centro-inferior. */}
        <path
          ref={progressRef}
          d={ringPath}
          fill="none"
          stroke={effectColor ?? "currentColor"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamped}
          style={{
            transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        {/* BRILHO NA PONTA — ponto de luz na posição atual do progresso, com faísca sutil.
            Núcleo quase branco + halo neon na cor (drop-shadow apertado). */}
        {tip && !glowOff && (
          <g
            style={{
              filter: `drop-shadow(0 0 2px ${effectColor ?? "currentColor"}) drop-shadow(0 0 5px ${effectColor ?? "currentColor"})`,
            }}
          >
            <circle cx={tip.x} cy={tip.y} r={stroke * 0.72} fill={effectColor ?? "currentColor"} />
            <circle cx={tip.x} cy={tip.y} r={stroke * 0.4} fill="#fff" />
            {!prefersReducedMotion &&
              TIP_SPARKS.map((s, i) => (
                <circle
                  key={i}
                  cx={tip.x + s.dx}
                  cy={tip.y + s.dy}
                  r={0.8}
                  fill="#fff"
                  className="fd-spark"
                  style={{ animationDelay: `${i * 420}ms` }}
                />
              ))}
          </g>
        )}
      </svg>

      {/* Avatar quadrado — raio CONCÊNTRICO ao anel (avatarR), pra os cantos ficarem
          paralelos à borda do anel (sem descompasso). */}
      <div
        className="absolute overflow-hidden bg-bg-surface"
        style={{ inset: pad, borderRadius: avatarR }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-display text-sm font-bold uppercase text-text-muted">
            {fallback}
          </div>
        )}
      </div>

      {/* Level badge — centro-inferior da borda. Número do nível = valor/progresso
          → GOLD (Pedro 2026-06-11); a borda mantém a cor do tier (sinal de tier). */}
      <span
        className={cn(
          "absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/3",
          "flex min-w-5 items-center justify-center rounded-sm border px-1 py-px",
          "bg-bg-deep font-display text-[10px] font-bold leading-none tabular-nums",
          "text-gold",
          cfg.borderColor
        )}
        title={t("xpRingTitle", { tier: cfg.label, level })}
      >
        {level}
      </span>
    </div>
  );
}
