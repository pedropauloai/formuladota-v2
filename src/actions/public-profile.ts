"use server";

// Dados PÚBLICOS de perfil pro <UserHoverCard>. Vem do RPC get_public_mini_profile
// (migration 064, SECURITY DEFINER) — só o subconjunto público + status de amizade.
// (cast: RPC ainda fora dos tipos gerados — regenerar após aplicar a 064)

import { createClient } from "@/lib/supabase/server";

export type FriendStatus = "none" | "pending" | "friends" | "blocked" | "self";

export interface PublicMiniProfile {
  userId: string;
  name: string;
  avatar: string | null;
  steamId64: string | null;
  level: number;
  mmr: number | null;
  favoriteHeroes: string[];
  friendStatus: FriendStatus;
}

interface Row {
  user_id: string;
  name: string;
  avatar: string | null;
  steam_id_64: string | null;
  level: number;
  mmr: number | null;
  favorite_heroes: unknown;
  friend_status: string;
}

const STATUSES: FriendStatus[] = ["none", "pending", "friends", "blocked", "self"];

export async function getPublicMiniProfile(
  userId: string
): Promise<PublicMiniProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_mini_profile" as never, {
    p_user_id: userId,
  } as never);
  const rows = (data ?? []) as Row[];
  const r = rows[0];
  if (!r) return null;

  const friendStatus = (
    STATUSES.includes(r.friend_status as FriendStatus) ? r.friend_status : "none"
  ) as FriendStatus;

  return {
    userId: r.user_id,
    name: r.name,
    avatar: r.avatar,
    steamId64: r.steam_id_64,
    level: r.level,
    mmr: r.mmr,
    favoriteHeroes: Array.isArray(r.favorite_heroes)
      ? (r.favorite_heroes as string[])
      : [],
    friendStatus,
  };
}
