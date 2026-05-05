"use server";

// Server Actions de fetch — usadas pelo PlayPanel (Client Component) pra carregar
// lista de salas e detalhes de uma sala específica sem ter rota /lobbies separada.

import { createClient } from "@/lib/supabase/server";

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
  lobby: {
    id: string;
    name: string;
    password: string;
    gameMode: string;
    status: string;
    maxPlayers: number;
    steamLobbyId: string | null;
    createdBy: string;
    startedAt: string | null;
  };
  players: {
    userId: string;
    team: "radiant" | "dire" | "spectator";
    joinedAt: string;
    username: string;
    avatarUrl: string | null;
  }[];
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

  return (lobbies ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    game_mode: l.game_mode,
    status: l.status,
    max_players: l.max_players,
    created_at: l.created_at,
    player_count: 0, // TODO Phase 6 — JOIN count(lobby_players)
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
    .select("user_id, team, joined_at")
    .eq("lobby_id", lobbyId);

  const playerIds = (playersData ?? []).map((p) => p.user_id);
  const { data: profiles } = playerIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", playerIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const players = (playersData ?? []).map((p) => {
    const prof = profileMap.get(p.user_id);
    return {
      userId: p.user_id,
      team: p.team as "radiant" | "dire" | "spectator",
      joinedAt: p.joined_at,
      username: prof?.username ?? "Anônimo",
      avatarUrl: prof?.avatar_url ?? null,
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
