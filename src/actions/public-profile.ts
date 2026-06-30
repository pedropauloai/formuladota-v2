"use server";

// Dados PÚBLICOS de perfil pro <UserHoverCard>. Vem do RPC get_public_mini_profile
// (migration 064, SECURITY DEFINER) — só o subconjunto público + status de amizade.

import { createClient } from "@/lib/supabase/server";

export type FriendStatus = "none" | "pending" | "friends" | "blocked" | "self";

export interface PublicMiniProfile {
  userId: string;
  name: string;
  avatar: string | null;
  steamId64: string | null;
  level: number;
  mmr: number | null;
  /** Rank Valve real (career.rankTier — STRATZ/OpenDota). Medalha SKILL canônica. */
  rankTier: number | null;
  leaderboardRank: number | null;
  /** Vitórias/derrotas de carreira (cache STRATZ) — pro winrate do card. */
  careerWins: number | null;
  careerLosses: number | null;
  /** Recado do perfil (status_message) e presença (último visto). */
  statusMessage: string | null;
  lastSeenAt: string | null;
  favoriteHeroes: string[];
  friendStatus: FriendStatus;
}

const STATUSES: FriendStatus[] = ["none", "pending", "friends", "blocked", "self"];

export async function getPublicMiniProfile(
  userId: string
): Promise<PublicMiniProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_mini_profile", {
    p_user_id: userId,
  });
  const r = (data ?? [])[0];
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
    rankTier: r.rank_tier,
    leaderboardRank: r.leaderboard_rank,
    careerWins: r.career_wins,
    careerLosses: r.career_losses,
    statusMessage: r.status_message,
    lastSeenAt: r.last_seen_at,
    favoriteHeroes: Array.isArray(r.favorite_heroes)
      ? (r.favorite_heroes as string[])
      : [],
    friendStatus,
  };
}
