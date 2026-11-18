// Leitura da resposta do OpenDota para a medalha da credencial da vitrine. Regra pura: o cron
// monta o registro com isto, e o teste confere sem rede.

export interface OwnerProofData {
  rankTier: number | null;
  leaderboardRank: number | null;
  syncedAt: string;
}

const intOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null);

/** Medalha e posição no ranking a partir do OpenDota /players. */
export function buildOwnerProofData(player: unknown, now: Date): OwnerProofData {
  const p = (player ?? {}) as Record<string, unknown>;
  return { rankTier: intOrNull(p.rank_tier), leaderboardRank: intOrNull(p.leaderboard_rank), syncedAt: now.toISOString() };
}

/** Registro gravado no banco; null quando o formato não serve. */
export function parseOwnerProofData(value: unknown): OwnerProofData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.syncedAt !== "string") return null;
  return { rankTier: intOrNull(v.rankTier), leaderboardRank: intOrNull(v.leaderboardRank), syncedAt: v.syncedAt };
}
