// Aba Performance — papel de rota, eficiência, participação em teamfight, APM,
// e abates de mapa (neutros, roshan, torres) por jogador.

import type { PlayerFull } from "@/lib/dota/match-stats";
import { StatTable, fmtPct, type StatColumn } from "@/components/match/shared";

const COLUMNS: StatColumn[] = [
  { labelKey: "colPerfLane", render: (p) => p.performance.laneName ?? "—" },
  {
    labelKey: "colPerfEff",
    render: (p) =>
      p.performance.laneEfficiencyPct != null ? `${p.performance.laneEfficiencyPct}%` : "—",
  },
  { labelKey: "colPerfTeamfight", render: (p) => fmtPct(p.performance.teamfightPct), accent: "text-gold" },
  { labelKey: "colPerfApm", render: (p) => (p.performance.apm != null ? p.performance.apm : "—") },
  { labelKey: "colPerfNeutrals", render: (p) => p.performance.neutralKills },
  { labelKey: "colPerfRoshan", render: (p) => p.performance.roshanKills },
  { labelKey: "colPerfTowers", render: (p) => p.performance.towerKills },
  { labelKey: "colPerfRunes", render: (p) => p.performance.runePickups },
  { labelKey: "colPerfBuyback", render: (p) => p.performance.buybackCount },
  { labelKey: "colPerfStuns", render: (p) => p.performance.stuns },
];

export function PerformancePanel({ players }: { players: PlayerFull[] }) {
  return <StatTable players={players} columns={COLUMNS} />;
}
