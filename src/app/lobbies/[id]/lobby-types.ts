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

/**
 * Hover educacional por POS — papel da posição na metodologia da Fórmula.
 * Fontes: docs/foundations/METHODOLOGY.md §2 (metas Core 500 GPM / Suporte
 * 250 GPM, KDA não é performance), §8 (simulador de herói);
 * METODOLOGIA_FUNDAMENTOS.md L3 (lado do mapa / terreno elevado);
 * src/lib/doctrine.ts princípio 10 (Mid = corrida do nível).
 */
export const SLOT_ROLE_TOOLTIPS: readonly string[] = [
  "Hard Carry — Core com prioridade máxima de farm. Meta da Fórmula: 5.000 de ouro aos 10 min, 10.000 aos 20 (500 GPM).",
  "Mid — Core que dita o tempo do jogo: XP solo, até 1 nível por minuto — a corrida do nível. Meta de Core: 500 GPM.",
  "Offlane — Core de pressão e espaço: tomar a 1ª torre da trilha vulnerável abre farm e entrega o terreno elevado. Quem tem a visão dá o primeiro tiro.",
  "Suporte 4 — rotações servindo objetivos do mapa, nunca simulador de herói. Meta de suporte: 2.500 de ouro aos 10 min (250 GPM).",
  "Suporte 5 — sacrifício pelo time. KDA não define performance: um suporte 2/3/15 com 5.000 de ouro aos 20 min jogou a função dele.",
];

export const GAME_MODE_LABELS: Record<string, string> = {
  all_pick: "Escolha livre",
  captains_mode: "Modo capitães",
  random_draft: "Seleção aleatória",
  single_draft: "Escolha única",
};
