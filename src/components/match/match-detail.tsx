"use client";
// Container do placar com ABAS (estilo cliente Dota: denso, barra superior).
// Faz só o toggle de aba no cliente; todo o parsing é feito no servidor e chega
// como view-model serializável. Cada painel é presentational.

import { useState } from "react";
import type { PlayerFull, AdvantageSeries } from "@/lib/dota/match-stats";
import { MatchScoreboard } from "@/components/match/match-scoreboard";
import { splitTeams } from "@/components/match/shared";
import { PerformancePanel } from "@/components/match/tabs/performance-panel";
import { FarmPanel } from "@/components/match/tabs/farm-panel";
import { BuildsPanel } from "@/components/match/tabs/builds-panel";
import { CombatPanel } from "@/components/match/tabs/combat-panel";
import { VisionPanel } from "@/components/match/tabs/vision-panel";
import { BenchmarksPanel } from "@/components/match/tabs/benchmarks-panel";

const TABS = [
  "Visão geral",
  "Performance",
  "Economia",
  "Builds",
  "Combate",
  "Visão",
  "Benchmarks",
] as const;
type Tab = (typeof TABS)[number];

export function MatchDetail({
  players,
  advantage,
  radiantWin,
}: {
  players: PlayerFull[];
  advantage: AdvantageSeries;
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
      {tab === "Economia" && <FarmPanel players={players} advantage={advantage} />}
      {tab === "Builds" && <BuildsPanel players={players} />}
      {tab === "Combate" && <CombatPanel players={players} />}
      {tab === "Visão" && <VisionPanel players={players} />}
      {tab === "Benchmarks" && <BenchmarksPanel players={players} />}
    </div>
  );
}
