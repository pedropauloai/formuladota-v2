"use server";

// Estado + explicação do MMR de uma partida, pra aba "MMR" do placar (Pedro
// 2026-07-03). Enquanto o replay não é parseado, o MMR fica PENDENTE
// (matches.mmr_applied_at NULL) — a aba faz polling desta action até aplicar.
// Quando aplica, devolve o delta de cada jogador + o breakdown do desempenho
// (perfScore v2 e seus componentes) pra justificar a variação aos jogadores.

import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { getHeroById } from "@/lib/queries/heroes";
import { computePerfScore, PERF_COMPONENTS, PERF_SWING } from "@/lib/mmr";

export interface MmrComponent {
  key: string;
  /** Valor 0..1 (percentil por herói, ou fração pra presença em teamfight). */
  value: number;
  weight: number;
}

export interface MmrPlayerBreakdown {
  userId: string;
  name: string;
  heroName: string | null;
  team: "radiant" | "dire";
  won: boolean;
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

  const identity = await getIdentityMap(
    supabase,
    platform.map((p) => p.user_id)
  );

  const players: MmrPlayerBreakdown[] = platform.map((p) => {
    const bench = (p.benchmarks ?? null) as Record<string, { pct?: number | null }> | null;
    const tfp = (p.raw_opendota as { teamfight_participation?: number } | null)?.teamfight_participation;
    const teamfightParticipation = typeof tfp === "number" ? tfp : null;
    const perfScore = computePerfScore(bench, { teamfightParticipation });
    const perfBonus = Math.round(PERF_SWING * (perfScore - 0.5));

    // Componentes presentes (mesma lógica do computePerfScore) — pra exibir de onde
    // veio o desempenho.
    const components: MmrComponent[] = [];
    for (const c of PERF_COMPONENTS) {
      let value: number | null = null;
      if (c.source === "direct" && c.key === "teamfight_participation") {
        if (teamfightParticipation != null) value = teamfightParticipation;
      } else {
        const pct = bench?.[c.key]?.pct;
        if (typeof pct === "number" && pct >= 0 && pct <= 1) value = pct;
      }
      if (value !== null) components.push({ key: c.key, value, weight: c.weight });
    }

    return {
      userId: p.user_id,
      name: identity.get(p.user_id)?.name ?? "Jogador",
      heroName: getHeroById(p.hero_id)?.name_pt ?? null,
      team: p.team as "radiant" | "dire",
      won: Boolean(p.is_winner),
      delta: typeof p.mmr_change === "number" ? p.mmr_change : null,
      perfScore,
      perfBonus,
      components,
    };
  });

  // Ordena: maior ganho primeiro (dentro de cada time o painel agrupa).
  players.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  return {
    applied,
    found: true,
    radiantAvg,
    direAvg,
    players,
  };
}
