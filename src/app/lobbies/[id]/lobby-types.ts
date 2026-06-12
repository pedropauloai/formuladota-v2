// Tipos compartilhados da SALA (LobbyRoom + subcomponentes + fetch-actions).
// Sem "use client": só tipos e constantes — importável de server e client.

import type { HonorRank } from "@/components/ui/honor-rank-medal";

export interface PlayerSlot {
  userId: string;
  team: "radiant" | "dire" | "spectator";
  /** Posição FIXA na coluna do time (0-based). NULL pra espectador. */
  slot: number | null;
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

/**
 * Papéis por posição de slot (pedido Pedro 2026-06-11): cada slot da coluna
 * é uma POS fixa do Dota — o jogador escolhe a função ao escolher o slot.
 * Índice 0-based → label.
 */
export const SLOT_ROLE_LABELS: readonly string[] = [
  "POS 1 — HC",
  "POS 2 — MID",
  "POS 3 — OFF",
  "POS 4 — SUP 4",
  "POS 5 — SUP 5",
];

export const GAME_MODE_LABELS: Record<string, string> = {
  all_pick: "Escolha livre",
  captains_mode: "Modo capitães",
  random_draft: "Seleção aleatória",
  single_draft: "Escolha única",
};
