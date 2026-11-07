// Prova ao vivo da vitrine: a medalha, a posição no ranking e os números de Tinker do Pedro,
// lidos do cache de carreira do perfil dele (STRATZ + OpenDota, o mesmo do perfil do site).
// A visita só lê o banco; quem renova o cache é o cron de cada minuto, no máximo a cada 6 horas.

import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCareerStats, parseCareerStats } from "@/lib/dota/career";
import { steam64To32 } from "@/lib/dota/opendota";
import type { Json } from "@/types/database";

// Perfil de coach do dono da loja: dele saem a conta Steam e o cache de carreira.
const OWNER_COACH_SLUG = "pedro-paulo";
const TINKER_HERO_ID = 34;
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;
const RETRY_EVERY_MINUTES = 10;

export interface OwnerProof {
  avatarUrl: string | null;
  /** account_id da Valve (32 bits), para o link conferível no OpenDota. */
  accountId: number | null;
  rankTier: number | null;
  leaderboardRank: number | null;
  totalGames: number;
  tinkerGames: number | null;
  tinkerWins: number | null;
  syncedAt: string;
}

async function findOwner() {
  const supabase = createServiceClient();
  const { data: coach } = await supabase.from("coaches").select("profile_id").eq("slug", OWNER_COACH_SLUG).maybeSingle();
  if (!coach?.profile_id) return null;
  const [{ data: link }, { data: profile }, { data: stats }] = await Promise.all([
    supabase.from("steam_links").select("steam_id_64, avatar_url").eq("user_id", coach.profile_id).maybeSingle(),
    supabase.from("profiles").select("avatar_url").eq("id", coach.profile_id).maybeSingle(),
    supabase.from("user_stats_extended").select("career").eq("user_id", coach.profile_id).maybeSingle(),
  ]);
  return {
    userId: coach.profile_id,
    steamId64: link?.steam_id_64 ?? null,
    // A credencial é da conta do Dota: avatar da Steam primeiro (o do Discord muda de endereço).
    avatarUrl: link?.avatar_url ?? profile?.avatar_url ?? null,
    career: parseCareerStats(stats?.career),
  };
}

export const getOwnerProof = cache(async (): Promise<OwnerProof | null> => {
  try {
    const owner = await findOwner();
    if (!owner?.career) return null;
    const { career } = owner;
    const tinker = career.topHeroes.find((h) => h.heroId === TINKER_HERO_ID);
    return {
      avatarUrl: owner.avatarUrl,
      accountId: owner.steamId64 ? steam64To32(owner.steamId64) : null,
      rankTier: career.rankTier,
      leaderboardRank: career.leaderboardRank,
      totalGames: career.wins + career.losses,
      tinkerGames: tinker?.games ?? null,
      tinkerWins: tinker?.wins ?? null,
      syncedAt: career.syncedAt,
    };
  } catch (err) {
    // A prova é enfeite da vitrine: sem ela a loja vende igual.
    console.error("[loja] prova do dono:", err instanceof Error ? err.message : err);
    return null;
  }
});

/** Chamado pelo cron: renova o cache de carreira do dono quando passou de 6 horas. */
export async function refreshOwnerCareer(now = Date.now()): Promise<"fresco" | "aguardando" | "renovado" | "sem_dono" | "falhou"> {
  // Falha (429, OpenDota fora do ar) não vira tentativa a cada minuto: o cache vencido só tenta
  // de novo nos minutos múltiplos de 10.
  const minute = new Date(now).getUTCMinutes();
  const owner = await findOwner();
  if (!owner?.steamId64) return "sem_dono";
  if (owner.career && now - new Date(owner.career.syncedAt).getTime() < REFRESH_EVERY_MS) return "fresco";
  if (minute % RETRY_EVERY_MINUTES !== 0) return "aguardando";
  const stats = await fetchCareerStats(steam64To32(owner.steamId64));
  if (!stats) return "falhou";
  const { error } = await createServiceClient()
    .from("user_stats_extended")
    .upsert(
      { user_id: owner.userId, career: stats as unknown as Json, last_synced_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw new Error(`gravar carreira do dono falhou: ${error.message}`);
  return "renovado";
}
