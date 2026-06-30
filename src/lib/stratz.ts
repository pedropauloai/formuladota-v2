// Stratz GraphQL + OpenDota REST — fetcher unificado de stats expandidos do user.
// Phase 7: usado em /perfil/[steamid] pra winrate por herói, KDA, GPM, XPM.
//
// Strategy: Stratz primeiro (Tier 1 free 2k req/h, mais rico). Se sem token ou
// rate-limited, fallback OpenDota (sem token = rate baixo; com OPENDOTA_API_KEY
// premium = sem limit). Se ambos falham, retorna null — caller renderiza placeholder.

import { serverEnv } from "@/lib/env";

export interface PlayerStatsExtended {
  source: "stratz" | "opendota";
  totalMatches: number;
  totalWins: number;
  avgKDA: number;
  avgGPM: number;
  avgXPM: number;
  /** Média de last hits por partida (últimas ~20). */
  avgLastHits: number;
  /** Média de dano a heróis por partida (últimas ~20). */
  avgHeroDamage: number;
  /** Top 5 heróis mais jogados */
  topHeroes: {
    heroId: number;
    matches: number;
    wins: number;
    winRate: number;
  }[];
}

/**
 * Converte SteamID 64-bit (17 dígitos, ex: 76561198xxxxxxxxx) pra 32-bit
 * (Account ID, usado pelo Stratz/OpenDota). Subtração mágica documentada Steam:
 * https://developer.valvesoftware.com/wiki/SteamID
 */
export function steamId64To32(steamId64: string): number {
  return Number(BigInt(steamId64) - BigInt("76561197960265728"));
}

export async function fetchPlayerStats(
  steamId64: string
): Promise<PlayerStatsExtended | null> {
  const accountId = steamId64To32(steamId64);

  // Tenta Stratz primeiro
  if (serverEnv.STRATZ_API_KEY) {
    try {
      const stratzResult = await fetchFromStratz(accountId);
      if (stratzResult) return stratzResult;
    } catch (err) {
      console.warn("[stratz] fetch falhou, fallback OpenDota:", err);
    }
  }

  // Fallback OpenDota
  try {
    return await fetchFromOpenDota(accountId);
  } catch (err) {
    console.error("[opendota] fetch falhou:", err);
    return null;
  }
}

// ============== Stratz GraphQL ==============

async function fetchFromStratz(
  accountId: number
): Promise<PlayerStatsExtended | null> {
  const token = serverEnv.STRATZ_API_KEY!;
  const query = `
    query Player($id: Long!) {
      player(steamAccountId: $id) {
        matchCount
        winCount
        performance {
          imp
        }
        heroesPerformance(take: 5) {
          heroId
          matchCount
          winCount
        }
        matches(request: { take: 20 }) {
          players(steamAccountId: $id) {
            kills
            deaths
            assists
            goldPerMinute
            experiencePerMinute
            numLastHits
            heroDamage
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.stratz.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "STRATZ_API",
    },
    body: JSON.stringify({ query, variables: { id: accountId } }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("rate-limited");
    throw new Error(`HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: {
      player?: {
        matchCount?: number;
        winCount?: number;
        heroesPerformance?: Array<{
          heroId: number;
          matchCount: number;
          winCount: number;
        }>;
        matches?: Array<{
          // As stats por partida ficam no PLAYER (filtrado por steamAccountId), não
          // no MatchType. Antes a query pedia kills no match → 400 → SEMPRE caía pro
          // OpenDota (bug histórico, corrigido 2026-06-30).
          players?: Array<{
            kills: number;
            deaths: number;
            assists: number;
            goldPerMinute: number;
            experiencePerMinute: number;
            numLastHits: number;
            heroDamage: number;
          }>;
        }>;
      };
    };
  };

  const p = json.data?.player;
  if (!p) return null;

  // 1 player por match (o filtrado). Achata pra média das últimas ~20.
  const pm = (p.matches ?? []).flatMap((m) => m.players ?? []);
  const denom = Math.max(1, pm.length);
  const totalKDA =
    pm.reduce((sum, m) => sum + (m.kills + m.assists) / Math.max(1, m.deaths), 0) / denom;
  const totalGPM = pm.reduce((sum, m) => sum + m.goldPerMinute, 0) / denom;
  const totalXPM = pm.reduce((sum, m) => sum + (m.experiencePerMinute ?? 0), 0) / denom;
  const totalLH = pm.reduce((sum, m) => sum + (m.numLastHits ?? 0), 0) / denom;
  const totalDmg = pm.reduce((sum, m) => sum + (m.heroDamage ?? 0), 0) / denom;

  return {
    source: "stratz",
    totalMatches: p.matchCount ?? 0,
    totalWins: p.winCount ?? 0,
    avgKDA: Number(totalKDA.toFixed(2)),
    avgGPM: Number(totalGPM.toFixed(1)),
    avgXPM: Number(totalXPM.toFixed(1)),
    avgLastHits: Number(totalLH.toFixed(1)),
    avgHeroDamage: Number(totalDmg.toFixed(0)),
    topHeroes: (p.heroesPerformance ?? []).map((h) => ({
      heroId: h.heroId,
      matches: h.matchCount,
      wins: h.winCount,
      winRate:
        h.matchCount > 0
          ? Number(((h.winCount / h.matchCount) * 100).toFixed(1))
          : 0,
    })),
  };
}

