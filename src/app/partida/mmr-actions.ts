"use server";

// Estado + explicação do MMR de uma partida, pra aba "MMR" do placar (Pedro
// 2026-07-03). Enquanto o replay não é parseado, o MMR fica PENDENTE
// (matches.mmr_applied_at NULL) — a aba faz polling desta action até aplicar.
// Quando aplica, devolve o delta de cada jogador + o breakdown do desempenho
// (perfScore v2 e seus componentes) pra justificar a variação aos jogadores.

import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { getHeroById } from "@/lib/queries/heroes";
import { xpProgress } from "@/lib/levels";
import { getAssignedPositionsByDotaMatchId } from "@/lib/queries/assigned-roles";
import {
  computePerfScore,
  computeImpact,
  blendPerf,
  perfComponents,
  PERF_SWING,
  assignRolesByNetWorth,
  positionToRole,
  normalizeStuns,
  normalizeWards,
  type PlayerRole,
} from "@/lib/mmr";
import type { SocialLinks } from "@/components/profile/social-icons-row";

export interface MmrComponent {
  key: string;
  /** Valor 0..1 (percentil por herói, ou fração pra presença em teamfight). */
  value: number;
  weight: number;
}

export interface MmrPlayerBreakdown {
  userId: string;
  name: string;
  /** Identidade completa (mesmos dados dos cards): avatar, nível, medalha, redes. */
  avatar: string | null;
  level: number;
  /** Progresso 0..1 do nível atual — pro anel de XP preencher. */
  xpPct: number;
  /** MMR atual da temporada → medalha do rank. null = sem MMR. */
  seasonMmr: number | null;
  /** Colocação 1-based na season → medalha de leaderboard (#N) igual ao /ranking. */
  seasonPosition: number | null;
  socialLinks?: SocialLinks;
  heroName: string | null;
  heroImage: string | null;
  team: "radiant" | "dire";
  won: boolean;
  /** Função detectada por net worth (core/support) — perfil de avaliação do perf. */
  role: PlayerRole;
  /** Posição 1-5 (rank de net worth no time) — ícone da role + ordenação. */
  positionSlot: number;
  /** Delta final gravado (autoritativo). null = ainda não aplicado. */
  delta: number | null;
  /** NOTA final 0..1 (v5) = blend execução-por-função + impacto absoluto. É o que
   *  moveu o MMR e define o MVP. */
  perfScore: number;
  /** Execução-por-função pura 0..1 (média das barras de componente) — a metade
   *  "fez o trabalho da função" da nota. */
  rolePerf: number;
  /** Impacto absoluto 0..1 (patrimônio + participação em kills) — a metade "quem
   *  decidiu a partida" da nota. */
  impact: number;
  /** Ajuste de desempenho derivado da NOTA (parte do delta que veio do desempenho). */
  perfBonus: number;
  components: MmrComponent[];
}

