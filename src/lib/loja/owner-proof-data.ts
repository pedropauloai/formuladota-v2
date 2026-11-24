// Leitura da resposta do OpenDota para a credencial do PPA (vitrine da loja) e para as últimas
// partidas dele (coluna da direita do site). Regra pura: o cron monta o registro com isto, e o
// teste confere sem rede.

/** Quantas partidas do PPA a coluna da direita mostra. */
export const RECENT_MATCHES = 5;

export interface OwnerMatch {
  matchId: number;
  heroId: number;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  /** Segundos. */
  duration: number;
  /** Início, em segundos desde 1970 (como o OpenDota manda). */
  startTime: number;
}

export interface OwnerProofData {
  rankTier: number | null;
  leaderboardRank: number | null;
  recentMatches: OwnerMatch[];
  syncedAt: string;
}

const intOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** Uma linha do /players/{id}/recentMatches; null quando falta a partida, o herói ou o resultado. */
function matchFromOpenDota(value: unknown): OwnerMatch | null {
  const m = asRecord(value);
  if (!m) return null;
  const matchId = intOrNull(m.match_id);
  const heroId = intOrNull(m.hero_id);
  const slot = intOrNull(m.player_slot);
  if (!matchId || !heroId || slot === null || typeof m.radiant_win !== "boolean") return null;
  // player_slot abaixo de 128 joga pelos Iluminados.
  const radiant = slot < 128;
  return {
    matchId,
    heroId,
    won: radiant === m.radiant_win,
    kills: intOrNull(m.kills) ?? 0,
    deaths: intOrNull(m.deaths) ?? 0,
    assists: intOrNull(m.assists) ?? 0,
    duration: intOrNull(m.duration) ?? 0,
    startTime: intOrNull(m.start_time) ?? 0,
  };
}

/** Uma partida já gravada no banco; null quando o formato não serve. */
function storedMatch(value: unknown): OwnerMatch | null {
  const m = asRecord(value);
  if (!m || typeof m.won !== "boolean") return null;
  const matchId = intOrNull(m.matchId);
  const heroId = intOrNull(m.heroId);
  if (!matchId || !heroId) return null;
  return {
    matchId,
    heroId,
    won: m.won,
    kills: intOrNull(m.kills) ?? 0,
    deaths: intOrNull(m.deaths) ?? 0,
    assists: intOrNull(m.assists) ?? 0,
    duration: intOrNull(m.duration) ?? 0,
    startTime: intOrNull(m.startTime) ?? 0,
  };
}

const firstValid = (list: unknown, read: (value: unknown) => OwnerMatch | null): OwnerMatch[] =>
  (Array.isArray(list) ? list : [])
    .map(read)
    .filter((m): m is OwnerMatch => m !== null)
    .slice(0, RECENT_MATCHES);

/** Medalha e posição no ranking (OpenDota /players) e as últimas partidas (/recentMatches). */
export function buildOwnerProofData(player: unknown, now: Date, recent: unknown = []): OwnerProofData {
  const p = asRecord(player) ?? {};
  return {
    rankTier: intOrNull(p.rank_tier),
    leaderboardRank: intOrNull(p.leaderboard_rank),
    recentMatches: firstValid(recent, matchFromOpenDota),
    syncedAt: now.toISOString(),
  };
}

/** Registro gravado no banco; null quando o formato não serve. */
export function parseOwnerProofData(value: unknown): OwnerProofData | null {
  const v = asRecord(value);
  if (!v || typeof v.syncedAt !== "string") return null;
  return {
    rankTier: intOrNull(v.rankTier),
    leaderboardRank: intOrNull(v.leaderboardRank),
    recentMatches: firstValid(v.recentMatches, storedMatch),
    syncedAt: v.syncedAt,
  };
}
