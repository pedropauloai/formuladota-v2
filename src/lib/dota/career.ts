// Stats de CARREIRA do jogador — HÍBRIDO STRATZ + OpenDota (migration 051,
// coluna career jsonb).
//
// Por que híbrido (validado com a conta real 1123609219, 2026-06-11):
//   - OpenDota /players/wl EXCLUI Turbo (749V-745D = 1494 jogos) — pra quem
//     joga muito Turbo os números parecem "defasados".
//   - STRATZ conta TUDO (2137 partidas, 1086 vitórias) e ainda expõe a medalha
//     da season (seasonRank) + posição no leaderboard + última partida.
//
// Divisão de fontes:
//   STRATZ GraphQL (primário p/ identidade competitiva):
//     wins/losses (matchCount/winCount), rankTier (seasonRank — mesmo formato
//     da OpenDota: 80 = Imortal), leaderboardRank, lastMatchAt
//   OpenDota REST (sempre, p/ all-time corretos):
//     GET /players/{id}         → rank_tier, leaderboard_rank (fallback)
//     GET /players/{id}/wl      → win, lose (fallback de wins/losses)
//     GET /players/{id}/heroes  → top 5 heróis por jogos (all-time — o
//                                 heroesPerformance do STRATZ tem janela
//                                 recente por default, NÃO usar)
//     GET /players/{id}/totals  → acumulados (kills, assists, last_hits, ...)
//
// Fallback gracioso: STRATZ_API_KEY ausente ou STRATZ fora do ar → valores
// OpenDota como antes. O sync NUNCA quebra por causa do STRATZ.
//
// SEGURANÇA: este módulo é server-only (importado só por Server Actions /
// Server Components — nenhum "use client" na cadeia). A STRATZ_API_KEY nunca
// chega ao client: serverEnv retorna {} fora do servidor.
//
// Free tier OpenDota: 60 req/min — por isso o sync NUNCA roda sem checar o
// TTL no cache antes (ver syncCareerStats). Tudo aqui é melhor-esforço:
// qualquer falha de rede/API retorna null e o caller decide o que fazer.

import { serverEnv } from "@/lib/env";
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
  /**
   * Medalha Valve: dezena = medalha (8 = Imortal), unidade = estrelas.
   * Fonte: STRATZ seasonRank (mesmo formato) → fallback OpenDota rank_tier.
   * null = sem rank público.
   */
  rankTier: number | null;
  /** Posição no leaderboard regional (só Imortais ranqueados). STRATZ → fallback OpenDota. */
  leaderboardRank: number | null;
  /** Vitórias de carreira — STRATZ winCount (inclui Turbo) → fallback OpenDota /wl. */
  wins: number;
  /** Derrotas — STRATZ matchCount - winCount → fallback OpenDota /wl. */
  losses: number;
  /** ISO 8601 da última partida (STRATZ lastMatchDateTime). null = STRATZ indisponível. */
  lastMatchAt: string | null;
  /** Top 5 heróis por número de jogos — SEMPRE OpenDota (all-time correto). */
  topHeroes: CareerHeroStat[];
  /** Acumulados de carreira — SEMPRE OpenDota /totals. */
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
// STRATZ GraphQL — identidade competitiva (inclui Turbo, ao contrário do /wl)
// ---------------------------------------------------------------------------

/** Resultado normalizado do STRATZ — só os campos que o CareerStats consome. */
interface StratzCareerSlice {
  matchCount: number;
  winCount: number;
  rankTier: number | null;
  leaderboardRank: number | null;
  /** ISO 8601 (convertido de lastMatchDateTime unix segundos). */
  lastMatchAt: string | null;
}

interface StratzCareerResponse {
  data?: {
    player?: {
      matchCount?: number | null;
      winCount?: number | null;
      steamAccount?: {
        seasonRank?: number | null;
        seasonLeaderboardRank?: number | null;
        lastMatchDateTime?: number | string | null;
      } | null;
    } | null;
  };
}

