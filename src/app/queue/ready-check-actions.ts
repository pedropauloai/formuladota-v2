"use server";

// Ready check (proposta de partida) — server actions. A proposta nasce no
// try_form_match quando 10 fecham; cada jogador aceita; os 10 aceitando → lobby.
// Migration 067.

import { createClient } from "@/lib/supabase/server";
import { xpProgress } from "@/lib/levels";

export interface ProposalMember {
  userId: string;
  name: string;
  avatar: string | null;
  team: "radiant" | "dire";
  role: string;
  accepted: boolean;
  isTest: boolean;
  /** Rank Valve real (medalha SKILL) + nível (medalha HONRA). */
  rankTier: number | null;
  leaderboardRank: number | null;
  level: number;
  /** Progresso 0..1 do nível atual — pro anel de XP preencher. */
  xpPct: number;
  /** MMR FORMULADOTA da season (fallback de medalha quando não há rank Valve). */
  seasonMmr: number | null;
}

export interface MatchProposal {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  expiresAt: string;
  lobbyId: string | null;
  members: ProposalMember[];
}

interface RawMember {
  user_id: string;
  name?: string;
  avatar?: string | null;
  team?: string;
  role?: string;
  accepted?: boolean;
  is_test?: boolean;
  rank_tier?: number | null;
  leaderboard_rank?: number | null;
  level?: number | null;
  total_xp?: number | null;
  season_mmr?: number | null;
}

function mapMembers(assignments: unknown): ProposalMember[] {
  const arr = Array.isArray(assignments) ? (assignments as RawMember[]) : [];
  return arr.map((m) => ({
    userId: m.user_id,
    name: m.name ?? "Jogador",
    avatar: m.avatar ?? null,
    team: m.team === "dire" ? "dire" : "radiant",
    role: m.role ?? "",
    accepted: m.accepted === true,
    isTest: m.is_test === true,
    rankTier: m.rank_tier ?? null,
    leaderboardRank: m.leaderboard_rank ?? null,
    level: m.level ?? 1,
    xpPct: xpProgress(m.total_xp ?? 0).pct,
    seasonMmr: m.season_mmr ?? null,
  }));
}

/** Proposta PENDENTE em que o user está (RLS de membership filtra). null = nenhuma. */
export async function getMyProposal(): Promise<MatchProposal | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("match_proposals")
    .select("id, status, expires_at, lobby_id, assignments")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    status: data.status as MatchProposal["status"],
    expiresAt: data.expires_at,
    lobbyId: data.lobby_id,
    members: mapMembers(data.assignments),
  };
}

/** Aceita. Retorna lobbyId quando o aceite fecha os 10 (todos aceitos). */
export async function acceptMatchProposal(id: string): Promise<{ lobbyId: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("accept_match_proposal", { p_id: id });
  return { lobbyId: typeof data === "string" ? data : null };
}

/** Recusa. Cancela a proposta; quem aceitou re-fila; quem recusou leva cooldown. */
export async function declineMatchProposal(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("decline_match_proposal", { p_id: id });
}

/**
 * ID da rota da partida: a URL canônica é /partida/[dota_match_id] — o ID real da
 * Valve, que no lobby de liga o bot grava junto com o steam_lobby_id, poucos
 * segundos após criar o lobby. Enquanto o bot não gravou, routeId vem null (o
 * overlay continua mostrando "criando lobby"). Após o timeout o caller cai pro id
 * interno (a página resolve dota_match_id, steam_lobby_id legado e UUID).
 */
export async function getMatchRouteId(
  lobbyId: string
): Promise<{ routeId: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lobbies")
    .select("dota_match_id")
    .eq("id", lobbyId)
    .maybeSingle();
  return { routeId: data?.dota_match_id ?? null };
}

/** Status da fila do bot pra um lobby que aguarda criação (migration 156). */
export interface LobbyQueueStatus {
  /** O lobby ainda aguarda o bot? false = já criado / não aplicável. */
  inQueue: boolean;
  /** O bot está montando ESTE lobby agora (é a vez dele)? */
  creatingNow: boolean;
  /** Posição na fila (1 = criando agora / próximo). */
  position: number;
  /** Quantos lobbies estão na frente do meu. */
  ahead: number;
  /** Instante estimado (pior caso) em que o bot chega no meu lobby. null = agora. */
  estReadyAt: string | null;
}

/**
 * Posição do lobby na fila do bot Steam único. Como só há 1 conta Steam, partidas
 * simultâneas são serializadas; isto expõe quanto falta pro jogador não esperar às
 * cegas. Estimativa é PIOR CASO (cada lobby pode segurar o bot por até 10 min).
 */
export async function getLobbyQueueStatus(lobbyId: string): Promise<LobbyQueueStatus> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_lobby_queue_status", { p_lobby_id: lobbyId });
  const d = (data ?? {}) as Record<string, unknown>;
  if (d.in_queue !== true) {
    return { inQueue: false, creatingNow: false, position: 0, ahead: 0, estReadyAt: null };
  }
  return {
    inQueue: true,
    creatingNow: d.creating_now === true,
    position: typeof d.position === "number" ? d.position : 1,
    ahead: typeof d.ahead === "number" ? d.ahead : 0,
    estReadyAt: typeof d.est_ready_at === "string" ? d.est_ready_at : null,
  };
}
