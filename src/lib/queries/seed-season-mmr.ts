import "server-only";

// Semente de MMR de temporada pela medalha Valve — chamada no VÍNCULO Steam.
//
// BUG que isto resolve: seedMmrFromRankTier existia mas NADA a chamava no
// vínculo → 42 usuários sem linha em player_season_mmr → medalha FORMULADOTA
// errada/placeholder no card de aceitar partida e no mini perfil. Agora todo
// vínculo semeia a season ativa. (O backfill dos existentes foi na migration 126.)

import { createServiceClient } from "@/lib/supabase/service";
import { fetchCareerStats } from "@/lib/dota/career";
import { steam64To32 } from "@/lib/dota/opendota";
import { seedMmrFromRankTier, STARTING_MMR } from "@/lib/mmr";

export interface SeedResult {
  seeded: boolean;
  reason?: string;
  seed?: number;
  rankTier?: number | null;
}

/**
 * Semeia player_season_mmr (season ativa) + profiles.mmr_inicial/mmr_atual pela
 * medalha Valve. Idempotente (já tem linha na season → no-op). Best-effort:
 * qualquer falha retorna { seeded:false } sem lançar — nunca quebra o vínculo.
 *
 * @param fetchCareer busca o career na OpenDota se ainda não estiver em cache
 *   (grava user_stats_extended.career de brinde). Deixe true no vínculo.
 */
export async function seedSeasonMmrForUser(
  userId: string,
  opts: { fetchCareer?: boolean } = {}
): Promise<SeedResult> {
  const { fetchCareer = true } = opts;
  const service = createServiceClient();
  try {
    const { data: season } = await service
      .from("seasons")
      .select("id")
      .eq("active", true)
      .maybeSingle();
    if (!season) return { seeded: false, reason: "no_active_season" };

    // Já semeado nesta season? Nada a fazer.
    const { data: existing } = await service
      .from("player_season_mmr")
      .select("user_id")
      .eq("user_id", userId)
      .eq("season_id", season.id)
      .maybeSingle();
    if (existing) return { seeded: false, reason: "already_seeded" };

    const { data: link } = await service
      .from("steam_links")
      .select("steam_id_64")
      .eq("user_id", userId)
      .maybeSingle();
    if (!link?.steam_id_64) return { seeded: false, reason: "no_steam" };

    // rankTier: cache (user_stats_extended.career) primeiro; senão OpenDota.
    const { data: ext } = await service
      .from("user_stats_extended")
      .select("career")
      .eq("user_id", userId)
      .maybeSingle();
    let rankTier: number | null =
      (ext?.career as { rankTier?: number | null } | null)?.rankTier ?? null;

    if (rankTier == null && fetchCareer) {
      const stats = await fetchCareerStats(steam64To32(link.steam_id_64));
      if (stats) {
        rankTier = stats.rankTier;
        await service.from("user_stats_extended").upsert(
          {
            user_id: userId,
            career: stats,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id" }
        );
      }
    }

    // Sem rank público legível → base (descalibrado), conforme a regra.
    const seed = seedMmrFromRankTier(rankTier) ?? STARTING_MMR;

    const { error: insErr } = await service.from("player_season_mmr").insert({
      user_id: userId,
      season_id: season.id,
      mmr: seed,
      peak_mmr: seed,
      calibrated: false,
    } as never);
    if (insErr) {
      // 23505 = corrida (outra request semeou entre o SELECT e o INSERT) — ok.
      if (insErr.code === "23505") return { seeded: false, reason: "already_seeded" };
      return { seeded: false, reason: insErr.message };
    }

    // profiles.mmr_* só se estiverem NULL (não clobber de MMR já existente).
    await service
      .from("profiles")
      .update({ mmr_inicial: seed, mmr_atual: seed } as never)
      .eq("id", userId)
      .is("mmr_atual", null);

    return { seeded: true, seed, rankTier };
  } catch (err) {
    console.error("[seedSeasonMmr] falha:", (err as Error).message);
    return { seeded: false, reason: "exception" };
  }
}
