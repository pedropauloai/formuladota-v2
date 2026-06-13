// Read-models do convite pra sala (pacote social 2026-06-12 — missão 4).
//   - getMyOpenLobby: em qual sala ABERTA o user está (habilita "Convidar pra sala")
//   - getMyLobbyInvites: convites recebidos, com nome da sala + identidade do
//     convidante (Steam > Discord, batch — zero N+1)
//
// RLS: lobby_players/lobbies têm SELECT público; lobby_invites só participantes
// (migration 055); steam_links SELECT público (054).

import type { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface MyOpenLobby {
  id: string;
  name: string;
}

export interface LobbyInviteView {
  id: string;
  lobbyId: string;
  lobbyName: string;
  inviterName: string;
  inviterAvatarUrl: string | null;
}

/**
 * Sala com status 'open' em que o user está agora (null se nenhuma).
 * Só sala ABERTA habilita convite — in_progress não aceita mais jogadores.
 */
export async function getMyOpenLobby(
  supabase: ServerClient,
  userId: string
): Promise<MyOpenLobby | null> {
  const { data } = await supabase
    .from("lobby_players")
    .select("lobby_id, lobbies!inner(id, name, status)")
    .eq("user_id", userId)
    .eq("lobbies.status", "open")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const lobby = data.lobbies as unknown as { id: string; name: string } | null;
  return lobby ? { id: lobby.id, name: lobby.name } : null;
}

/**
 * Convites de sala recebidos pelo user, prontos pra exibir (nome da sala +
 * quem convidou). Convites de salas mortas/cheias são filtrados na leitura —
 * o FK cascade já limpa quando a sala é deletada.
 */
export async function getMyLobbyInvites(
  supabase: ServerClient,
  userId: string
): Promise<LobbyInviteView[]> {
  const { data: invites } = await supabase
    .from("lobby_invites")
    .select("id, lobby_id, inviter_id, created_at")
    .eq("invitee_id", userId)
    .order("created_at", { ascending: false });

  if (!invites || invites.length === 0) return [];

  const lobbyIds = [...new Set(invites.map((i) => i.lobby_id))];
  const inviterIds = [...new Set(invites.map((i) => i.inviter_id))];

  // Lobbies (só abertos valem) + identidade dos convidantes em paralelo.
  const [{ data: lobbies }, { data: profiles }, steamMap] = await Promise.all([
    supabase
      .from("lobbies")
      .select("id, name, status")
      .in("id", lobbyIds)
      .eq("status", "open"),
    // Best-effort: RLS de profiles pode bloquear — steam_links cobre o nome.
    supabase.from("profiles").select("id, username, avatar_url").in("id", inviterIds),
    getSteamIdentityMap(supabase, inviterIds),
  ]);

  const lobbyById = new Map((lobbies ?? []).map((l) => [l.id, l]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const views: LobbyInviteView[] = [];
  for (const inv of invites) {
    const lobby = lobbyById.get(inv.lobby_id);
    if (!lobby) continue; // sala fechou/encheu — convite morto, ignora
    const p = profileById.get(inv.inviter_id);
    const ident = resolveIdentity(steamMap, inv.inviter_id, p?.username, p?.avatar_url);
    views.push({
      id: inv.id,
      lobbyId: inv.lobby_id,
      lobbyName: lobby.name,
      inviterName: ident.name,
      inviterAvatarUrl: ident.avatarUrl,
    });
  }
  return views;
}
