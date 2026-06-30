// Aba Visão — wards de observação/sentinela colocadas e destruídas, mais camps
// stackados (controle de mapa). Dados de obs/sen do raw_opendota.

import type { PlayerFull } from "@/lib/dota/match-stats";
import { StatTable, type StatColumn } from "@/components/match/shared";

const COLUMNS: StatColumn[] = [
  { label: "Obs colocadas", render: (p) => p.vision.obsPlaced, accent: "text-gold" },
  { label: "Sentries", render: (p) => p.vision.senPlaced },
  { label: "Obs destruídas", render: (p) => p.vision.observerKills },
  { label: "Sentries destr.", render: (p) => p.vision.sentryKills },
  { label: "Camps", render: (p) => p.performance.campsStacked },
  { label: "Creeps stack", render: (p) => p.performance.creepsStacked },
];

export function VisionPanel({ players }: { players: PlayerFull[] }) {
  return <StatTable players={players} columns={COLUMNS} />;
}
