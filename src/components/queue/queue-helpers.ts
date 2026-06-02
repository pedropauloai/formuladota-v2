// Helpers compartilhados entre componentes de fila (queue-action-button,
// dashboard-center, etc). Centralizados pra evitar drift de mapeamento.

import type { DotaRank } from "@/components/ui/dota-rank-medal";
import type { HonorRank } from "@/components/ui/honor-rank-medal";
import type { BoardCoach } from "./queue-board";

// Mapeia MMR Valve → DotaRank V2.5 (escala oficial Valve, mesma de /me)
export function mmrToDotaRank(mmr: number | null | undefined): DotaRank {
  if (mmr == null) return "herald";
  if (mmr >= 9000) return "immortal-top-100";
  if (mmr >= 6000) return "immortal";
  if (mmr >= 5000) return "divine";
  if (mmr >= 4000) return "ancient";
  if (mmr >= 3000) return "legend";
  if (mmr >= 2000) return "archon";
  if (mmr >= 1500) return "crusader";
  if (mmr >= 770) return "guardian";
  return "herald";
}

// TODO(schema): integrar nível real do coach quando ProLiveStatus expor o nível
// HONOR (hoje BoardCoach não traz). PROs são jogadores avançados — fallback "as".
export function coachHonorRank(_coach: BoardCoach): HonorRank {
  return "as";
}
