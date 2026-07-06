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
import { ProgressTipGlow } from "@/components/ui/progress-tip-glow";
import { cn } from "@/lib/utils";

// Cor (HEX — WebGL precisa) do brilho de progresso por efeito de anel equipado
// (cosmético). Nada proibido (Pedro 2026-07-06): ciano/roxo livres como acento premium.
const EFFECT_COLOR: Record<RingEffectId, string> = {
  ember: "#c8aa6e", // dourado
  inferno: "#C42121", // vermelho da marca
  pulse: "#00C466", // verde play
  aurora: "#e3cf9e", // dourado claro
  electric: "#2ad4ff", // azul ciano elétrico (ref do Pedro)
  arcane: "#a855f7", // roxo arcano
};
/** Cor default do brilho de progresso (sem cosmético) — dourado de destaque da marca. */
const DEFAULT_TIP_COLOR = "#c8aa6e";

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
  /**
   * Liga o BRILHO WebGL na ponta da barra (fagulhas + calda). Cada instância é 1 contexto
   * WebGL — caro e limitado pelo navegador (~10-16 por página). Por isso é OPT-IN: só nos
   * avatares de DESTAQUE (mini-perfil próprio, /me), onde há 1-2 na tela. Em LISTAS
   * (feed, ranking, fila, hover) fica desligado → a barra ainda mostra a cor do cosmético,
   * só sem o glow animado, e nada de "carrega em uns e noutros não" nem travar o navegador.
   */
  premiumEffect?: boolean;
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
  premiumEffect = false,
}: Props) {
  const t = useTranslations("ui");
  const prefersReducedMotion = useReducedMotion();
  const resolvedTier = tier ?? getTierForLevel(level);

  // Tier VISUAL do glow: cosmético equipado manda; senão, o tier real (fallback).
  const glowOff = ringVariant?.kind === "none";
  const visualTier: Tier =
    ringVariant?.kind === "tier" ? ringVariant.tier : resolvedTier;
  const cfg = TIER_CONFIG[visualTier];

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

  // BRILHO + RASTRO do progresso (Pedro 2026-07-06): amostra N pontos ao longo da barra
  // PREENCHIDA (0..clamped) via getPointAtLength (client-only) e passa pro shader WebGL,
  // que desenha um cometa de energia correndo pela barra + o brilho na ponta + fagulhas.
  // Normalizado 0..1 (÷box) pro shader. NÃO é SVG (Pedro: "quero webgl").
  const progressRef = useRef<SVGPathElement>(null);
  const N_PTS = 24; // 25 pontos — suave e dentro do limite de uniforms do WebGL
  const [glow, setGlow] = useState<{
    pts: Float32Array;
    tip: [number, number];
    count: number;
  } | null>(null);
  useEffect(() => {
    const p = progressRef.current;
    if (!premiumEffect || !p || clamped <= 0) {
      setGlow(null);
      return;
    }
    const total = p.getTotalLength();
    const count = N_PTS + 1;
    const pts = new Float32Array(count * 2);
    for (let i = 0; i <= N_PTS; i++) {
      const at = p.getPointAtLength((i / N_PTS) * clamped * total);
      pts[i * 2] = at.x / box;
      pts[i * 2 + 1] = at.y / box;
    }
    setGlow({ pts, tip: [pts[N_PTS * 2] ?? 0, pts[N_PTS * 2 + 1] ?? 0], count });
  }, [premiumEffect, clamped, box, rx, ringPath]);

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
      </svg>

      {/* RASTRO + BRILHO do progresso — SHADER WebGL cobrindo o avatar. Cometa de energia
          correndo pela barra preenchida + ponta com fagulhas. Cor do efeito equipado
          (cosmético) ou dourado default. */}
      {premiumEffect && glow && !glowOff && (
        <ProgressTipGlow
          box={box}
          color={effectColor ?? DEFAULT_TIP_COLOR}
          pts={glow.pts}
          tip={glow.tip}
          count={glow.count}
        />
      )}

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
