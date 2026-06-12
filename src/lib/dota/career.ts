// Stats de CARREIRA do jogador via OpenDota (migration 051 — coluna career jsonb).
//
// 4 endpoints por account_id 32-bit (free tier: 60 req/min — por isso o sync
// NUNCA roda sem checar o TTL no cache antes; ver syncCareerStats):
//   GET /players/{id}         → rank_tier, leaderboard_rank
//   GET /players/{id}/wl      → win, lose (winrate de carreira)
//   GET /players/{id}/heroes  → top 5 heróis por jogos
//   GET /players/{id}/totals  → acumulados (kills, deaths, assists, last_hits, denies)
//
// Tudo aqui é melhor-esforço: qualquer falha de rede/API retorna null e o
// caller decide o que fazer (cache antigo, render sem stats, etc).

import { OPENDOTA_BASE, OpenDotaError } from "./opendota";

// ---------------------------------------------------------------------------
// Tipos públicos (contrato com a UI)
// ---------------------------------------------------------------------------

/** Um herói do top 5 da carreira (ordenado por jogos). */
export interface CareerHeroStat {
  heroId: number;
  games: number;
  wins: number;
  /** Unix timestamp (segundos) da última partida com o herói. */
  lastPlayed: number;
}

/** Acumulados de carreira (reduzidos de /players/{id}/totals). */
export interface CareerTotals {
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  denies: number;
}

/** Payload completo gravado em user_stats_extended.career (jsonb). */
export interface CareerStats {
  /** Medalha Valve: dezena = medalha (8 = Imortal), unidade = estrelas. null = sem rank público. */
  rankTier: number | null;
  /** Posição no leaderboard regional (só Imortais ranqueados). */
  leaderboardRank: number | null;
  wins: number;
  losses: number;
  /** Top 5 heróis por número de jogos. */
  topHeroes: CareerHeroStat[];
  totals: CareerTotals;
  /** ISO 8601 — momento do fetch. Fonte de verdade do TTL de 24h. */
  syncedAt: string;
}

// ---------------------------------------------------------------------------
// Shapes crus da OpenDota (validados com a conta real 1123609219)
// ---------------------------------------------------------------------------

interface RawPlayerResponse {
  rank_tier?: number | null;
  leaderboard_rank?: number | null;
}

interface RawWlResponse {
  win?: number;
  lose?: number;
}

interface RawHeroEntry {
  // OpenDota retorna hero_id como string neste endpoint — normalizamos com Number()
  hero_id?: number | string;
  games?: number;
  win?: number;
  last_played?: number;
}

interface RawTotalEntry {
  field?: string;
  sum?: number;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${OPENDOTA_BASE}${path}`, {
    headers: { Accept: "application/json" },
    // Cache fica no Supabase (TTL 24h) — aqui sempre dado fresco
    cache: "no-store",
  });
  if (!res.ok) {
    throw new OpenDotaError(`OpenDota retornou ${res.status} pra ${path}`, res.status);
  }
  return (await res.json()) as T;
}

/** Top 5 heróis por jogos, normalizados. */
function pickTopHeroes(raw: RawHeroEntry[]): CareerHeroStat[] {
  return raw
    .map((h) => ({
      heroId: Number(h.hero_id ?? 0),
      games: h.games ?? 0,
      wins: h.win ?? 0,
      lastPlayed: h.last_played ?? 0,
    }))
    .filter((h) => h.heroId > 0 && h.games > 0)
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);
}

/** Reduz o array de /totals (field/sum) pros 5 campos que a UI usa. */
function reduceTotals(raw: RawTotalEntry[]): CareerTotals {
  const byField = new Map<string, number>();
  for (const entry of raw) {
    if (entry.field) byField.set(entry.field, entry.sum ?? 0);
  }
  return {
    kills: byField.get("kills") ?? 0,
    deaths: byField.get("deaths") ?? 0,
    assists: byField.get("assists") ?? 0,
    lastHits: byField.get("last_hits") ?? 0,
    denies: byField.get("denies") ?? 0,
  };
}

/**
 * Busca os 4 endpoints de carreira em paralelo e monta o CareerStats.
 * Qualquer falha → null (sync é melhor-esforço, nunca quebra render).
 *
 * @param accountId32 account_id 32-bit (converter de Steam64 com steam64To32 de ./opendota)
 */
export async function fetchCareerStats(accountId32: number): Promise<CareerStats | null> {
  try {
    const [player, wl, heroes, totals] = await Promise.all([
      fetchJson<RawPlayerResponse>(`/players/${accountId32}`),
      fetchJson<RawWlResponse>(`/players/${accountId32}/wl`),
      fetchJson<RawHeroEntry[]>(`/players/${accountId32}/heroes`),
      fetchJson<RawTotalEntry[]>(`/players/${accountId32}/totals`),
    ]);

    return {
      rankTier: player.rank_tier ?? null,
      leaderboardRank: player.leaderboard_rank ?? null,
      wins: wl.win ?? 0,
      losses: wl.lose ?? 0,
      topHeroes: pickTopHeroes(Array.isArray(heroes) ? heroes : []),
      totals: reduceTotals(Array.isArray(totals) ? totals : []),
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[opendota] career fetch falhou:", (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse do cache jsonb
// ---------------------------------------------------------------------------

/**
 * Valida o jsonb vindo de user_stats_extended.career.
 * Retorna null se o shape não bater (cache corrompido/formato antigo) —
 * nesse caso o caller trata como cache vazio e re-sincroniza.
 */
export function parseCareerStats(value: unknown): CareerStats | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.syncedAt !== "string") return null;
  if (typeof obj.wins !== "number" || typeof obj.losses !== "number") return null;
  if (!obj.totals || typeof obj.totals !== "object") return null;
  if (!Array.isArray(obj.topHeroes)) return null;
  // Shape mínimo confere — campos internos seguem o contrato de escrita
  return obj as unknown as CareerStats;
}