// ============== OpenDota REST (fallback) ==============

async function fetchFromOpenDota(
  accountId: number
): Promise<PlayerStatsExtended | null> {
  const apiKey = serverEnv.OPENDOTA_API_KEY;
  const baseUrl = "https://api.opendota.com/api";
  const auth = apiKey ? `?api_key=${apiKey}` : "";

  // Endpoint /players/{id} retorna stats agregados, /players/{id}/heroes top heróis
  const [playerRes, heroesRes, recentRes] = await Promise.all([
    fetch(`${baseUrl}/players/${accountId}${auth}`, {
      next: { revalidate: 3600 },
    }),
    fetch(`${baseUrl}/players/${accountId}/heroes${auth}`, {
      next: { revalidate: 3600 },
    }),
    fetch(`${baseUrl}/players/${accountId}/recentMatches${auth}`, {
      next: { revalidate: 3600 },
    }),
  ]);

  if (!playerRes.ok) return null;

  const heroes = (await heroesRes.json()) as Array<{
    hero_id: number;
    games: number;
    win: number;
  }>;
  const recent = (await recentRes.json()) as Array<{
    kills: number;
    deaths: number;
    assists: number;
    gold_per_min: number;
    xp_per_min: number;
    last_hits: number;
    hero_damage: number;
  }>;

  // Agrega: total matches/wins de heroes (mais confiável que player.win_count
  // que pode estar desatualizado pra contas privadas)
  const totalMatches = heroes.reduce((s, h) => s + h.games, 0);
  const totalWins = heroes.reduce((s, h) => s + h.win, 0);

  const avgKDA =
    recent.length > 0
      ? recent.reduce(
          (s, m) => s + (m.kills + m.assists) / Math.max(1, m.deaths),
          0
        ) / recent.length
      : 0;
  const avgGPM =
    recent.length > 0
      ? recent.reduce((s, m) => s + m.gold_per_min, 0) / recent.length
      : 0;
  const avgXPM =
    recent.length > 0
      ? recent.reduce((s, m) => s + m.xp_per_min, 0) / recent.length
      : 0;
  const avgLastHits =
    recent.length > 0
      ? recent.reduce((s, m) => s + (m.last_hits ?? 0), 0) / recent.length
      : 0;
  const avgHeroDamage =
    recent.length > 0
      ? recent.reduce((s, m) => s + (m.hero_damage ?? 0), 0) / recent.length
      : 0;

  const topHeroes = [...heroes]
    .sort((a, b) => b.games - a.games)
    .slice(0, 5)
    .map((h) => ({
      heroId: h.hero_id,
      matches: h.games,
      wins: h.win,
      winRate: h.games > 0 ? Number(((h.win / h.games) * 100).toFixed(1)) : 0,
    }));

  return {
    source: "opendota",
    totalMatches,
    totalWins,
    avgKDA: Number(avgKDA.toFixed(2)),
    avgGPM: Number(avgGPM.toFixed(1)),
    avgXPM: Number(avgXPM.toFixed(1)),
    avgLastHits: Number(avgLastHits.toFixed(1)),
    avgHeroDamage: Number(avgHeroDamage.toFixed(0)),
    topHeroes,
  };
}
