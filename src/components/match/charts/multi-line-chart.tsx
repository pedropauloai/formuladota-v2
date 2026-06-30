"use client";
// Gráfico de múltiplas linhas (SVG puro) — uma linha por jogador, cor distinta.
// Legenda clicável (liga/desliga cada linha). Usado p/ ouro/XP/last hits no tempo.

import { useState } from "react";
import Image from "next/image";

export interface ChartLine {
  name: string;
  color: string;
  heroIcon: string | null;
  values: number[];
}

const W = 800;

function fmtAxis(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

export function MultiLineChart({
  lines,
  height = 240,
}: {
  lines: ChartLine[];
  height?: number;
}) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const H = height;

  const toggle = (i: number) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const visible = lines.filter((_, i) => !hidden.has(i));
  const n = Math.max(0, ...lines.map((l) => l.values.length));
  const maxY = Math.max(1, ...visible.flatMap((l) => l.values));

  const x = (i: number) => (n > 1 ? (i / (n - 1)) * W : 0);
  const y = (v: number) => H - 6 - (v / maxY) * (H - 12);

  // Marcas de minuto a cada 5 min e marcas do eixo Y (4 níveis).
  const xTicks: number[] = [];
  for (let m = 0; m < n; m += 5) xTicks.push(m);
  const yTicks = [0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
          {/* Grades. */}
          {xTicks.map((m) => (
            <line
              key={`x${m}`}
              x1={x(m)}
              y1={0}
              x2={x(m)}
              y2={H}
              stroke="var(--color-border-subtle)"
              strokeOpacity="0.35"
            />
          ))}
          {yTicks.map((v) => (
            <line
              key={`y${v}`}
              x1={0}
              y1={y(v)}
              x2={W}
              y2={y(v)}
              stroke="var(--color-border-subtle)"
              strokeOpacity="0.25"
            />
          ))}
          {/* Linhas visíveis. */}
          {lines.map((l, i) =>
            hidden.has(i) || l.values.length < 2 ? null : (
              <polyline
                key={i}
                points={l.values.map((v, j) => `${x(j).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={l.color}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            )
          )}
        </svg>
        {/* Rótulos do eixo Y (sobrepostos, não escalam com o SVG). */}
        <div className="pointer-events-none absolute left-1 top-0 flex h-full flex-col justify-between py-1">
          {[...yTicks].reverse().map((v) => (
            <span key={v} className="font-mono text-[0.6rem] tabular-nums text-text-faded">
              {fmtAxis(v)}
            </span>
          ))}
        </div>
      </div>

      {/* Legenda clicável. */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {lines.map((l, i) => {
          const off = hidden.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`flex items-center gap-1.5 rounded-sm border px-1.5 py-1 transition-opacity ${
                off ? "border-border-subtle/40 opacity-40" : "border-border-subtle"
              }`}
            >
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: l.color }} />
              {l.heroIcon && (
                <Image
                  src={l.heroIcon}
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="size-4 rounded-sm object-cover"
                />
              )}
              <span className="font-display text-[0.7rem] uppercase tracking-wide text-text-muted">
                {l.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
