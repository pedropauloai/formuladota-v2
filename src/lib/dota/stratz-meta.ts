// Stratz GraphQL — win/pick de heróis POR POSIÇÃO (pos 1-5), fixo no MMR IMORTAL.
//
// Decisão Pedro (2026-06-19): nada de medalha baixa. O meta que importa é o do
// topo — "o jeito mais efetivo de jogar o jogo" (igual ao dota2protracker, que
// só mostra 7000+). Por isso NÃO há seletor de bracket: a query é fixa em Imortal.
//
// Usamos heroStats.winWeek (não stats): só o winWeek aceita o enum granular
// bracketIds:[IMMORTAL] + positionIds. Uma query com 5 aliases (um por posição)
// soma as últimas semanas (≈ patch atual). Auth = Bearer + User-Agent "STRATZ_API"
// (sem o UA a Stratz devolve 403). Cache 6h via unstable_cache (meta muda devagar;
// sem migration).

import { unstable_cache } from "next/cache";
import { serverEnv } from "@/lib/env";

export interface PositionStat {
  heroId: number;
  position: number; // 1..5
  matchCount: number;
  winCount: number;
}

const STRATZ_ENDPOINT = "https://api.stratz.com/graphql";
const META_REVALIDATE_SECONDS = 6 * 3600;
const POSITIONS = [1, 2, 3, 4, 5] as const;
// RankBracket granular da Stratz — IMMORTAL isola o topo (≈7000+ MMR).
const IMMORTAL_BRACKET = "IMMORTAL";
// Janelas semanais somadas (≈ 2 semanas = patch atual) — amostra estável.
const TAKE_WEEKS = 2;

interface WinWeekRow {
  heroId: number;
  matchCount: number;
  winCount: number;
}

function buildQuery(): string {
  const aliases = POSITIONS.map(
    (p) =>
      `p${p}: winWeek(take: ${TAKE_WEEKS}, bracketIds: [${IMMORTAL_BRACKET}], positionIds: [POSITION_${p}]) { heroId matchCount winCount }`
  ).join(" ");
  return `{ heroStats { ${aliases} } }`;
}

async function queryStratz(): Promise<PositionStat[]> {
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
    }
    for (const [heroId, v] of byHero) {
      out.push({ heroId, position: p, matchCount: v.matches, winCount: v.wins });
    }
  }
  return out;
}

/** Stats por posição no MMR Imortal (cacheados 6h). */
export function fetchPositionStats(): Promise<PositionStat[]> {
  return unstable_cache(queryStratz, ["hero-meta-positions-immortal"], {
    revalidate: META_REVALIDATE_SECONDS,
  })();
}
