"use client";
// Container do placar com ABAS (estilo cliente Dota: denso, barra superior).
// Faz só o toggle de aba no cliente; todo o parsing é feito no servidor e chega
// como view-model serializável. Cada painel é presentational.

import { useState } from "react";
import type { PlayerFull, AdvantageSeries } from "@/lib/dota/match-stats";
import type { PlayerSeries } from "@/lib/dota/match-series";
import type { Ward } from "@/lib/dota/match-vision";
import { MatchScoreboard } from "@/components/match/match-scoreboard";
import { splitTeams } from "@/components/match/shared";
import { PerformancePanel } from "@/components/match/tabs/performance-panel";
import { GraphsPanel } from "@/components/match/tabs/graphs-panel";
import { BuildsPanel } from "@/components/match/tabs/builds-panel";
import { CombatPanel } from "@/components/match/tabs/combat-panel";
import { MapsPanel } from "@/components/match/tabs/maps-panel";
import { BenchmarksPanel } from "@/components/match/tabs/benchmarks-panel";

const TABS = [
  "Visão geral",
  "Performance",
  "Gráficos",
  "Builds",
  "Combate",
  "Mapas",
  "Benchmarks",
] as const;
type Tab = (typeof TABS)[number];

export function MatchDetail({
  players,
  advantage,
  series,
  wards,
  radiantWin,
}: {
  players: PlayerFull[];
  advantage: AdvantageSeries;
  series: PlayerSeries[];
  wards: Ward[];
  radiantWin: boolean | null;
}) {
  const [tab, setTab] = useState<Tab>("Visão geral");
  const { radiant, dire } = splitTeams(players);

  return (
    <div>
      {/* Barra de abas. */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border-subtle">
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 border-b-2 px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
                active
                  ? "border-brand-primary text-text-display"
                  : "border-transparent text-text-muted hover:text-text-display"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Painel ativo. */}
      {tab === "Visão geral" && (
        <MatchScoreboard radiant={radiant} dire={dire} radiantWin={radiantWin} />
      )}
      {tab === "Performance" && <PerformancePanel players={players} />}
      {tab === "Gráficos" && <GraphsPanel series={series} advantage={advantage} />}
      {tab === "Builds" && <BuildsPanel players={players} />}
      {tab === "Combate" && <CombatPanel players={players} />}
      {tab === "Mapas" && <MapsPanel players={players} wards={wards} />}
      {tab === "Benchmarks" && <BenchmarksPanel players={players} />}
    </div>
  );
}
