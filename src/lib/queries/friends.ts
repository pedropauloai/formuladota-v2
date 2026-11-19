// Queries de friendships pra Server Components (pacote social 2026-06-12).
// RLS já filtra por auth.uid() — sem necessidade de WHERE manual além de status.
//
// A regra de profiles só mostra a própria linha (e as de admin e coaches), então nada aqui lê
// profiles dos amigos: nome e avatar vêm da identidade pública (getIdentityMap) e o "visto há"
// e o recado vêm de my_friends_presence (migration 168).

import { createClient } from "@/lib/supabase/server";
import { xpProgress } from "@/lib/levels";
import { getIdentityMap } from "@/lib/queries/identities";
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
  /** Progresso 0..1 do nível atual — pro anel de XP preencher. */
  friendXpPct: number;
  friendLastSeenAt: string | null;
  friendStatusMessage: string | null;
  // direction: "outgoing" se eu fiz o pedido; "incoming" se recebi
  direction: "outgoing" | "incoming";
  status: "pending" | "accepted" | "rejected" | "blocked";
  createdAt: string;
  /** Snapshot do que o amigo está fazendo (fila de PRO / sala). Null = nada. */
  context: FriendContext | null;
}

/** Linha de my_friends_presence ("visto há" e recado de cada amigo). */
type PresenceRow = { user_id: string; last_seen_at: string | null; status_message: string | null };

/** Dados do painel de amigos do shell — 1 chamada, tudo em batch. */
export interface FriendsPanelData {
  /** Amizades aceitas (com contexto ao vivo). */
  friends: FriendListEntry[];
  /** Pedidos pendentes — recebidos (incoming) E enviados (outgoing). */
  pending: FriendListEntry[];
}

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
    .select("id, status, created_at, requester_id, addressee_id")
    .in("status", ["accepted", "pending"])
    .order("created_at", { ascending: false });

  const friendships = rows ?? [];
  const friendIdOf = (r: (typeof friendships)[number]) =>
    r.requester_id === user.id ? r.addressee_id : r.requester_id;

  const acceptedIds = friendships
    .filter((r) => r.status === "accepted")
    .map(friendIdOf);

  const friendIds = friendships.map(friendIdOf);

  // Nome e avatar pela identidade pública e "visto há" pela função dos amigos: a regra de profiles
  // esconde a linha dos outros, então ler profiles aqui só funcionava para o admin.
  const [identityMap, presenceRes, contextMap, levelsRes] = await Promise.all([
    getIdentityMap(supabase, friendIds),
    supabase.rpc("my_friends_presence"),
    getFriendContextMap(supabase, acceptedIds),
    friendIds.length
      ? supabase.from("user_levels").select("user_id, total_xp_earned").in("user_id", friendIds)
      : Promise.resolve({ data: [] as { user_id: string; total_xp_earned: number }[] }),
  ]);
  const presenceRows = (presenceRes.data ?? []) as PresenceRow[];
  const presenceMap = new Map(presenceRows.map((p) => [p.user_id, p]));
  // Nível E progresso do anel da MESMA fonte (total_xp_earned → xpProgress).
  const xpMap = new Map(
    (levelsRes.data ?? []).map((l) => [l.user_id, xpProgress(l.total_xp_earned ?? 0)])
  );

  const friends: FriendListEntry[] = [];
  const pending: FriendListEntry[] = [];

  for (const row of friendships) {
    const friendId = friendIdOf(row);
    const direction = row.requester_id === user.id ? "outgoing" : "incoming";
    const ident = identityMap.get(friendId);
    const presence = presenceMap.get(friendId);

    const entry: FriendListEntry = {
      friendshipId: row.id,
      friendUserId: friendId,
      friendUsername: ident?.name ?? null,
      friendAvatarUrl: ident?.avatarUrl ?? null,
      friendLevel: xpMap.get(friendId)?.level ?? 1,
      friendXpPct: xpMap.get(friendId)?.pct ?? 0,
      friendLastSeenAt: presence?.last_seen_at ?? null,
      friendStatusMessage: presence?.status_message ?? null,
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
