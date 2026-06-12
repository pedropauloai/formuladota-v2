"use server";

// Server Actions de fetch — usadas pelo PlayPanel (Client Component) pra carregar
// lista de salas e detalhes de uma sala específica sem ter rota /lobbies separada.

import { createClient } from "@/lib/supabase/server";
import { xpProgress, getGatedTierForLevel } from "@/lib/levels";
import type { LobbyData, PlayerSlot } from "./[id]/lobby-types";

export interface LobbyListItem {
  id: string;
  name: string;
  game_mode: string;
  status: string;
  max_players: number;
  created_at: string;
  player_count: number;
}

export interface LobbyRoomData {
  lobby: LobbyData;
  players: PlayerSlot[];
  currentUserId: string;
  isLeader: boolean;
  leaderUsername: string;
}

export async function fetchOpenLobbies(): Promise<LobbyListItem[]> {
  const supabase = await createClient();
  const { data: lobbies } = await supabase
    .from("lobbies")
    .select("id, name, game_mode, status, max_players, created_at")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(100);

  const ids = (lobbies ?? []).map((l) => l.id);
  // Contagem real de jogadores por sala (pra coluna "Vagas" X/N).
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: players } = await supabase
      .from("lobby_players")
      .select("lobby_id")
      .in("lobby_id", ids);
    for (const p of players ?? []) {
      counts.set(p.lobby_id, (counts.get(p.lobby_id) ?? 0) + 1);
    }
  }

  return (lobbies ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    game_mode: l.game_mode,
    status: l.status,
    max_players: l.max_players,
    created_at: l.created_at,
    player_count: counts.get(l.id) ?? 0,
  }));
}

export async function fetchLobbyRoom(lobbyId: string): Promise<LobbyRoomData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: lobby } = await supabase
    .from("lobbies")
    .select(
      "id, name, password, game_mode, status, max_players, created_by, steam_lobby_id, mmr_target_min, mmr_target_max, created_at, started_at"
    )
    .eq("id", lobbyId)
    .single();
  if (!lobby) return null;

  const { data: playersData } = await supabase
    .from("lobby_players")
    .select("user_id, team, joined_at, slot")
    .eq("lobby_id", lobbyId);

  const playerIds = (playersData ?? []).map((p) => p.user_id);
  // Leitura extra (read-model, zero lógica de domínio): MMR + XP total pra
  // renderizar medalha HONOR e MMR em gold nos slots da sala (ref do client Dota).
  const [{ data: profiles }, { data: levels }] = playerIds.length > 0
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url, mmr_atual")
          .in("id", playerIds),
        supabase
          .from("user_levels")
          .select("user_id, total_xp_earned")
          .in("user_id", playerIds),
      ])
    : [{ data: [] }, { data: [] }];

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const levelMap = new Map(
    (levels ?? []).map((l) => [l.user_id, l.total_xp_earned])
  );
  const players: PlayerSlot[] = (playersData ?? []).map((p) => {
    const prof = profileMap.get(p.user_id);
    const { level } = xpProgress(levelMap.get(p.user_id) ?? 0);
    return {
      userId: p.user_id,
      team: p.team as "radiant" | "dire" | "spectator",
      slot: p.slot ?? null,
      joinedAt: p.joined_at,
      username: prof?.username ?? "Anônimo",
      avatarUrl: prof?.avatar_url ?? null,
      mmr: prof?.mmr_atual ?? null,
      honorRank: getGatedTierForLevel(level, prof?.mmr_atual ?? null),
    };
  });

  const { data: leaderProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", lobby.created_by)
    .single();

  return {
    lobby: {
      id: lobby.id,
      name: lobby.name,
      password: lobby.password,
      gameMode: lobby.game_mode,
      status: lobby.status,
      maxPlayers: lobby.max_players,
      steamLobbyId: lobby.steam_lobby_id,
      createdBy: lobby.created_by,
      startedAt: lobby.started_at,
    },
    players,
    currentUserId: user.id,
    isLeader: lobby.created_by === user.id,
    leaderUsername: leaderProfile?.username ?? "—",
  };
}