export interface MmrState {
  /** true quando o MMR já foi calculado (derivado de match_players.mmr_change,
   *  que é leitura pública — matches.mmr_applied_at tem RLS e não serve ao público). */
  applied: boolean;
  /** true se a partida foi encontrada. */
  found: boolean;
  /** Média de MMR de cada time no momento da partida (favorito vs zebra). null = não
   *  gravado (partida anterior à migration 113). */
  radiantAvg: number | null;
  direAvg: number | null;
  /** MVP AUTORITATIVO (gravado em match_details pelo motor) — maior NOTA v5. Fonte
   *  única: NÃO recalcular por perfScore no cliente (isso dava MVP errado). */
  mvpUserId: string | null;
  players: MmrPlayerBreakdown[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMatchMmrState(dotaMatchId: string): Promise<MmrState> {
  const supabase = await createClient();

  // match_details é PÚBLICA (matches tem RLS restrita): resolve o match_id interno
  // (a URL usa o dota_match_id) E traz as médias de MMR dos times (favorito/zebra).
  const isUuid = UUID_RE.test(dotaMatchId);
  const { data: md } = await (supabase.from("match_details" as never) as unknown as {
    select: (q: string) => {
      eq: (c: string, v: string) => {
        maybeSingle: () => PromiseLike<{
          data: {
            match_id?: string;
            dota_match_id?: string | null;
            radiant_avg_mmr?: number | null;
            dire_avg_mmr?: number | null;
            mvp_user_id?: string | null;
          } | null;
        }>;
      };
    };
  })
    .select("match_id, dota_match_id, radiant_avg_mmr, dire_avg_mmr, mvp_user_id")
    .eq(isUuid ? "match_id" : "dota_match_id", dotaMatchId)
    .maybeSingle();

  const matchUuid = isUuid ? dotaMatchId : md?.match_id;
  // dota_match_id REAL (Valve) — pra achar a sala e as roles atribuídas.
  const valveMatchId = isUuid ? (md?.dota_match_id ?? null) : dotaMatchId;
  if (!matchUuid)
    return { applied: false, found: false, radiantAvg: null, direAvg: null, mvpUserId: null, players: [] };
  const radiantAvg = md?.radiant_avg_mmr ?? null;
  const direAvg = md?.dire_avg_mmr ?? null;
  // MVP AUTORITATIVO gravado pelo motor (maior nota v5) — fonte única.
  const mvpUserId = md?.mvp_user_id ?? null;

  const { data: rows } = await supabase
    .from("match_players")
    .select("user_id, team, is_winner, hero_id, mmr_change, benchmarks, raw_opendota")
    .eq("match_id", matchUuid);

  const platform = (rows ?? []).filter(
    (r): r is typeof r & { user_id: string } => Boolean(r.user_id)
  );
  if (platform.length === 0) {
    return { applied: false, found: (rows ?? []).length > 0, radiantAvg, direAvg, mvpUserId, players: [] };
  }

  // "Aplicado" = algum jogador da plataforma já tem mmr_change gravado (leitura
  // pública). Não lemos matches.mmr_applied_at: a RLS de matches o esconde do público
  // (auth.uid()=user_id OR is_admin) → a aba ficaria presa em "Calculando".
  const applied = platform.some((p) => typeof p.mmr_change === "number");

  const userIds = platform.map((p) => p.user_id);
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("active", true)
    .maybeSingle();
  const [identity, { data: levels }, { data: seasonRows }, { data: posRows }] = await Promise.all([
    getIdentityMap(supabase, userIds),
    supabase.from("user_levels").select("user_id, total_xp_earned").in("user_id", userIds),
    activeSeason
      ? supabase
          .from("player_season_mmr")
          .select("user_id, mmr")
          .eq("season_id", activeSeason.id)
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as { user_id: string; mmr: number | null }[] }),
    // Colocação na season → medalha de leaderboard (#N) igual ao /ranking.
    supabase.rpc("season_positions" as never, { p_ids: userIds } as never),
  ]);
  const xpOf = new Map((levels ?? []).map((l) => [l.user_id, xpProgress(l.total_xp_earned ?? 0)]));
  const seasonMmrOf = new Map((seasonRows ?? []).map((r) => [r.user_id, r.mmr ?? null]));
  const seasonPosOf = new Map(
    ((posRows ?? []) as { user_id: string; pos: number }[]).map((r) => [r.user_id, r.pos])
  );

  // FUNÇÃO/POSIÇÃO = role ATRIBUÍDA no matchmaking (lobby_players.role), NÃO net worth
  // (Pedro 2026-07-05). Net worth só como fallback pra jogador sem atribuição.
  const rawOf = (p: { raw_opendota: unknown }) =>
    p.raw_opendota as Record<string, unknown> | null;
  const allRows = rows ?? [];
  const assignedPos = await getAssignedPositionsByDotaMatchId(supabase, valveMatchId);
  const nwRoles = assignRolesByNetWorth(
    allRows.map((p) => {
      const nw = (p.raw_opendota as Record<string, unknown> | null)?.net_worth;
      return { team: p.team, netWorth: typeof nw === "number" ? nw : null };
    })
  );
  // Fallback de posição por rank de net worth no time (1 = maior NW).
  const nwPosOf = new Map<string, number>();
  for (const team of ["radiant", "dire"] as const) {
    allRows
      .filter((p) => p.team === team)
      .map((p) => ({ p, nw: (rawOf(p)?.net_worth as number | undefined) ?? 0 }))
      .sort((a, b) => b.nw - a.nw)
      .forEach((x, i) => {
        if (x.p.user_id) nwPosOf.set(x.p.user_id, i + 1);
      });
  }
  const roleOf = new Map<string, PlayerRole>();
  const posOf = new Map<string, number>();
  allRows.forEach((p, i) => {
    if (!p.user_id) return;
    const assigned = assignedPos.get(p.user_id);
    const pos = assigned ?? nwPosOf.get(p.user_id) ?? 1;
    posOf.set(p.user_id, pos);
    roleOf.set(p.user_id, assigned ? positionToRole(assigned) : nwRoles[i] ?? "core");
  });
  let matchDurationMin = 0;
  for (const p of allRows) {
    const d = (p.raw_opendota as Record<string, unknown> | null)?.duration;
    if (typeof d === "number" && d > 0) {
      matchDurationMin = d / 60;
      break;
    }
  }

