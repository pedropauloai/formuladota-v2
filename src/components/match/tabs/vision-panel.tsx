// Aba Visão — wards de observação/sentinela colocadas e destruídas, mais camps
// stackados (controle de mapa). Dados de obs/sen do raw_opendota.

import type { PlayerFull } from "@/lib/dota/match-stats";
import { StatTable, type StatColumn } from "@/components/match/shared";

const COLUMNS: StatColumn[] = [
  { labelKey: "colVisObsPlaced", render: (p) => p.vision.obsPlaced, accent: "text-gold" },
  { labelKey: "colVisSentries", render: (p) => p.vision.senPlaced },
  { labelKey: "colVisObsKilled", render: (p) => p.vision.observerKills },
  { labelKey: "colVisSentriesKilled", render: (p) => p.vision.sentryKills },
  { labelKey: "colVisCamps", render: (p) => p.performance.campsStacked },
  { labelKey: "colVisCreepStack", render: (p) => p.performance.creepsStacked },
];

export function VisionPanel({ players }: { players: PlayerFull[] }) {
  return <StatTable players={players} columns={COLUMNS} />;
}
