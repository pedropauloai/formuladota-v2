"use server";

// Server Actions de perfil — Phase 7.
// syncPlayerStats: cacheia stats externos (Stratz/OpenDota) em user_stats_extended
// com TTL 24h. UPSERT não bloqueia render — caller pode chamar fire-and-forget.

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchPlayerStats, type PlayerStatsExtended } from "@/lib/stratz";
import { steam64To32 } from "@/lib/dota/opendota";
import {
  fetchCareerStats,
  parseCareerStats,
  type CareerStats,
} from "@/lib/dota/career";

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

  // Exige caller autenticado (server action é endpoint POST aberto). Não precisa ser o
  // dono do userId — perfis alheios sincronizam ao serem vistos — mas bloqueia disparo
  // anônimo do fetch externo (proteção do rate limit compartilhado OpenDota/Stratz).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

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
      "hero_winrates, avg_kda, avg_gpm, avg_xpm, avg_last_hits, avg_hero_damage, total_matches, total_wins, source, last_synced_at"
    )
    .eq("user_id", input.userId)
    .single();

  // Cache "fresh" só se também tiver as colunas novas (migration 073): caches
  // antigos (last hits/dano = null) são tratados como vencidos pra re-sincronizar
  // e popular os eixos novos do hexágono já na próxima visita.
  const hasNewCols =
    (cached as { avg_last_hits?: number | null } | null)?.avg_last_hits != null;
  const fresh =
    cached?.last_synced_at &&
    hasNewCols &&
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

  // UPSERT em user_stats_extended. avg_last_hits/avg_hero_damage são colunas novas
  // (migration 073), ainda fora dos tipos gerados → cast no row.
  const statsRow = {
    user_id: input.userId,
    hero_winrates: stats.topHeroes,
    avg_kda: stats.avgKDA,
    avg_gpm: stats.avgGPM,
    avg_xpm: stats.avgXPM,
    avg_last_hits: stats.avgLastHits,
    avg_hero_damage: stats.avgHeroDamage,
    total_matches: stats.totalMatches,
    total_wins: stats.totalWins,
    source: stats.source,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Escrita via service role: user_stats_extended ficou sem policy de escrita self
  // (migration 117 — usuário forjava career.rankTier). Os valores aqui vêm do fetch
  // externo (Stratz/OpenDota), não do input do usuário, então gravar via service é seguro.
  await createServiceClient()
    .from("user_stats_extended")
    .upsert(statsRow as never, { onConflict: "user_id" });

  return { success: true, cached: false, data: stats };
}

export type CareerSyncResult =
  | { success: true; data: CareerStats; cached: boolean }
  | { success: false; error: string };

/**
 * Sincroniza stats de CARREIRA (híbrido STRATZ + OpenDota, migration 051).
 * STRATZ = W/L total (inclui Turbo) + medalha season; OpenDota = heróis e
 * acumulados all-time. STRATZ fora do ar → valores OpenDota (ver fetchCareerStats).
 * Mesmo padrão do syncPlayerStats: TTL 24h, falha silenciosa, cache-first.
 *
 * Free tier OpenDota = 60 req/min → o TTL é a única proteção de rate limit.
 * Por isso o check de cache SEMPRE roda antes de qualquer fetch.
 */
export async function syncCareerStats(input: {
  userId: string;
  force?: boolean;
}): Promise<CareerSyncResult> {
  const supabase = await createClient();

  // Exige caller autenticado (ver syncPlayerStats): bloqueia disparo anônimo do fetch
  // externo sem impedir sync de perfil alheio.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Steam link primeiro — OpenDota só conhece account_id (derivado do Steam64)
  const { data: steamLink } = await supabase
    .from("steam_links")
    .select("steam_id_64")
    .eq("user_id", input.userId)
    .single();

  if (!steamLink?.steam_id_64) {
    return { success: false, error: "Steam não vinculado." };
  }

  // Cache check no jsonb career
  const { data: row } = await supabase
    .from("user_stats_extended")
    .select("career, last_synced_at")
    .eq("user_id", input.userId)
    .maybeSingle();

  const cachedCareer = parseCareerStats(row?.career);

  // TTL pelo syncedAt DENTRO do payload — last_synced_at é compartilhado com o
  // sync Stratz (syncPlayerStats) e usaria o relógio errado pro career.
  const fresh =
    cachedCareer !== null &&
    Date.now() - new Date(cachedCareer.syncedAt).getTime() < TTL_MS;

  if (fresh && !input.force && cachedCareer) {
    return { success: true, cached: true, data: cachedCareer };
  }

  // Fetch novo (4 endpoints em paralelo; falha → null)
  const stats = await fetchCareerStats(steam64To32(steamLink.steam_id_64));
  if (!stats) {
    // OpenDota fora do ar — cache vencido ainda é melhor que nada
    if (cachedCareer) {
      return { success: true, cached: true, data: cachedCareer };
    }
    return { success: false, error: "Sem dados de carreira disponíveis." };
  }

  // UPSERT só das colunas de career — não toca nas colunas do sync Stratz.
  // Via service role (migration 117 removeu a escrita self de user_stats_extended):
  // o career vem do fetch OpenDota/Stratz, não do input do usuário.
  await createServiceClient().from("user_stats_extended").upsert(
    {
      user_id: input.userId,
      career: stats,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id" }
  );

  return { success: true, cached: false, data: stats };
}

function cachedToData(row: {
  hero_winrates: unknown;
  avg_kda: number | null;
  avg_gpm: number | null;
  avg_xpm: number | null;
  avg_last_hits?: number | null;
  avg_hero_damage?: number | null;
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
    avgLastHits: Number(row.avg_last_hits ?? 0),
    avgHeroDamage: Number(row.avg_hero_damage ?? 0),
    topHeroes: heroes,
  };
}
