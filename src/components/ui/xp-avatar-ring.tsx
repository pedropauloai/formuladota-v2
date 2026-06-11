"use client";

// XpAvatarRing — avatar do usuário com uma BORDA que é a barra de progresso de XP, e o
// LEVEL da conta num badge no centro-inferior da borda (Pedro 2026-06-03).
// O avatar é QUADRADO (rounded-sm) — padrão Steam/Dota, nunca circular
// (ver memory/feedback_avatar_quadrado). A barra anima quando `pct` muda → sobe em
// tempo real conforme o usuário ganha XP respondendo o quiz.

import { useId } from "react";
import { TIER_CONFIG, getTierForLevel, type Tier } from "@/lib/levels";
import { cn } from "@/lib/utils";

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
}

export function XpAvatarRing({
  src,
  alt,
  fallback,
  level,
  pct,
  tier,
  size = 44,
}: Props) {
  const resolvedTier = tier ?? getTierForLevel(level);
  const cfg = TIER_CONFIG[resolvedTier];
  const gradId = useId();

  // Geometria: container = avatar + folga pra borda. SVG cobre o container.
  const stroke = 3;
  const pad = stroke + 3; // folga entre avatar e borda
  const box = size + pad * 2;
  const rx = 6; // canto arredondado do quadrado (rounded-sm vibe)
  const clamped = Math.max(0, Math.min(1, pct));

  // Caminho do anel: começa no CENTRO-INFERIOR (onde fica o badge de level) e dá a
  // volta no sentido horário (baixo → esquerda → topo → direita → volta ao centro),
  // pra a barra de XP nascer do número do level. Pedro 2026-06-03.
  const L = stroke / 2;
  const T = stroke / 2;
  const R = box - stroke / 2;
  const B = box - stroke / 2;
  const cx = box / 2;
  const ringPath = [
    `M ${cx} ${B}`,
    `L ${L + rx} ${B}`,
    `A ${rx} ${rx} 0 0 1 ${L} ${B - rx}`,
    `L ${L} ${T + rx}`,
    `A ${rx} ${rx} 0 0 1 ${L + rx} ${T}`,
    `L ${R - rx} ${T}`,
    `A ${rx} ${rx} 0 0 1 ${R} ${T + rx}`,
    `L ${R} ${B - rx}`,
    `A ${rx} ${rx} 0 0 1 ${R - rx} ${B}`,
    `L ${cx} ${B}`,
  ].join(" ");

  return (
    <div
      className="relative shrink-0"
      style={{ width: box, height: box }}
      aria-label={`Nível ${level}, ${Math.round(clamped * 100)}% para o próximo`}
    >
      {/* Borda-progresso */}
      <svg
        className={cn("absolute inset-0", cfg.color)}
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        fill="none"
        aria-hidden="true"
      >
        {/* Track neutro */}
        <path
          d={ringPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="opacity-15"
        />
        {/* Progresso (cor do tier via currentColor) — nasce no centro-inferior, horário */}
        <path
          d={ringPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamped}
          style={{
            transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)",
            filter: "drop-shadow(0 0 4px currentColor)",
          }}
        />
      </svg>

      {/* Avatar quadrado */}
      <div
        className="absolute overflow-hidden rounded-sm bg-bg-surface"
        style={{ inset: pad }}
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
        title={`${cfg.label} · Nível ${level}`}
      >
        {level}
      </span>
    </div>
  );
}
