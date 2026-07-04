"use server";

// Estado + explicação do MMR de uma partida, pra aba "MMR" do placar (Pedro
// 2026-07-03). Enquanto o replay não é parseado, o MMR fica PENDENTE
// (matches.mmr_applied_at NULL) — a aba faz polling desta action até aplicar.
// Quando aplica, devolve o delta de cada jogador + o breakdown do desempenho
// (perfScore v2 e seus componentes) pra justificar a variação aos jogadores.

import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { getHeroById } from "@/lib/queries/heroes";
import {
  computePerfScore,
  perfComponents,
  PERF_SWING,
  assignRolesByNetWorth,
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
  /** MMR atual da temporada → medalha do rank. null = sem MMR. */
  seasonMmr: number | null;
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
  /** Score de desempenho 0..1 (recomputado dos dados da partida). */
  perfScore: number;
  /** Ajuste de desempenho derivado (parte do delta que veio do perfScore). */
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
          data: { match_id?: string; radiant_avg_mmr?: number | null; dire_avg_mmr?: number | null } | null;
        }>;
      };
    };
  })
    .select("match_id, radiant_avg_mmr, dire_avg_mmr")
    .eq(isUuid ? "match_id" : "dota_match_id", dotaMatchId)
    .maybeSingle();

  const matchUuid = isUuid ? dotaMatchId : md?.match_id;
  if (!matchUuid) return { applied: false, found: false, radiantAvg: null, direAvg: null, players: [] };
  const radiantAvg = md?.radiant_avg_mmr ?? null;
  const direAvg = md?.dire_avg_mmr ?? null;

  const { data: rows } = await supabase
    .from("match_players")
    .select("user_id, team, is_winner, hero_id, mmr_change, benchmarks, raw_opendota")
    .eq("match_id", matchUuid);

  const platform = (rows ?? []).filter(
    (r): r is typeof r & { user_id: string } => Boolean(r.user_id)
  );
  if (platform.length === 0) {
    return { applied: false, found: (rows ?? []).length > 0, radiantAvg, direAvg, players: [] };
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
  const [identity, { data: levels }, { data: seasonRows }] = await Promise.all([
    getIdentityMap(supabase, userIds),
    supabase.from("user_levels").select("user_id, current_level").in("user_id", userIds),
    activeSeason
      ? supabase
          .from("player_season_mmr")
          .select("user_id, mmr")
          .eq("season_id", activeSeason.id)
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as { user_id: string; mmr: number | null }[] }),
  ]);
  const levelOf = new Map((levels ?? []).map((l) => [l.user_id, l.current_level ?? 1]));
  const seasonMmrOf = new Map((seasonRows ?? []).map((r) => [r.user_id, r.mmr ?? null]));

  // FUNÇÃO por net worth (v3) — usa os 10 jogadores da partida (inclui não-plataforma)
  // pra ranquear, depois lê a função de cada jogador da plataforma pelo perfil certo.
  const rawOf = (p: { raw_opendota: unknown }) =>
    p.raw_opendota as Record<string, unknown> | null;
  const allRows = rows ?? [];
  const rolesArr = assignRolesByNetWorth(
    allRows.map((p) => {
      const nw = (p.raw_opendota as Record<string, unknown> | null)?.net_worth;
      return { team: p.team, netWorth: typeof nw === "number" ? nw : null };
    })
  );
  const roleOf = new Map<string, PlayerRole>();
  allRows.forEach((p, i) => {
    if (p.user_id) roleOf.set(p.user_id, rolesArr[i] ?? "core");
  });
  // Posição 1-5 (rank de net worth no time; 1 = maior NW) — ícone + ordenação.
  const posOf = new Map<string, number>();
  for (const team of ["radiant", "dire"] as const) {
    allRows
      .filter((p) => p.team === team)
      .map((p) => ({ p, nw: (rawOf(p)?.net_worth as number | undefined) ?? 0 }))
      .sort((a, b) => b.nw - a.nw)
      .forEach((x, i) => {
        if (x.p.user_id) posOf.set(x.p.user_id, i + 1);
      });
  }
  let matchDurationMin = 0;
  for (const p of allRows) {
    const d = (p.raw_opendota as Record<string, unknown> | null)?.duration;
    if (typeof d === "number" && d > 0) {
      matchDurationMin = d / 60;
      break;
    }
  }

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
    const perfScore = computePerfScore(role, bench, extras);
    const perfBonus = Math.round(PERF_SWING * (perfScore - 0.5));

    // Componentes presentes do perfil da função — pra exibir de onde veio o desempenho.
    const components: MmrComponent[] = perfComponents(role, bench, extras);

    const ident = identity.get(p.user_id);
    const hero = getHeroById(p.hero_id);
    return {
      userId: p.user_id,
      name: ident?.name ?? "Jogador",
      avatar: ident?.avatarUrl ?? null,
      level: levelOf.get(p.user_id) ?? 1,
      seasonMmr: seasonMmrOf.get(p.user_id) ?? null,
      socialLinks: ident?.socialLinks,
      heroName: hero?.name_pt ?? null,
      heroImage: hero?.image_icon ?? null,
      team: p.team as "radiant" | "dire",
      won: Boolean(p.is_winner),
      role,
      positionSlot: posOf.get(p.user_id) ?? 1,
      delta: typeof p.mmr_change === "number" ? p.mmr_change : null,
      perfScore,
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
    players,
  };
}
