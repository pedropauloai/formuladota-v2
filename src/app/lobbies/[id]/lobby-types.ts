// Tipos compartilhados da SALA (LobbyRoom + subcomponentes + fetch-actions).
// Sem "use client": só tipos e constantes — importável de server e client.

import type { HonorRank } from "@/components/ui/honor-rank-medal";

export interface PlayerSlot {
  userId: string;
  team: "radiant" | "dire" | "spectator";
  joinedAt: string;
  username: string;
  avatarUrl: string | null;
  /** MMR atual do perfil — exibido em gold no slot (null = sem calibração). */
  mmr: number | null;
  /** Banda HONOR derivada do nível da conta (gated por MMR no topo). */
  honorRank: HonorRank;
}

export interface LobbyData {
  id: string;
  name: string;
  password: string;
  gameMode: string;
  status: string;
  maxPlayers: number;
  steamLobbyId: string | null;
  createdBy: string;
  startedAt: string | null;
}

export const GAME_MODE_LABELS: Record<string, string> = {
  all_pick: "Escolha livre",
  captains_mode: "Modo capitães",
  random_draft: "Seleção aleatória",
  single_draft: "Escolha única",
};
