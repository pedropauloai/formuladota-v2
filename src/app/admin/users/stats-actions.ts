"use server";

// Backfill admin: sincroniza stats externos (carreira + KDA/GPM/XPM) de TODOS os
// usuários com Steam vinculada, de uma vez. Necessário porque o sync normal é lazy
// (só roda ao ver o perfil) E o write em user_stats_extended é RLS self — um viewer/
// admin não grava o cache de outro user pelo client normal. Aqui usamos o SERVICE
// client (bypass RLS), gated por is_admin — operação sistêmica de admin, no mesmo
// espírito do resto do /admin (que já lê via service client).
//
// Throttle entre usuários: free tier OpenDota = 60 req/min e cada carreira faz ~4
// chamadas. 1.2s/usuário mantém abaixo do limite.

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCareerStats } from "@/lib/dota/career";
import { fetchPlayerStats } from "@/lib/stratz";
import { steam64To32 } from "@/lib/dota/opendota";
import type { Database } from "@/types/database";

type StatsInsert = Database["public"]["Tables"]["user_stats_extended"]["Insert"];

export interface BackfillResult {
  total: number;
  synced: number;
  failed: number;
}

export async function backfillAllPlayerStats(): Promise<BackfillResult> {
  // Gate de admin via cookie client (a sessão decide quem pode disparar).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) throw new Error("Apenas admin");

  const service = createServiceClient();
  const { data: links } = await service
    .from("steam_links")
    .select("user_id, steam_id_64");

  const all = links ?? [];
  let synced = 0;
  let failed = 0;

  for (const link of all) {
    try {
      const acc32 = steam64To32(link.steam_id_64);
      const [career, stats] = await Promise.all([
        fetchCareerStats(acc32),
        fetchPlayerStats(link.steam_id_64),
      ]);

      if (!career && !stats) {
        failed++;
      } else {
        const now = new Date().toISOString();
        const payload: StatsInsert = {
          user_id: link.user_id,
          last_synced_at: now,
          updated_at: now,
        };
        // career/hero_winrates são jsonb — os tipos do app não têm index
        // signature de Json, daí o cast pontual (mesmo dado, formato compatível).
        if (career) payload.career = career as unknown as StatsInsert["career"];
        if (stats) {
          payload.hero_winrates = stats.topHeroes as unknown as StatsInsert["hero_winrates"];
          payload.avg_kda = stats.avgKDA;
          payload.avg_gpm = stats.avgGPM;
          payload.avg_xpm = stats.avgXPM;
          payload.total_matches = stats.totalMatches;
          payload.total_wins = stats.totalWins;
          payload.source = stats.source;
        }
        await service
          .from("user_stats_extended")
          .upsert(payload, { onConflict: "user_id" });
        synced++;
      }
    } catch {
      failed++;
    }
    // Throttle pro rate limit do OpenDota free tier.
    await new Promise((r) => setTimeout(r, 1200));
  }

  return { total: all.length, synced, failed };
}
