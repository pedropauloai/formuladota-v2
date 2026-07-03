// Helpers compartilhados entre componentes de fila (queue-action-button,
// dashboard-center, etc). Centralizados pra evitar drift de mapeamento.

import type { HonorRank } from "@/components/ui/honor-rank-medal";
import type { BoardCoach } from "./queue-board";

// mmrToDotaRank: implementação canônica em @/lib/dota/rank-badges (fonte única).
// Re-exportado aqui por compatibilidade dos imports existentes.
export { mmrToDotaRank } from "@/lib/dota/rank-badges";

// TODO(schema): integrar nível real do coach quando ProLiveStatus expor o nível
// HONOR (hoje BoardCoach não traz). PROs são jogadores avançados — fallback "as".
export function coachHonorRank(_coach: BoardCoach): HonorRank {
  return "as";
}
