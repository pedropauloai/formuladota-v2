// Helpers compartilhados entre componentes de fila (queue-action-button,
// dashboard-center, etc). Centralizados pra evitar drift de mapeamento.

import type { DotaRank } from "@/components/ui/dota-rank-medal";
import type { HonorRank } from "@/components/ui/honor-rank-medal";
import type { BoardCoach } from "./queue-board";

// Mapeia MMR → DotaRank pela escala OFICIAL do Dota (wiki 2025/2026), mesma das
// TIER_BANDS de src/lib/mmr.ts. Imortal = 5620 (teto in-house 7000). O "immortal-top-100"
// não vem do MMR (vem do leaderboard rank, tratado à parte).
export function mmrToDotaRank(mmr: number | null | undefined): DotaRank {
  if (mmr == null) return "herald";
  if (mmr >= 5620) return "immortal";
  if (mmr >= 4620) return "divine";
  if (mmr >= 3850) return "ancient";
  if (mmr >= 3080) return "legend";
  if (mmr >= 2310) return "archon";
  if (mmr >= 1540) return "crusader";
  if (mmr >= 770) return "guardian";
  return "herald";
}

// TODO(schema): integrar nível real do coach quando ProLiveStatus expor o nível
// HONOR (hoje BoardCoach não traz). PROs são jogadores avançados — fallback "as".
export function coachHonorRank(_coach: BoardCoach): HonorRank {
  return "as";
}
