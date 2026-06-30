// Aba Performance — papel de rota, eficiência, participação em teamfight, APM,
// e abates de mapa (neutros, roshan, torres) por jogador.

import type { PlayerFull } from "@/lib/dota/match-stats";
import { StatTable, fmtPct, type StatColumn } from "@/components/match/shared";

const COLUMNS: StatColumn[] = [
  { label: "Rota", render: (p) => p.performance.laneName ?? "—" },
  {
    label: "Efic.",
    render: (p) =>
      p.performance.laneEfficiencyPct != null ? `${p.performance.laneEfficiencyPct}%` : "—",
  },
  { label: "Teamfight", render: (p) => fmtPct(p.performance.teamfightPct), accent: "text-gold" },
  { label: "APM", render: (p) => (p.performance.apm != null ? p.performance.apm : "—") },
  { label: "Neutros", render: (p) => p.performance.neutralKills },
  { label: "Roshan", render: (p) => p.performance.roshanKills },
  { label: "Torres", render: (p) => p.performance.towerKills },
  { label: "Runas", render: (p) => p.performance.runePickups },
  { label: "Buyback", render: (p) => p.performance.buybackCount },
  { label: "Stuns(s)", render: (p) => p.performance.stuns },
];

export function PerformancePanel({ players }: { players: PlayerFull[] }) {
  return <StatTable players={players} columns={COLUMNS} />;
}
