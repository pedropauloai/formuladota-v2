// Queries de friendships pra Server Components.
// RLS já filtra por auth.uid() — sem necessidade de WHERE manual além de status.

import { createClient } from "@/lib/supabase/server";

export interface FriendListEntry {
  friendshipId: string;
  friendUserId: string;
  friendUsername: string | null;
  friendAvatarUrl: string | null;
  friendLastSeenAt: string | null;
  friendStatusMessage: string | null;
  // direction: "outgoing" se eu fiz o pedido; "incoming" se recebi
  direction: "outgoing" | "incoming";
  status: "pending" | "accepted" | "rejected" | "blocked";
  createdAt: string;
}

type ProfileFragment = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  avatar_custom_url: string | null;
  last_seen_at: string | null;
  status_message: string | null;
};

/**
 * Retorna lista de amigos COM STATUS ACCEPTED do user logado.
 * Inclui dados do profile do amigo via JOIN. Ignora status 'blocked'.
 */
export async function getAcceptedFriends(): Promise<FriendListEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Faz duas queries paralelas (Supabase não tem OR em foreign key embeds)
  const [outgoing, incoming] = await Promise.all([
    supabase
      .from("friendships")
      .select(
        `
        id,
        status,
        created_at,
        friend:profiles!friendships_addressee_id_fkey (
          id, username, avatar_url, avatar_custom_url, last_seen_at, status_message
        )
      `
      )
      .eq("requester_id", user.id)
      .eq("status", "accepted"),
    supabase
      .from("friendships")
      .select(
        `
        id,
        status,
        created_at,
        friend:profiles!friendships_requester_id_fkey (
          id, username, avatar_url, avatar_custom_url, last_seen_at, status_message
        )
      `
      )
      .eq("addressee_id", user.id)
      .eq("status", "accepted"),
  ]);

  const merged: FriendListEntry[] = [];

  for (const row of outgoing.data ?? []) {
    const f = row.friend as unknown as ProfileFragment | null;
    if (!f) continue;
    merged.push({
      friendshipId: row.id,
      friendUserId: f.id,
      friendUsername: f.username,
      friendAvatarUrl: f.avatar_custom_url ?? f.avatar_url,
      friendLastSeenAt: f.last_seen_at,
      friendStatusMessage: f.status_message,
      direction: "outgoing",
      status: row.status as FriendListEntry["status"],
      createdAt: row.created_at,
    });
  }

  for (const row of incoming.data ?? []) {
    const f = row.friend as unknown as ProfileFragment | null;
    if (!f) continue;
    merged.push({
      friendshipId: row.id,
      friendUserId: f.id,
      friendUsername: f.username,
      friendAvatarUrl: f.avatar_custom_url ?? f.avatar_url,
      friendLastSeenAt: f.last_seen_at,
      friendStatusMessage: f.status_message,
      direction: "incoming",
      status: row.status as FriendListEntry["status"],
      createdAt: row.created_at,
    });
  }

  return merged;
}

/**
 * Retorna pedidos PENDING que esperam ação do user logado (incoming pending).
 */
export async function getPendingRequests(): Promise<FriendListEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("friendships")
    .select(
      `
      id,
      status,
      created_at,
      friend:profiles!friendships_requester_id_fkey (
        id, username, avatar_url, avatar_custom_url, last_seen_at, status_message
      )
    `
    )
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const f = row.friend as unknown as ProfileFragment;
    return {
      friendshipId: row.id,
      friendUserId: f.id,
      friendUsername: f.username,
      friendAvatarUrl: f.avatar_custom_url ?? f.avatar_url,
      friendLastSeenAt: f.last_seen_at,
      friendStatusMessage: f.status_message,
      direction: "incoming" as const,
      status: row.status as FriendListEntry["status"],
      createdAt: row.created_at,
    };
  });
}
