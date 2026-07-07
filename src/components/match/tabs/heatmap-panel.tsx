"use client";

// Aba "Presença" — MAPA DE CALOR de posição por jogador (estilo STRATZ). Plota o
// lane_pos (contagem de presença por célula) sobre o minimapa do Dota, num canvas com
// blend aditivo: quanto mais o jogador ficou numa região, mais quente. Seletor por
// jogador (herói + nome). Cobre a fase de rota (dado do OpenDota).

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { PlayerHeatmap, HeatCell } from "@/lib/dota/match-heatmap";

const SIZE = 512; // resolução interna do canvas (CSS escala pra 100%)
const RADIANT = "#00C466";
const DIRE = "#C42121";

// Colormap quente: verde (pouca presença) → amarelo → vermelho (muita).
function colorFor(t: number): [number, number, number] {
  if (t < 0.5) {
    const u = t / 0.5;
    return [Math.round(u * 255), 200, 40]; // verde → amarelo
  }
  const u = (t - 0.5) / 0.5;
  return [255, Math.round(200 * (1 - u)), 30]; // amarelo → vermelho
}

function drawHeatmap(canvas: HTMLCanvasElement, cells: HeatCell[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.globalCompositeOperation = "lighter"; // acumula densidade onde há sobreposição
  const radius = SIZE * 0.055;
  for (const c of cells) {
    const x = (c.leftPct / 100) * SIZE;
    const y = (c.topPct / 100) * SIZE;
    const [r, g, b] = colorFor(c.intensity);
    const alpha = 0.12 + c.intensity * 0.5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function HeatmapPanel({ heatmaps }: { heatmaps: PlayerHeatmap[] }) {
  const t = useTranslations("scoreboard");
  const withData = heatmaps.filter((h) => h.hasData);
  const [slot, setSlot] = useState<number | null>(withData[0]?.slot ?? null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selected = withData.find((h) => h.slot === slot) ?? null;

  useEffect(() => {
    if (canvasRef.current && selected) drawHeatmap(canvasRef.current, selected.cells);
  }, [selected]);

  if (withData.length === 0) {
    return (
      <p className="py-16 text-center font-body text-sm text-text-muted">
        {t("heatUnavailable")}
      </p>
    );
  }

  const radiant = withData.filter((h) => h.team === "radiant");
  const dire = withData.filter((h) => h.team === "dire");

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* Minimapa + heatmap sobreposto. */}
      <div className="relative aspect-square w-full max-w-[460px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle">
        <Image
          src="/dota/minimap/minimap.jpg"
          alt={t("minimapAlt")}
          fill
          unoptimized
          className="object-cover opacity-70"
        />
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {/* Seletor de jogador + legenda. */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-text-faded">
            {t("heatPickPlayer")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <PlayerColumn title={t("teamRadiant")} tone={RADIANT} players={radiant} slot={slot} onPick={setSlot} />
            <PlayerColumn title={t("teamDire")} tone={DIRE} players={dire} slot={slot} onPick={setSlot} />
          </div>
        </div>

        {/* Legenda do gradiente. */}
        <div className="flex items-center gap-2 font-body text-xs text-text-faded">
          <span>{t("heatLess")}</span>
          <span
            className="h-2 flex-1 rounded-full"
            style={{ background: "linear-gradient(90deg, rgba(0,200,40,.7), rgba(255,200,40,.85), rgba(255,40,30,.95))" }}
          />
          <span>{t("heatMore")}</span>
        </div>

        <p className="max-w-md font-body text-xs leading-relaxed text-text-faded">
          {t.rich("heatDesc", {
            name: selected?.playerName ?? t("heatPlayerFallback"),
            hero: selected?.heroName ?? "",
            strong: (chunks) => <strong className="text-text-muted">{chunks}</strong>,
          })}
        </p>
      </div>
    </div>
  );
}

function PlayerColumn({
  title,
  tone,
  players,
  slot,
  onPick,
}: {
  title: string;
  tone: string;
  players: PlayerHeatmap[];
  slot: number | null;
  onPick: (slot: number) => void;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 font-display text-[0.7rem] font-bold uppercase tracking-wide text-text-faded">
        <span className="size-2 rounded-full" style={{ backgroundColor: tone }} />
        {title}
      </p>
      <ul className="space-y-1">
        {players.map((h) => {
          const active = h.slot === slot;
          return (
            <li key={h.slot}>
              <button
                type="button"
                onClick={() => onPick(h.slot)}
                className={`flex w-full items-center gap-2 rounded-sm border px-2 py-1.5 text-left transition-colors ${
                  active
                    ? "border-brand-primary bg-brand-primary/10"
                    : "border-border-subtle/50 hover:bg-bg-elevated/40"
                }`}
              >
                {h.heroIcon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.heroIcon} alt={h.heroName} width={22} height={22} className="size-[22px] shrink-0 rounded-sm object-cover" />
                ) : (
                  <span className="size-[22px] shrink-0 rounded-sm bg-bg-elevated" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-xs font-medium text-text-display">{h.playerName}</span>
                  <span className="block truncate font-display text-[0.65rem] text-text-faded">{h.heroName}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
