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
    .select("user_id, team, is_winner, benchmarks")
    .eq("match_id", matchId);

  // Só jogadores da plataforma (com user_id) ganham/perdem MMR.
  const platform = (players ?? []).filter(
    (p): p is typeof p & { user_id: string } => Boolean(p.user_id)
  );
  if (platform.length === 0) {
    return { applied: 0, skipped: "sem jogadores da plataforma" };
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("active", true)
    .maybeSingle();
  if (!season) return { applied: 0, skipped: "sem temporada ativa" };

  // MMRs atuais (default STARTING_MMR pra quem ainda não tem linha na season).
  const userIds = platform.map((p) => p.user_id);
  const { data: existing } = await supabase
    .from("player_season_mmr")
    .select("user_id, mmr")
    .eq("season_id", season.id)
    .in("user_id", userIds);
  const mmrOf = new Map<string, number>();
  for (const r of existing ?? []) mmrOf.set(r.user_id, r.mmr);
  const getMmr = (uid: string) => mmrOf.get(uid) ?? STARTING_MMR;

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
    const delta = modulateMmrDelta(base, perf, won);
    return {
      user_id: p.user_id,
      new_mmr: Math.max(0, getMmr(p.user_id) + delta),
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
