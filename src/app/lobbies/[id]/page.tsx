// /lobbies/[id] — sala aberta com 2 times (Radiant/Dire), 5 slots cada, chat,
// painel configurações lateral, e botão Iniciar Partida pro líder.
// Server Component que fetcha lobby + lobby_players + profiles dos membros.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { LobbyRoom } from "./lobby-room";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Lobby ${id.slice(0, 8)} — FORMULADOTA` };
}

export default async function LobbyDetailPage(props: PageProps) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lobby } = await supabase
    .from("lobbies")
    .select(
      "id, name, password, game_mode, status, max_players, created_by, steam_lobby_id, mmr_target_min, mmr_target_max, created_at, started_at"
    )
    .eq("id", id)
    .single();
  if (!lobby) notFound();

  const { data: playersData } = await supabase
    .from("lobby_players")
    .select("user_id, team, joined_at")
    .eq("lobby_id", id);

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

  // Líder é o created_by — se for current user, mostra controles avançados
  const isLeader = lobby.created_by === user.id;

  // Username do líder pra exibir no header
  const { data: leaderProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", lobby.created_by)
    .single();

  return (
    <ClientShell
      currentRoute="/lobbies"
      wideRightSidebar
      centerHero="https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background3.png"
      rightSidebar={
        <LobbyRoom
          lobby={{
            id: lobby.id,
            name: lobby.name,
            password: lobby.password,
            gameMode: lobby.game_mode,
            status: lobby.status,
            maxPlayers: lobby.max_players,
            steamLobbyId: lobby.steam_lobby_id,
            createdBy: lobby.created_by,
            startedAt: lobby.started_at,
          }}
          players={players}
          currentUserId={user.id}
          isLeader={isLeader}
          leaderUsername={leaderProfile?.username ?? "—"}
        />
      }
    >
      {null}
    </ClientShell>
  );
}
