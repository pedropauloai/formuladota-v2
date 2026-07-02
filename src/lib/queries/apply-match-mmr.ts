// Motor de MMR — aplica o resultado de UMA partida enriquecida ao ranking da
// temporada ativa (Pedro 2026-06-18). Híbrido: delta Elo (média dos times)
// MODULADO pelo desempenho (percentis OpenDota, por herói = justo entre funções).
//
// Lê match_players (leitura pública), calcula o delta por jogador DA PLATAFORMA
// e persiste via RPC apply_match_mmr (idempotente, SECURITY DEFINER).
// Chamado pós-enriquecimento. NUNCA é o caminho crítico — o caller envolve em
// try/catch pra que falha de MMR não quebre a confirmação da partida.

import type { createClient } from "@/lib/supabase/server";
import {
  calculateMmrDelta,
  computePerfScore,
  modulateMmrDelta,
  seedMmrFromRankTier,
  CALIBRATION_MATCHES,
  CALIBRATION_MULTIPLIER,
  STARTING_MMR,
} from "@/lib/mmr";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type PerfBenchmarks = Record<string, { pct?: number | null }>;

export interface ApplyMmrResult {
  applied: number;
  /** Motivo quando applied=0 sem erro (ex: nenhum jogador da plataforma). */
  skipped?: string;
}

export async function applyMatchMmr(
  supabase: ServerClient,
  matchId: string
): Promise<ApplyMmrResult> {
  const { data: players } = await supabase
    .from("match_players")
    .select("user_id, team, is_winner, benchmarks, rank_tier")
    .eq("match_id", matchId);

  // Só jogadores da plataforma (com user_id) ganham/perdem MMR.
  const platform = (players ?? []).filter(
    (p): p is typeof p & { user_id: string } => Boolean(p.user_id)
  );
  if (platform.length === 0) {
    return { applied: 0, skipped: "sem jogadores da plataforma" };
  }

  // Só temporada ATIVA e NÃO-beta conta (pré-temporada = testes, não ranqueia).
  const { data: season } = await supabase
    .from("seasons")
    .select("id, beta")
    .eq("active", true)
    .maybeSingle();
  if (!season) return { applied: 0, skipped: "sem temporada ativa" };
  if (season.beta) return { applied: 0, skipped: "pré-temporada (beta) não conta" };

  // Estado atual por jogador: MMR (semente da medalha Valve na 1ª partida da season)
  // + calibração (não calibrado → swing dobrado). rank_tier vem do match_players.
  const userIds = platform.map((p) => p.user_id);
  const rankTierOf = new Map<string, number | null>();
  for (const p of platform) rankTierOf.set(p.user_id, (p.rank_tier as number | null) ?? null);

  const { data: existing } = await supabase
    .from("player_season_mmr")
    .select("user_id, mmr, calibrated, placements_played")
    .eq("season_id", season.id)
    .in("user_id", userIds);
  const rowOf = new Map<string, { mmr: number; calibrated: boolean; placements: number }>();
  for (const r of existing ?? []) {
    rowOf.set(r.user_id, {
      mmr: r.mmr,
      calibrated: Boolean(r.calibrated),
      placements: r.placements_played ?? 0,
    });
  }
  // MMR atual: linha existente → seu mmr; senão semeia da medalha Valve → senão 1000.
  const getMmr = (uid: string) =>
    rowOf.get(uid)?.mmr ?? seedMmrFromRankTier(rankTierOf.get(uid)) ?? STARTING_MMR;
  // Ainda calibrando? (sem linha OU placements < 7) → delta vale o dobro.
  const isCalibrating = (uid: string) => {
    const r = rowOf.get(uid);
    return !r || (!r.calibrated && r.placements < CALIBRATION_MATCHES);
  };

  // Médias por time (dos jogadores da plataforma de cada lado). Se um lado não
  // tem jogador da plataforma, espelha o outro (não distorce o Elo).
  const mean = (xs: number[], fallback: number) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : fallback;
  const radiantAvg = mean(
    platform.filter((p) => p.team === "radiant").map((p) => getMmr(p.user_id)),
    STARTING_MMR
  );
  const direAvg = mean(
    platform.filter((p) => p.team === "dire").map((p) => getMmr(p.user_id)),
    radiantAvg
  );

  const anyRadiant = platform.find((p) => p.team === "radiant");
  const anyDire = platform.find((p) => p.team === "dire");
  const radiantWon = anyRadiant
    ? Boolean(anyRadiant.is_winner)
    : !anyDire?.is_winner;

  const { radiantDelta, direDelta } = calculateMmrDelta({
    radiantAvgMmr: radiantAvg,
    direAvgMmr: direAvg,
    radiantWon,
  });

  const results = platform.map((p) => {
    const base = p.team === "radiant" ? radiantDelta : direDelta;
    const won = Boolean(p.is_winner);
    const perf = computePerfScore(p.benchmarks as PerfBenchmarks | null);
    let delta = modulateMmrDelta(base, perf, won);
    // Calibração: delta vale o DOBRO (converge rápido pro nível real).
    if (isCalibrating(p.user_id)) delta *= CALIBRATION_MULTIPLIER;
    return {
      user_id: p.user_id,
      new_mmr: Math.max(0, getMmr(p.user_id) + delta),
      delta, // gravado em match_players.mmr_change (aparece no histórico)
      won,
    };
  });

  const { data, error } = await supabase.rpc("apply_match_mmr", {
    p_match_id: matchId,
    p_season_id: season.id,
    p_results: results,
  });
  if (error) throw new Error(error.message);
  return { applied: (data as number) ?? 0 };
}
