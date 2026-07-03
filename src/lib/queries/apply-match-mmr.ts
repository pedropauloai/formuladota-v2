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
  applySeasonDecay,
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
    .select("user_id, team, is_winner, benchmarks, rank_tier, raw_opendota")
    .eq("match_id", matchId);

  // Só jogadores da plataforma (com user_id) ganham/perdem MMR.
  const platform = (players ?? []).filter(
    (p): p is typeof p & { user_id: string } => Boolean(p.user_id)
  );
  if (platform.length === 0) {
    return { applied: 0, skipped: "sem jogadores da plataforma" };
  }

  // Temporada ATIVA. A beta (pré-temporada) TAMBÉM conta agora (Pedro 2026-07-02):
  // os testadores veem o MMR real no histórico + ranking; na virada pro S1 todos
  // levam o soft reset -30% de qualquer forma, então o S1 continua protegido.
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("active", true)
    .maybeSingle();
  if (!season) return { applied: 0, skipped: "sem temporada ativa" };

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
  // Carry-over do SOFT RESET: quem não tem linha nesta season herda o MMR da season
  // anterior DECAÍDO -30% (applySeasonDecay) — prioritário sobre a semente Valve.
  // Assim o veterano re-calibra perto de onde parou (não do 1000 chapado).
  const noRowUsers = userIds.filter((u) => !rowOf.has(u));
  const carryOf = new Map<string, number>();
  if (noRowUsers.length > 0) {
    const { data: prev } = await supabase
      .from("player_season_mmr")
      .select("user_id, mmr, season_id")
      .in("user_id", noRowUsers)
      .lt("season_id", season.id)
      .order("season_id", { ascending: false });
    for (const r of prev ?? []) {
      if (!carryOf.has(r.user_id)) carryOf.set(r.user_id, applySeasonDecay(r.mmr));
    }
  }

  // MMR inicial: linha da season → seu mmr; senão carry-over decaído; senão semente
  // da medalha Valve; senão 1000.
  const getMmr = (uid: string) =>
    rowOf.get(uid)?.mmr ??
    carryOf.get(uid) ??
    seedMmrFromRankTier(rankTierOf.get(uid)) ??
    STARTING_MMR;
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

  // MVP = maior perfScore da partida inteira (Pedro 2026-07-03). Guardamos o perf de
  // cada jogador pra escolher o melhor depois do map.
  let mvpUserId: string | null = null;
  let mvpPerf = -1;
  const results = platform.map((p) => {
    const base = p.team === "radiant" ? radiantDelta : direDelta;
    const won = Boolean(p.is_winner);
    // Presença em teamfight (0..1) vem do replay parseado — peso dominante no perf
    // score v2. Ausente (partida não parseada no momento) → sai da média.
    const tfp = (p.raw_opendota as { teamfight_participation?: number } | null)
      ?.teamfight_participation;
    const perf = computePerfScore(p.benchmarks as PerfBenchmarks | null, {
      teamfightParticipation: typeof tfp === "number" ? tfp : null,
    });
    if (perf > mvpPerf) {
      mvpPerf = perf;
      mvpUserId = p.user_id;
    }
    let delta = modulateMmrDelta(base, perf, won);
    // Calibração: delta vale o DOBRO (converge rápido pro nível real).
    if (isCalibrating(p.user_id)) delta *= CALIBRATION_MULTIPLIER;
    return {
      user_id: p.user_id,
      // Sem teto superior (Pedro 2026-07-02): acima do Imortal o rank é por POSIÇÃO
      // (leaderboard), não pelo número — então travar em 7000 só punia. Piso 0; o
      // ±30/partida já evita swing absurdo.
      new_mmr: Math.max(0, getMmr(p.user_id) + delta),
      delta, // gravado em match_players.mmr_change (aparece no histórico)
      won,
    };
  });

  // p_radiant_avg/p_dire_avg (113) + p_mvp_user_id (115) persistem em match_details:
  // médias dos times (favorito/zebra) e o MVP. Cast: tipos gerados ainda sem esses
  // params opcionais (db:gen-types).
  const { data, error } = await supabase.rpc("apply_match_mmr", {
    p_match_id: matchId,
    p_season_id: season.id,
    p_results: results,
    p_radiant_avg: radiantAvg,
    p_dire_avg: direAvg,
    p_mvp_user_id: mvpUserId,
  } as never);
  if (error) throw new Error(error.message);
  return { applied: (data as number) ?? 0 };
}
