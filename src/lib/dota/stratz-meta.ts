// Stratz GraphQL: win/pick de heróis POR POSIÇÃO (pos 1-5), fixo na medalha Imortal.
//
// Decisão do PPA: nada de medalha baixa, o meta que importa é o do topo.
// Por isso NÃO há seletor de bracket: a query é fixa em IMMORTAL, que é a medalha Imortal
// inteira sem as partidas de 8.500+ de MMR (a Valve as esconde das APIs desde 2025).
//
// Usamos heroStats.winWeek (não stats): só o winWeek aceita o enum granular
// bracketIds:[IMMORTAL] + positionIds. Uma query com 5 aliases (um por posição) soma as
// duas últimas semanas fechadas (de quinta a quarta, em UTC), e o campo week diz quais são.
// Auth = Bearer + User-Agent "STRATZ_API" (sem o UA a Stratz devolve 403). O resultado fica
// guardado na tabela dota_meta_cache (meta-cache.ts): o cache do Next não guarda nada na Cloudflare.

import { serverEnv } from "@/lib/env";

export interface PositionStat {
  heroId: number;
  position: number; // 1..5
  matchCount: number;
  winCount: number;
}

export interface PositionStatsResult {
  stats: PositionStat[];
  /** Início de cada semana somada, em segundos desde 1970 (UTC). */
  weekStarts: number[];
}

const STRATZ_ENDPOINT = "https://api.stratz.com/graphql";
const STRATZ_TIMEOUT_MS = 15_000;
const POSITIONS = [1, 2, 3, 4, 5] as const;
// RankBracket granular da Stratz: IMMORTAL é a medalha Imortal, sem as partidas de 8.500+.
const IMMORTAL_BRACKET = "IMMORTAL";
// Duas semanas fechadas somadas: amostra estável.
const TAKE_WEEKS = 2;

interface WinWeekRow {
  week: number;
  heroId: number;
  matchCount: number;
  winCount: number;
}

function buildQuery(): string {
  const aliases = POSITIONS.map(
    (p) =>
      `p${p}: winWeek(take: ${TAKE_WEEKS}, bracketIds: [${IMMORTAL_BRACKET}], positionIds: [POSITION_${p}]) { week heroId matchCount winCount }`
  ).join(" ");
  return `{ heroStats { ${aliases} } }`;
}

/** Busca na Stratz os números por posição no Imortal e as semanas somadas. Lança em qualquer falha. */
export async function queryPositionStats(): Promise<PositionStatsResult> {
  const token = serverEnv.STRATZ_API_KEY;
  if (!token) throw new Error("STRATZ_API_KEY ausente");

  const res = await fetch(STRATZ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "STRATZ_API",
    },
    body: JSON.stringify({ query: buildQuery() }),
    cache: "no-store",
    signal: AbortSignal.timeout(STRATZ_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Stratz HTTP ${res.status}`);

  const json = (await res.json()) as {
    data?: { heroStats?: Record<string, WinWeekRow[] | null> };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) {
    throw new Error(`Stratz GraphQL: ${json.errors[0]?.message ?? "erro"}`);
  }

  const heroStats = json.data?.heroStats ?? {};
  const out: PositionStat[] = [];
  const weeks = new Set<number>();
  for (const p of POSITIONS) {
    const rows = heroStats[`p${p}`] ?? [];
    // Soma as janelas semanais por herói (take pode trazer >1 entrada por herói).
    const byHero = new Map<number, { matches: number; wins: number }>();
    for (const r of rows) {
      const id = Number(r.heroId);
      const cur = byHero.get(id) ?? { matches: 0, wins: 0 };
      cur.matches += Number(r.matchCount ?? 0);
      cur.wins += Number(r.winCount ?? 0);
      byHero.set(id, cur);
      if (Number(r.week) > 0) weeks.add(Number(r.week));
    }
    for (const [heroId, v] of byHero) {
      out.push({ heroId, position: p, matchCount: v.matches, winCount: v.wins });
    }
  }
  return { stats: out, weekStarts: [...weeks] };
}