  // Máximos da partida INTEIRA (patrimônio + K+A) — normalizadores do impacto absoluto.
  // Espelha apply-match-mmr.ts: o impacto compara CADA jogador ao maior da partida.
  const nwOf = (p: { raw_opendota: unknown }) => {
    const nw = (p.raw_opendota as Record<string, unknown> | null)?.net_worth;
    return typeof nw === "number" ? nw : 0;
  };
  const kaOf = (p: { raw_opendota: unknown }) => {
    const r = p.raw_opendota as Record<string, unknown> | null;
    const k = typeof r?.kills === "number" ? r.kills : 0;
    const a = typeof r?.assists === "number" ? r.assists : 0;
    return k + a;
  };
  const maxNetWorth = Math.max(1, ...allRows.map(nwOf));
  const maxKa = Math.max(1, ...allRows.map(kaOf));

  const players: MmrPlayerBreakdown[] = platform.map((p) => {
    const bench = (p.benchmarks ?? null) as Record<string, { pct?: number | null }> | null;
    const role = roleOf.get(p.user_id) ?? "core";
    const raw = rawOf(p);
    const tfp = raw?.teamfight_participation;
    const stunsSec = typeof raw?.stuns === "number" ? raw.stuns : null;
    const obs = typeof raw?.obs_placed === "number" ? raw.obs_placed : null;
    const sen = typeof raw?.sen_placed === "number" ? raw.sen_placed : null;
    const wardsTotal = obs == null && sen == null ? null : (obs ?? 0) + (sen ?? 0);
    const extras = {
      teamfightParticipation: typeof tfp === "number" ? tfp : null,
      stuns: normalizeStuns(stunsSec, matchDurationMin),
      wards: normalizeWards(wardsTotal, matchDurationMin),
    };
    // NOTA v5 = blend(execução-por-função, impacto). É o que moveu o MMR e define o MVP.
    const rolePerf = computePerfScore(role, bench, extras);
    const impact = computeImpact({
      netWorth: nwOf(p),
      killsPlusAssists: kaOf(p),
      maxNetWorth,
      maxKa,
    });
    const perfScore = blendPerf(rolePerf, impact);
    const perfBonus = Math.round(PERF_SWING * (perfScore - 0.5));

    // Componentes presentes do perfil da função — pra exibir de onde veio o desempenho.
    const components: MmrComponent[] = perfComponents(role, bench, extras);

    const ident = identity.get(p.user_id);
    const hero = getHeroById(p.hero_id);
    return {
      userId: p.user_id,
      name: ident?.name ?? "Jogador",
      avatar: ident?.avatarUrl ?? null,
      level: xpOf.get(p.user_id)?.level ?? 1,
      xpPct: xpOf.get(p.user_id)?.pct ?? 0,
      seasonMmr: seasonMmrOf.get(p.user_id) ?? null,
      seasonPosition: seasonPosOf.get(p.user_id) ?? null,
      socialLinks: ident?.socialLinks,
      heroName: hero?.name_pt ?? null,
      heroImage: hero?.image_icon ?? null,
      team: p.team as "radiant" | "dire",
      won: Boolean(p.is_winner),
      role,
      positionSlot: posOf.get(p.user_id) ?? 1,
      delta: typeof p.mmr_change === "number" ? p.mmr_change : null,
      perfScore,
      rolePerf,
      impact,
      perfBonus,
      components,
    };
  });

  // Ordena por POSIÇÃO (1→5), não por delta (Pedro 2026-07-04): agrupa cores e
  // suportes de forma consistente — os cards de sup e core têm tamanhos diferentes,
  // então ordenar por posição fica visualmente organizado. O painel separa por time.
  players.sort((a, b) => a.positionSlot - b.positionSlot);

  return {
    applied,
    found: true,
    radiantAvg,
    direAvg,
    mvpUserId,
    players,
  };
}
