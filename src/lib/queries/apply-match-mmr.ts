// Motor de MMR — aplica o resultado de UMA partida enriquecida ao ranking da
// temporada ativa (Pedro 2026-06-18). Híbrido: delta Elo (média dos times)
// MODULADO pelo desempenho (percentis OpenDota, por herói = justo entre funções).
//
// Lê match_players (leitura pública), calcula o delta por jogador DA PLATAFORMA
// e persiste via RPC apply_match_mmr (idempotente, SECURITY DEFINER).
// Chamado pós-enriquecimento. NUNCA é o caminho crítico — o caller envolve em
// try/catch pra que falha de MMR não quebre a confirmação da partida.

import type { createClient } from "@/lib/supabase/server";
import { getAssignedPositionsByDotaMatchId } from "@/lib/queries/assigned-roles";
import {
  calculateMmrDelta,
  computePerfScore,
  computeImpact,
  blendPerf,
  modulateMmrDelta,
  composeMatchDelta,
  seedMmrFromRankTier,
  applySeasonDecay,
  assignRolesByNetWorth,
  positionToRole,
  normalizeWards,
  type PlayerRole,
  CALIBRATION_MATCHES,
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

  // FUNÇÃO = role ATRIBUÍDA no matchmaking (lobby_players.role), NÃO net worth
  // (Pedro 2026-07-05). Net worth é só fallback pra jogador sem atribuição.
  const rawOf = (p: (typeof platform)[number] | (typeof allPlayers)[number]) =>
    p.raw_opendota as Record<string, unknown> | null;
  const nwOf = (p: (typeof allPlayers)[number]) => {
    const nw = rawOf(p)?.net_worth;
    return typeof nw === "number" ? nw : null;
  };
  const allPlayers = players ?? [];
  // dota_match_id via match_details (público) → posições atribuídas na sala.
  const { data: md } = await supabase
    .from("match_details")
    .select("dota_match_id")
    .eq("match_id", matchId)
    .maybeSingle();
  const assignedPos = await getAssignedPositionsByDotaMatchId(
    supabase,
    (md as { dota_match_id?: string | null } | null)?.dota_match_id ?? null
  );
  const nwRoles = assignRolesByNetWorth(
    allPlayers.map((p) => ({ team: p.team, netWorth: nwOf(p) }))
  );
  const roleOf = new Map<string, PlayerRole>();
  allPlayers.forEach((p, i) => {
    if (!p.user_id) return;
    const pos = assignedPos.get(p.user_id);
    roleOf.set(p.user_id, pos ? positionToRole(pos) : nwRoles[i] ?? "core");
  });
  // Duração da partida (mesma pra todos) — pra normalizar stuns/wards por minuto.
  let matchDurationMin = 0;
  for (const p of allPlayers) {
    const d = rawOf(p)?.duration;
    if (typeof d === "number" && d > 0) {
      matchDurationMin = d / 60;
      break;
    }
  }

  // Impacto absoluto (patrimônio + K+A) normalizado na partida INTEIRA — reflete quem
  // decidiu de fato, INDEPENDENTE da função. Metade da nota final (v5, Pedro 2026-07-06).
  const kaOf = (p: (typeof allPlayers)[number]) => {
    const r = rawOf(p);
    const k = typeof r?.kills === "number" ? r.kills : 0;
    const a = typeof r?.assists === "number" ? r.assists : 0;
    return k + a;
  };
  const maxNetWorth = Math.max(1, ...allPlayers.map((p) => nwOf(p) ?? 0));
  const maxKa = Math.max(1, ...allPlayers.map((p) => kaOf(p)));

  // MVP = maior NOTA FINAL (execução-por-função + impacto). Um suporte PODE ser MVP
  // quando de fato teve mais impacto (alta participação em kills) que o core — como
  // acontece no Dota. Não é bloqueio ao suporte; é exigir impacto real (Pedro 2026-07-06).
  let mvpUserId: string | null = null;
  let mvpPerf = -1;
  const perfOf = new Map<string, number>();
  for (const p of platform) {
    const role = roleOf.get(p.user_id) ?? "core";
    const raw = rawOf(p);
    // Sinais "direct" do replay parseado (ausentes se não parseada → saem da média):
    //   teamfight_participation (0..1) e wards (obs+sen), normalizados.
    const tfp = raw?.teamfight_participation;
    const obs = typeof raw?.obs_placed === "number" ? raw.obs_placed : null;
    const sen = typeof raw?.sen_placed === "number" ? raw.sen_placed : null;
    const wardsTotal = obs == null && sen == null ? null : (obs ?? 0) + (sen ?? 0);
    const rolePerf = computePerfScore(role, p.benchmarks as PerfBenchmarks | null, {
      teamfightParticipation: typeof tfp === "number" ? tfp : null,
      wards: normalizeWards(wardsTotal, matchDurationMin),
    });
    const impact = computeImpact({
      netWorth: nwOf(p),
      killsPlusAssists: kaOf(p),
      maxNetWorth,
      maxKa,
    });
    const perf = blendPerf(rolePerf, impact);
    perfOf.set(p.user_id, perf);
    if (perf > mvpPerf) {
      mvpPerf = perf;
      mvpUserId = p.user_id;
    }
  }

  // STREAK (sequência de vitórias/derrotas seguidas) INCLUINDO esta partida — pro bônus
  // anti-boosted que quebra o teto. Mini-replay cronológico do histórico do jogador.
  const streakOf = new Map<string, number>();
  {
    const { data: hist } = await supabase
      .from("match_players")
      .select("user_id, is_winner, match_id, matches!inner(created_at)")
      .in("user_id", userIds);
    type H = {
      user_id: string;
      is_winner: boolean | null;
      match_id: string;
      matches: { created_at: string } | { created_at: string }[];
    };
    const createdAt = (h: H) =>
      Array.isArray(h.matches) ? h.matches[0]?.created_at ?? "" : h.matches.created_at;
    const rowsByUser = new Map<string, H[]>();
    for (const h of (hist ?? []) as unknown as H[]) {
      (rowsByUser.get(h.user_id) ?? rowsByUser.set(h.user_id, []).get(h.user_id)!).push(h);
    }
    for (const [uid, rows] of rowsByUser) {
      rows.sort((a, b) => createdAt(a).localeCompare(createdAt(b)));
      let streak = 0;
      let last: boolean | null = null;
      for (const r of rows) {
        const w = Boolean(r.is_winner);
        streak = w === last ? streak + 1 : 1;
        last = w;
        if (r.match_id === matchId) break; // streak nesta partida
      }
      streakOf.set(uid, streak);
    }
  }

  const results = platform.map((p) => {
    const base = p.team === "radiant" ? radiantDelta : direDelta;
    const won = Boolean(p.is_winner);
    const perf = perfOf.get(p.user_id) ?? 0.5;
    // Delta final: desempenho (modulateMmrDelta) → MVP + calibração + streak + teto.
    const delta = composeMatchDelta({
      baseModulated: modulateMmrDelta(base, perf, won),
      won,
      isMvp: p.user_id === mvpUserId,
      calibrating: isCalibrating(p.user_id),
      streakLen: streakOf.get(p.user_id) ?? 1,
    });
    return {
      user_id: p.user_id,
      // Piso 0; sem teto superior (acima do Imortal o rank é por POSIÇÃO).
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
