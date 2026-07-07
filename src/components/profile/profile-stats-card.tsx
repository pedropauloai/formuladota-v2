"use client";
// Card de performance: DOIS hexágonos sobrepostos (Pedro 2026-06-30) — "Conta
// geral" (carreira real do STRATZ) + "FormulaDota" (partidas da liga) nas MESMAS
// 6 métricas, com toggle pra ligar/desligar cada um.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WidgetShell } from "./widgets/widget-shell";
import { PerformanceHexagon, type HexSeries } from "./performance-hexagon";

export interface StatBlock {
  matches: number;
  wins: number;
  losses: number;
  avgKDA: number;
  avgGPM: number;
  avgXPM: number;
  avgLastHits: number;
  avgHeroDamage: number;
}

const GENERAL_COLOR = "#E8B94A"; // dourado — conta geral
const FDOTA_COLOR = "#00C466"; // verde — FormulaDota

// Normaliza um bloco de stats nos 6 eixos (0..1) — mesma escala pros dois.
function toValues(b: StatBlock): number[] {
  const wr = b.matches > 0 ? b.wins / b.matches : 0;
  return [
    wr,
    Math.min(1, b.avgKDA / 6),
    Math.min(1, b.avgGPM / 800),
    Math.min(1, b.avgXPM / 900),
    Math.min(1, b.avgLastHits / 350),
    Math.min(1, b.avgHeroDamage / 35000),
  ];
}

function winratePct(b: StatBlock): number {
  return b.matches > 0 ? Math.round((b.wins / b.matches) * 100) : 0;
}

export function ProfileStatsCard({
  general,
  fdota,
  editing,
}: {
  general: StatBlock | null;
  fdota: StatBlock | null;
  editing: boolean;
}) {
  const [showGeneral, setShowGeneral] = useState(true);
  const [showFdota, setShowFdota] = useState(true);
  const t = useTranslations("profileExtra");

  const AXES = [
    t("axisWins"),
    t("axisKda"),
    t("axisGpm"),
    t("axisXpm"),
    t("axisLastHits"),
    t("axisDamage"),
  ];

  const series: HexSeries[] = [];
  if (general && showGeneral) {
    series.push({ name: "Conta geral", color: GENERAL_COLOR, values: toValues(general) });
  }
  if (fdota && showFdota) {
    series.push({ name: "FormulaDota", color: FDOTA_COLOR, values: toValues(fdota) });
  }

  return (
    <WidgetShell title={t("performance")} editing={editing}>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">
          <PerformanceHexagon labels={AXES} series={series} />
        </div>

        {/* Toggle dos hexágonos (ligar/desligar cada um). */}
        <div className="mt-1 flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-border-subtle pt-2">
          {general && (
            <ToggleChip
              label={t("generalAccount")}
              sub={`${fmt(general.matches)} · ${winratePct(general)}%`}
              color={GENERAL_COLOR}
              on={showGeneral}
              onClick={() => setShowGeneral((v) => !v)}
            />
          )}
          {fdota && (
            <ToggleChip
              label="FormulaDota"
              sub={`${fmt(fdota.matches)} · ${winratePct(fdota)}%`}
              color={FDOTA_COLOR}
              on={showFdota}
              onClick={() => setShowFdota((v) => !v)}
            />
          )}
          {!general && !fdota && (
            <span className="font-body text-xs text-text-faded">{t("noPerformanceData")}</span>
          )}
        </div>
      </div>
    </WidgetShell>
  );
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function ToggleChip({
  label,
  sub,
  color,
  on,
  onClick,
}: {
  label: string;
  sub: string;
  color: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 transition-opacity ${
        on ? "border-border-subtle" : "border-border-subtle/40 opacity-40"
      }`}
    >
      <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <span className="font-display text-[0.7rem] font-bold uppercase tracking-wide text-text-display">
        {label}
      </span>
      <span className="font-mono text-[0.65rem] tabular-nums text-text-faded">{sub}</span>
    </button>
  );
}