const STRATZ_CAREER_QUERY = `query CareerPlayer($id: Long!) {
  player(steamAccountId: $id) {
    matchCount
    winCount
    steamAccount {
      seasonRank
      seasonLeaderboardRank
      lastMatchDateTime
    }
  }
}`;

/**
 * Busca matchCount/winCount + seasonRank no STRATZ.
 * Melhor-esforço: chave ausente, HTTP != 200 ou shape inesperado → null
 * (o caller cai pros valores OpenDota — degradação suave, sync nunca quebra).
 */
async function fetchStratzCareer(
  accountId32: number
): Promise<StratzCareerSlice | null> {
  const apiKey = serverEnv.STRATZ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.stratz.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // STRATZ exige User-Agent identificado — sem ele retorna 403
        "User-Agent": "STRATZ_API",
      },
      body: JSON.stringify({
        query: STRATZ_CAREER_QUERY,
        variables: { id: accountId32 },
      }),
      // Cache fica no Supabase (TTL 24h) — aqui sempre dado fresco
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[stratz] career retornou ${res.status} — fallback OpenDota`);
      return null;
    }

    const json = (await res.json()) as StratzCareerResponse;
    const player = json.data?.player;
    if (
      !player ||
      typeof player.matchCount !== "number" ||
      typeof player.winCount !== "number"
    ) {
      return null;
    }

    const account = player.steamAccount;
    // lastMatchDateTime vem em unix SEGUNDOS (Long — pode chegar como string)
    const lastMatchUnix = Number(account?.lastMatchDateTime ?? NaN);
    return {
      matchCount: player.matchCount,
      winCount: player.winCount,
      rankTier: account?.seasonRank ?? null,
      leaderboardRank: account?.seasonLeaderboardRank ?? null,
      lastMatchAt: Number.isFinite(lastMatchUnix)
        ? new Date(lastMatchUnix * 1000).toISOString()
        : null,
    };
  } catch (err) {
    console.warn("[stratz] career fetch falhou — fallback OpenDota:", (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch OpenDota
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
 * Monta o CareerStats híbrido: STRATZ (W/L total + medalha season + última
 * partida) + OpenDota (heróis e acumulados all-time) em paralelo.
 *
 * STRATZ indisponível → wins/losses/rank caem pros valores OpenDota (como
 * era antes). Falha da OpenDota → null (sync é melhor-esforço, nunca quebra).
 *
 * @param accountId32 account_id 32-bit (converter de Steam64 com steam64To32 de ./opendota)
 */
export async function fetchCareerStats(accountId32: number): Promise<CareerStats | null> {
  try {
    const [stratz, player, wl, heroes, totals] = await Promise.all([
      fetchStratzCareer(accountId32), // nunca lança — null em qualquer falha
      fetchJson<RawPlayerResponse>(`/players/${accountId32}`),
      fetchJson<RawWlResponse>(`/players/${accountId32}/wl`),
      fetchJson<RawHeroEntry[]>(`/players/${accountId32}/heroes`),
      fetchJson<RawTotalEntry[]>(`/players/${accountId32}/totals`),
    ]);

    return {
      // STRATZ primeiro (seasonRank pode ser null mesmo com STRATZ ok → OpenDota)
      rankTier: stratz?.rankTier ?? player.rank_tier ?? null,
      leaderboardRank: stratz?.leaderboardRank ?? player.leaderboard_rank ?? null,
      // W/L: STRATZ conta Turbo (o /wl da OpenDota NÃO) — só cai pro /wl sem STRATZ
      wins: stratz ? stratz.winCount : (wl.win ?? 0),
      losses: stratz ? stratz.matchCount - stratz.winCount : (wl.lose ?? 0),
      lastMatchAt: stratz?.lastMatchAt ?? null,
      // All-time SEMPRE OpenDota (heroesPerformance do STRATZ tem janela recente)
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
  // Formato antigo (pré-STRATZ, sem lastMatchAt) → invalida pra forçar re-sync
  // imediato com os números híbridos (corrige W/L "defasado" sem esperar o TTL).
  if (!("lastMatchAt" in obj)) return null;
  // Shape mínimo confere — campos internos seguem o contrato de escrita
  return obj as unknown as CareerStats;
}
