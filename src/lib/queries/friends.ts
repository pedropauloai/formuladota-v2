// Queries de friendships pra Server Components (pacote social 2026-06-12).
// RLS já filtra por auth.uid() — sem necessidade de WHERE manual além de status.
//
// IMPORTANTE (RLS de profiles é restritiva — só próprio/admin/coaches): o embed
// `profiles` pode voltar NULL pra viewers comuns. Por isso a identidade do amigo
// é resolvida via batch em steam_links (SELECT público, migration 054) — o embed
// de profiles só ENRIQUECE (last_seen, status_message, fallback Discord) quando
// o viewer tem permissão. Nunca descartamos um amigo por embed nulo.

import { createClient } from "@/lib/supabase/server";
import { displayAvatar, displayName } from "@/lib/identity";
import { getSteamIdentityMap } from "@/lib/queries/identities";
import {
  getFriendContextMap,
  type FriendContext,
} from "@/lib/queries/friends-context";

export interface FriendListEntry {
  friendshipId: string;
  friendUserId: string;
  friendUsername: string | null;
  friendAvatarUrl: string | null;
  /** Nível da conta (0-30) — pro XpAvatarRing. */
  friendLevel: number;
  friendLastSeenAt: string | null;
  friendStatusMessage: string | null;
  // direction: "outgoing" se eu fiz o pedido; "incoming" se recebi
  direction: "outgoing" | "incoming";
  status: "pending" | "accepted" | "rejected" | "blocked";
  createdAt: string;
  /** Snapshot do que o amigo está fazendo (fila de PRO / sala). Null = nada. */
  context: FriendContext | null;
}

/** Dados do painel de amigos do shell — 1 chamada, tudo em batch. */
export interface FriendsPanelData {
  /** Amizades aceitas (com contexto ao vivo). */
  friends: FriendListEntry[];
  /** Pedidos pendentes — recebidos (incoming) E enviados (outgoing). */
  pending: FriendListEntry[];
}

type ProfileFragment = {
  username: string | null;
  avatar_url: string | null;
  avatar_custom_url: string | null;
  last_seen_at: string | null;
  status_message: string | null;
} | null;

const PROFILE_FIELDS =
  "username, avatar_url, avatar_custom_url, last_seen_at, status_message";

/**
 * Busca TODAS as friendships do user (accepted + pending) numa query só e
 * resolve identidade canônica (Steam > Discord) em batch. Contexto ao vivo
 * só pros aceitos.
 */
export async function getFriendsPanel(): Promise<FriendsPanelData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { friends: [], pending: [] };

  const { data: rows } = await supabase
    .from("friendships")
    .select(
      `
      id, status, created_at, requester_id, addressee_id,
      requester:profiles!friendships_requester_id_fkey (${PROFILE_FIELDS}),
      addressee:profiles!friendships_addressee_id_fkey (${PROFILE_FIELDS})
    `
    )
    .in("status", ["accepted", "pending"])
    .order("created_at", { ascending: false });

  const friendships = rows ?? [];
  const friendIdOf = (r: (typeof friendships)[number]) =>
    r.requester_id === user.id ? r.addressee_id : r.requester_id;

  const acceptedIds = friendships
    .filter((r) => r.status === "accepted")
    .map(friendIdOf);

  const friendIds = friendships.map(friendIdOf);

  // Identidade Steam (batch público) + contexto ao vivo + níveis (batch) em paralelo.
  const [steamMap, contextMap, levelsRes] = await Promise.all([
    getSteamIdentityMap(supabase, friendIds),
    getFriendContextMap(supabase, acceptedIds),
    friendIds.length
      ? supabase.from("user_levels").select("user_id, current_level").in("user_id", friendIds)
      : Promise.resolve({ data: [] as { user_id: string; current_level: number }[] }),
  ]);
  const levelMap = new Map(
    (levelsRes.data ?? []).map((l) => [l.user_id, l.current_level])
  );

  const friends: FriendListEntry[] = [];
  const pending: FriendListEntry[] = [];

  for (const row of friendships) {
    const friendId = friendIdOf(row);
    const direction = row.requester_id === user.id ? "outgoing" : "incoming";
    // Embed do LADO do amigo (pode ser null se a RLS de profiles bloquear).
    const prof = (
      direction === "outgoing" ? row.addressee : row.requester
    ) as unknown as ProfileFragment;
    const steam = steamMap.get(friendId);

    const src = {
      steamPersona: steam?.persona,
      steamAvatar: steam?.avatarUrl,
      discordUsername: prof?.username,
      discordAvatar: prof?.avatar_custom_url ?? prof?.avatar_url,
    };

    const entry: FriendListEntry = {
      friendshipId: row.id,
      friendUserId: friendId,
      friendUsername: displayName(src),
      friendAvatarUrl: displayAvatar(src),
      friendLevel: levelMap.get(friendId) ?? 1,
      friendLastSeenAt: prof?.last_seen_at ?? null,
      friendStatusMessage: prof?.status_message ?? null,
      direction,
      status: row.status as FriendListEntry["status"],
      createdAt: row.created_at,
      context:
        row.status === "accepted" ? (contextMap.get(friendId) ?? null) : null,
    };

    if (row.status === "accepted") friends.push(entry);
    else pending.push(entry);
  }

  // Aceitos por nome (estável); pendentes já vêm por created_at desc.
  friends.sort((a, b) =>
    (a.friendUsername ?? "").localeCompare(b.friendUsername ?? "", "pt-BR")
  );

  return { friends, pending };
}
