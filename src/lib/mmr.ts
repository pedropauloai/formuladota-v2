// MMR Elo helper FORMULADOTA — Phase 6 H4.2.
// Formula Elo standard com K=25 (Dota-like sensitivity).

export const ELO_K = 25;
export const STARTING_MMR = 1000;

/**
 * Calcula delta MMR de cada jogador após match 5v5.
 * Retorna objeto com radiantDelta + direDelta (positivo radiant = ganhou).
 *
 * Logic: cada player Radiant individualmente perde/ganha contra cada player Dire,
 * usando rating médio dos times pra simplificar (clássico Elo team).
 */
export function calculateMmrDelta(input: {
  radiantAvgMmr: number;
  direAvgMmr: number;
  radiantWon: boolean;
}): { radiantDelta: number; direDelta: number } {
  const expectedRadiant = 1 / (1 + Math.pow(10, (input.direAvgMmr - input.radiantAvgMmr) / 400));
  const expectedDire = 1 - expectedRadiant;

  const actualRadiant = input.radiantWon ? 1 : 0;
  const actualDire = input.radiantWon ? 0 : 1;

  const radiantDelta = Math.round(ELO_K * (actualRadiant - expectedRadiant));
  const direDelta = Math.round(ELO_K * (actualDire - expectedDire));

  return { radiantDelta, direDelta };
}

/**
 * Decay aplicado ao reset de season (-30%).
 * decayedMmr = floor(currentMmr * 0.7) but minimum STARTING_MMR (1000).
 */
export function applySeasonDecay(currentMmr: number): number {
  return Math.max(STARTING_MMR, Math.floor(currentMmr * 0.7));
}

/**
 * Tier client-side fallback (mesma lógica do SQL helper mmr_to_tier).
 * Útil pra renderizar TierBadge sem RPC roundtrip quando MMR já está em mãos.
 */
export interface TierInfo {
  tier: number;        // 1-8 (Herald → Immortal)
  stars: number;       // 0-5 (Immortal = 0, outros 1-5)
  tierName: string;
}

const TIER_BANDS: Array<{ tier: number; name: string; min: number; range: number }> = [
  { tier: 1, name: "Herald", min: 0, range: 770 },
  { tier: 2, name: "Guardian", min: 770, range: 770 },
  { tier: 3, name: "Crusader", min: 1540, range: 770 },
  { tier: 4, name: "Archon", min: 2310, range: 770 },
  { tier: 5, name: "Legend", min: 3080, range: 770 },
  { tier: 6, name: "Ancient", min: 3850, range: 770 },
  { tier: 7, name: "Divine", min: 4620, range: 770 },
  { tier: 8, name: "Immortal", min: 5390, range: Infinity },
];

export function mmrToTier(mmr: number): TierInfo {
  for (const band of TIER_BANDS) {
    if (mmr >= band.min && mmr < band.min + band.range) {
      const stars =
        band.tier === 8
          ? 0
          : Math.min(5, Math.max(1, Math.floor((mmr - band.min) / 154) + 1));
      return { tier: band.tier, stars, tierName: band.name };
    }
  }
  return { tier: 1, stars: 1, tierName: "Herald" };
}
