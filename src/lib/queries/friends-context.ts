// Contexto AO VIVO dos amigos (pacote social 2026-06-12 — missão 5).
// Deriva, em BATCH (zero N+1), o que cada amigo está fazendo agora:
//   - "Na fila do {PRO}"  → coach_queue_entries com status 'waiting'
//   - "Em sala: {nome}"   → lobby_players JOIN lobbies (status open/in_progress)
//
// É um SNAPSHOT server-side: o refresh do realtime de presença NÃO re-deriva
// o contexto (decisão deliberada — atualiza no próximo render do shell).
//
// RLS amigável: coach_queue_entries ("fila visivel para todos"), lobby_players
// e lobbies têm SELECT público — funciona pra qualquer viewer logado.

import type { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** O que o amigo está fazendo agora (prioridade: fila de PRO > sala). */
export type FriendContext =
  | { kind: "queue"; proName: string }
  | { kind: "lobby"; lobbyId: string; lobbyName: string };

/**
 * Mapa user_id → contexto. Custo fixo: no máximo 5 queries pra QUALQUER
 * quantidade de amigos (entries + lobbies + coaches + profiles + steam batch).
 */
export async function getFriendContextMap(
  supabase: ServerClient,
  userIds: string[]
): Promise<Map<string, FriendContext>> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return new Map();

  // Fila de PRO + salas abertas em paralelo (1 query cada, .in() batch).
  const [queueRes, lobbyRes] = await Promise.all([
    supabase
      .from("coach_queue_entries")
      .select("user_id, coach_id")
      .in("user_id", ids)
      .eq("status", "waiting"),
    supabase
      .from("lobby_players")
      .select("user_id, lobby_id, lobbies!inner(id, name, status)")
      .in("user_id", ids)
      .in("lobbies.status", ["open", "in_progress"]),
  ]);

  // Nome do PRO de cada fila: coaches → profile_id → identidade Steam>Discord.
  const coachIds = [...new Set((queueRes.data ?? []).map((e) => e.coach_id))];
  const coachNameById = new Map<string, string>();
  if (coachIds.length > 0) {
    const { data: coaches } = await supabase
      .from("coaches")
      .select("id, profile_id")
      .in("id", coachIds);
    const profileIds = (coaches ?? []).map((c) => c.profile_id);
    // Profiles de coaches ativos têm SELECT público (migration 007).
    const [{ data: profiles }, steamMap] = await Promise.all([
      profileIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", profileIds)
        : Promise.resolve({ data: null }),
      getSteamIdentityMap(supabase, profileIds),
    ]);
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    for (const c of coaches ?? []) {
      const p = profileById.get(c.profile_id);
      const ident = resolveIdentity(steamMap, c.profile_id, p?.username, p?.avatar_url);
      coachNameById.set(c.id, ident.name);
    }
  }

  const map = new Map<string, FriendContext>();

  // Fila de PRO tem prioridade sobre sala (estar na fila é o estado mais "quente").
  for (const e of queueRes.data ?? []) {
    map.set(e.user_id, {
      kind: "queue",
      proName: coachNameById.get(e.coach_id) ?? "PRO",
    });
  }

  for (const row of lobbyRes.data ?? []) {
    if (map.has(row.user_id)) continue;
    // Embed !inner 1:1 — PostgREST tipa como objeto único.
    const lobby = row.lobbies as unknown as { id: string; name: string } | null;
    if (!lobby) continue;
    map.set(row.user_id, {
      kind: "lobby",
      lobbyId: lobby.id,
      lobbyName: lobby.name,
    });
  }

  return map;
}
