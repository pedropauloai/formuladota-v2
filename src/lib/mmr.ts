// MMR Elo helper FORMULADOTA — Phase 6 H4.2.
// Formula Elo standard com K=25 (Dota-like sensitivity).

export const ELO_K = 25;
export const STARTING_MMR = 1000;

// TETO do MMR in-house (Pedro 2026-07-02): a escala é ANCORADA na do Dota real
// (Imortal = 5620) e LIMITADA a 7000 pra não inflacionar — o topo tem que significar
// algo, não virar "6000 é pouco". Sem teto, a calibração dobrada inflava tudo.
export const MMR_CEILING = 7000;
/** Teto de variação por partida (evita swings absurdos tipo +64). */
export const MAX_MATCH_DELTA = 30;

/** Piso do Imortal (fim do Divino) — acima disso o ranqueamento é por POSIÇÃO. */
export const IMMORTAL_FLOOR = 5620;
/**
 * Elite do leaderboard de Imortais: os TOP N (por MMR na temporada) ganham a
 * medalha vermelha (immortal-top-100). Pequeno de propósito no começo (a base ainda
 * é pequena) — subir depois é trocar essa constante. Pedro 2026-07-02.
 */
export const IMMORTAL_ELITE_TOP = 10;

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

// =====================================================================
// MODULADOR DE DESEMPENHO (MMR híbrido — Pedro 2026-06-18)
// O delta Elo (win/loss) é a ESPINHA; o desempenho da partida o ajusta.
// Fonte: percentis da OpenDota (match_players.benchmarks) — calculados POR
// HERÓI, então são justos entre funções (um suporte é comparado a suportes).
// =====================================================================

/**
 * Chaves de benchmark usadas no score de desempenho.
 * Doutrina "Dota é corrida patrimonial, não kills": pesamos ECONOMIA e
 * OBJETIVOS. `hero_damage_per_min` é contribuição de combate (≠ contagem de
 * kills, que é deliberadamente IGNORADA). Pesos calibráveis depois.
 */
export const PERF_BENCHMARK_KEYS = [
  "gold_per_min",
  "xp_per_min",
  "last_hits_per_min",
  "hero_damage_per_min",
  "tower_damage",
] as const;

/** Amplitude do ajuste de desempenho: ±(PERF_SWING/2) MMR no extremo. */
export const PERF_SWING = 20;

/**
 * Score de desempenho 0..1 a partir dos percentis OpenDota. Média dos pcts das
 * chaves doutrinárias. Sem dados → 0.5 (neutro: não altera o Elo → win/loss puro).
 */
export function computePerfScore(
  benchmarks: Record<string, { pct?: number | null }> | null | undefined
): number {
  if (!benchmarks) return 0.5;
  const pcts: number[] = [];
  for (const key of PERF_BENCHMARK_KEYS) {
    const pct = benchmarks[key]?.pct;
    if (typeof pct === "number" && pct >= 0 && pct <= 1) pcts.push(pct);
  }
  if (pcts.length === 0) return 0.5;
  return pcts.reduce((a, b) => a + b, 0) / pcts.length;
}

/**
 * Modula o delta Elo base pelo desempenho (ADITIVO, centrado em 0.5):
 *   bônus = PERF_SWING × (perfScore − 0.5)   → +10 (ótimo) … −10 (péssimo)
 * Vitória com bom desempenho ganha MAIS; derrota com bom desempenho perde
 * MENOS ("ganhe ou perca, a partida vale a pena"). Nunca cruza o zero:
 * vencedor sempre ganha ≥1, perdedor sempre perde ≥1.
 */
export function modulateMmrDelta(
  baseDelta: number,
  perfScore: number,
  won: boolean
): number {
  const perfBonus = Math.round(PERF_SWING * (perfScore - 0.5));
  // Teto por partida (Pedro 2026-07-02): limita o swing a ±MAX_MATCH_DELTA
  // (evita os +64 que a calibração dobrada gerava).
  const clamped = Math.max(-MAX_MATCH_DELTA, Math.min(MAX_MATCH_DELTA, baseDelta + perfBonus));
  return won ? Math.max(1, clamped) : Math.min(-1, clamped);
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

// Bandas ANCORADAS na escala oficial do Dota (wiki 2025/2026): cada estrela ≈ 154 MMR
// até Ancião; Divino ≈ 200/estrela (4620–5619); Imortal a partir de 5620.
const TIER_BANDS: Array<{ tier: number; name: string; min: number; range: number; starStep: number }> = [
  { tier: 1, name: "Herald", min: 0, range: 770, starStep: 154 },
  { tier: 2, name: "Guardian", min: 770, range: 770, starStep: 154 },
  { tier: 3, name: "Crusader", min: 1540, range: 770, starStep: 154 },
  { tier: 4, name: "Archon", min: 2310, range: 770, starStep: 154 },
  { tier: 5, name: "Legend", min: 3080, range: 770, starStep: 154 },
  { tier: 6, name: "Ancient", min: 3850, range: 770, starStep: 154 },
  { tier: 7, name: "Divine", min: 4620, range: 1000, starStep: 200 },
  { tier: 8, name: "Immortal", min: 5620, range: Infinity, starStep: 0 },
];

export function mmrToTier(mmr: number): TierInfo {
  for (const band of TIER_BANDS) {
    if (mmr >= band.min && mmr < band.min + band.range) {
      const stars =
        band.tier === 8
          ? 0
          : Math.min(5, Math.max(1, Math.floor((mmr - band.min) / band.starStep) + 1));
      return { tier: band.tier, stars, tierName: band.name };
    }
  }
  return { tier: 1, stars: 1, tierName: "Herald" };
}

// =====================================================================
// CALIBRAÇÃO (ver docs/foundations/RANKING_SYSTEM.md)
// =====================================================================

/** Nº de placements até calibrar (medalha revelada; antes disso = descalibrado). */
export const CALIBRATION_MATCHES = 10;
/** Multiplicador na calibração. 1 = SEM dobrar (Pedro 2026-07-02: o "dobro" inflava
 *  o MMR e o afastava da medalha real). Calibração só controla quando a medalha é
 *  revelada, não infla mais o swing. */
export const CALIBRATION_MULTIPLIER = 1;

/**
 * Semente de MMR a partir da medalha Valve (rank_tier OpenDota: dezena = medalha
 * 1–8, unidade = estrela 0–5). Usada na PRIMEIRA partida da temporada pra um jogador
 * sem linha ainda — evita começar do 1000 chapado (Imortal larga perto do topo).
 * null = sem rank público → cai pro STARTING_MMR no caller.
 */
export function seedMmrFromRankTier(rankTier: number | null | undefined): number | null {
  if (rankTier == null || rankTier <= 0) return null;
  const medal = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  // Imortal = PISO real da escala (5620), não 6000 — o topo (até 7000) é conquistado
  // jogando, não semeado. Distribui os 80 (medalha×10+estrela) da API dentro de 0–5620.
  if (medal >= 8) return 5620;
  const band = TIER_BANDS.find((b) => b.tier === medal);
  if (!band) return null;
  // Meio da estrela dentro da banda (starStep por medalha: 154 até Ancião, 200 no Divino).
  return band.min + Math.max(0, Math.min(5, stars) - 1) * band.starStep + Math.round(band.starStep / 2);
}
