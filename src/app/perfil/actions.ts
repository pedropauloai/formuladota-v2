"use server";

// Server Actions de perfil — Phase 7.
// syncPlayerStats: cacheia stats externos (Stratz/OpenDota) em user_stats_extended
// com TTL 24h. UPSERT não bloqueia render — caller pode chamar fire-and-forget.

import { createClient } from "@/lib/supabase/server";
import { fetchPlayerStats, type PlayerStatsExtended } from "@/lib/stratz";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type SyncResult =
  | { success: true; data: PlayerStatsExtended; cached: boolean }
  | { success: false; error: string };

/**
 * Sincroniza stats externos de um user. Skip se cache fresh (< 24h) e !force.
 * Retorna sempre o estado atual (cache ou recém-fetched).
 */
export async function syncPlayerStats(input: {
  userId: string;
  force?: boolean;
}): Promise<SyncResult> {
  const supabase = await createClient();

  // Steam link primeiro — sem isso, sem stats externos
  const { data: steamLink } = await supabase
    .from("steam_links")
    .select("steam_id_64")
    .eq("user_id", input.userId)
    .single();

  if (!steamLink?.steam_id_64) {
    return { success: false, error: "Steam não vinculado." };
  }

  // Cache check
  const { data: cached } = await supabase
    .from("user_stats_extended")
    .select(
      "hero_winrates, avg_kda, avg_gpm, avg_xpm, total_matches, total_wins, source, last_synced_at"
    )
    .eq("user_id", input.userId)
    .single();

  const fresh =
    cached?.last_synced_at &&
    Date.now() - new Date(cached.last_synced_at).getTime() < TTL_MS;

  if (fresh && !input.force && cached) {
    return {
      success: true,
      cached: true,
      data: cachedToData(cached),
    };
  }

  // Fetch novo
  const stats = await fetchPlayerStats(steamLink.steam_id_64).catch(
    () => null
  );
  if (!stats) {
    // Sem stats externos — se tem cache antigo, retorna ele
    if (cached) {
      return { success: true, cached: true, data: cachedToData(cached) };
    }
    return { success: false, error: "Sem dados externos disponíveis." };
  }

  // UPSERT em user_stats_extended
  await supabase.from("user_stats_extended").upsert(
    {
      user_id: input.userId,
      hero_winrates: stats.topHeroes,
      avg_kda: stats.avgKDA,
      avg_gpm: stats.avgGPM,
      avg_xpm: stats.avgXPM,
      total_matches: stats.totalMatches,
      total_wins: stats.totalWins,
      source: stats.source,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return { success: true, cached: false, data: stats };
}

function cachedToData(row: {
  hero_winrates: unknown;
  avg_kda: number | null;
  avg_gpm: number | null;
  avg_xpm: number | null;
  total_matches: number | null;
  total_wins: number | null;
  source: string | null;
}): PlayerStatsExtended {
  const heroes = Array.isArray(row.hero_winrates)
    ? (row.hero_winrates as PlayerStatsExtended["topHeroes"])
    : [];
  return {
    source: (row.source === "opendota" ? "opendota" : "stratz") as
      | "stratz"
      | "opendota",
    totalMatches: row.total_matches ?? 0,
    totalWins: row.total_wins ?? 0,
    avgKDA: Number(row.avg_kda ?? 0),
    avgGPM: Number(row.avg_gpm ?? 0),
    avgXPM: Number(row.avg_xpm ?? 0),
    topHeroes: heroes,
  };
}
