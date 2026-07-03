// FONTE ÚNICA do "cartão de rank" de um jogador (Pedro 2026-07-03).
//
// Antes, cada tela (perfil, mini-perfil, hover, ready-check, admin, cards) remontava
// as medalhas do seu jeito, com fontes e conversões divergentes — ex.: o mini-perfil
// tirava o rank sazonal do MMR Valve legado (profiles.mmr_atual) enquanto o perfil
// tirava do MMR da temporada (player_season_mmr) → medalhas dessincronizadas. E havia
// várias cópias de mmrToDotaRank, uma delas (admin) com faixas erradas.
//
// Regra canônica das 3 medalhas:
//   SKILL  = medalha Valve real (career.rankTier). Fallback: MMR da temporada.
//   SEASON = rank FormulaDota da temporada (player_season_mmr) — a nossa pele.
//   HONRA  = nível (gate pela skill Valve).
// Toda tela deve chamar computeRankBadges com ESTAS fontes.

import type { DotaRank } from "@/components/ui/dota-rank-medal";
import type { HonorRank } from "@/components/ui/honor-rank-medal";
import { mmrToTier } from "@/lib/mmr";
import { getGatedTierForLevel, mmrFromRankTier } from "@/lib/levels";

const TIER_TO_RANK: Record<number, DotaRank> = {
  1: "herald",
  2: "guardian",
  3: "crusader",
  4: "archon",
  5: "legend",
  6: "ancient",
  7: "divine",
  8: "immortal",
};

/**
 * MMR → DotaRank pela escala OFICIAL do Dota (wiki 2025/2026): Imortal = 5620.
 * Única cópia canônica (as demais telas re-exportam/consomem desta).
 */
export function mmrToDotaRank(mmr: number | null | undefined): DotaRank {
  if (mmr == null) return "herald";
  if (mmr >= 5620) return "immortal";
  if (mmr >= 4620) return "divine";
  if (mmr >= 3850) return "ancient";
  if (mmr >= 3080) return "legend";
  if (mmr >= 2310) return "archon";
  if (mmr >= 1540) return "crusader";
  if (mmr >= 770) return "guardian";
  return "herald";
}

/**
 * Medalha Valve a partir do rank_tier (STRATZ/OpenDota: dezena = medalha 1-8,
 * unidade = estrela 0-5). null = perfil sem rank público. Imortal com leaderboard
 * ≤ 100 (mundial) ganha a medalha vermelha exclusiva.
 */
export function rankTierToDotaRank(
  rankTier: number | null | undefined,
  leaderboardRank: number | null | undefined
): DotaRank | null {
  if (rankTier == null) return null;
  const medal = Math.floor(rankTier / 10);
  if (medal === 8 && leaderboardRank != null && leaderboardRank <= 100) {
    return "immortal-top-100";
  }
  return TIER_TO_RANK[medal] ?? null;
}

export interface RankBadges {
  /** Medalha SKILL (Valve real). Sempre presente (fallback no MMR da temporada). */
  skillRank: DotaRank;
  /** Estrelas (1-5) da medalha SKILL. */
  skillStars?: number;
  /** Medalha SEASON (rank FormulaDota da temporada). undefined = sem MMR de season. */
  seasonRank?: DotaRank;
  /** Estrelas (1-5) da medalha SEASON. */
  seasonStars?: number;
  /** Medalha de HONRA (nível, com gate pela skill Valve). */
  honorRank: HonorRank;
}

/**
 * Resolve as 3 medalhas de um jogador a partir das fontes canônicas. Use em TODA
 * tela que mostra o cartão do jogador (perfil, mini-perfil, hover, ready-check,
 * admin) pra elas nunca mais divergirem.
 */
export function computeRankBadges(input: {
  careerRankTier: number | null | undefined;
  careerLeaderboardRank?: number | null;
  seasonMmr?: number | null;
  level: number;
}): RankBadges {
  const { careerRankTier, careerLeaderboardRank, seasonMmr, level } = input;

  const skillRank =
    rankTierToDotaRank(careerRankTier, careerLeaderboardRank ?? null) ??
    mmrToDotaRank(seasonMmr ?? null);
  // Estrela SKILL = unidade do rank_tier Valve; sem rank Valve, cai nas estrelas do MMR.
  const skillStars = careerRankTier
    ? careerRankTier % 10 || undefined
    : seasonMmr != null
      ? mmrToTier(seasonMmr).stars
      : undefined;

  const seasonRank = seasonMmr != null ? mmrToDotaRank(seasonMmr) : undefined;
  const seasonStars = seasonMmr != null ? mmrToTier(seasonMmr).stars : undefined;

  const honorRank = getGatedTierForLevel(level, mmrFromRankTier(careerRankTier ?? null));

  return { skillRank, skillStars, seasonRank, seasonStars, honorRank };
}
