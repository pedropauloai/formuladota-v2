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
 * Índice 0-based → CHAVE de tradução (namespace "lobbies"). Resolve no render.
 */
export const SLOT_ROLE_LABEL_KEYS: readonly string[] = [
  "slotRolePos1",
  "slotRolePos2",
  "slotRolePos3",
  "slotRolePos4",
  "slotRolePos5",
];

/**
 * Hover educacional por POS — papel da posição na metodologia da Fórmula.
 * Índice 0-based → CHAVE de tradução (namespace "lobbies"). Resolve no render.
 * Fontes: docs/foundations/METHODOLOGY.md §2 (metas Core 500 GPM / Suporte
 * 250 GPM, KDA não é performance), §8 (simulador de herói);
 * METODOLOGIA_FUNDAMENTOS.md L3 (lado do mapa / terreno elevado);
 * src/lib/doctrine.ts princípio 10 (Mid = corrida do nível).
 */
export const SLOT_ROLE_TOOLTIP_KEYS: readonly string[] = [
  "slotTooltipPos1",
  "slotTooltipPos2",
  "slotTooltipPos3",
  "slotTooltipPos4",
  "slotTooltipPos5",
];

/** Modo de jogo do banco → CHAVE de tradução (namespace "lobbies"). */
export const GAME_MODE_TRANS_KEYS: Record<string, string> = {
  all_pick: "modeAllPick",
  captains_mode: "modeCaptainsMode",
  random_draft: "modeRandomDraft",
  single_draft: "modeSingleDraft",
};
