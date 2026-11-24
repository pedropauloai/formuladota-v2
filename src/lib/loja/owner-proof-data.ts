// Leitura da resposta do OpenDota para a credencial do PPA (vitrine da loja) e o cache dos resumos
// das partidas que ele registra no painel da fila (coluna da direita do site). Regra pura: o cron
// monta o registro com isto, e o teste confere sem rede.

import { parsePartyMatchSummary, type PartyMatchSummary } from "./fila/party-match";

/** Quantas partidas registradas o cron resume e guarda (a página /partidas mostra todas). */
export const PARTY_MATCHES_CACHED = 30;
/** Resumo sem resultado (perfis privados) para de ser pedido ao OpenDota um dia depois da partida. */
const RETRY_NO_RESULT_MS = 24 * 60 * 60 * 1000;

export interface OwnerProofData {
  rankTier: number | null;
  leaderboardRank: number | null;
  /** Resumo (resultado, placar, herói do PPA) das últimas partidas registradas no painel da fila. */
  partyMatches: PartyMatchSummary[];
  syncedAt: string;
}

const intOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const summaries = (list: unknown): PartyMatchSummary[] =>
  (Array.isArray(list) ? list : [])
    .map(parsePartyMatchSummary)
    .filter((m): m is PartyMatchSummary => m !== null)
    .slice(0, PARTY_MATCHES_CACHED);

/** Medalha e posição no ranking (OpenDota /players) e os resumos já montados das partidas registradas. */
export function buildOwnerProofData(player: unknown, now: Date, partyMatches: readonly PartyMatchSummary[] = []): OwnerProofData {
  const p = asRecord(player) ?? {};
  return {
    rankTier: intOrNull(p.rank_tier),
    leaderboardRank: intOrNull(p.leaderboard_rank),
    partyMatches: summaries(partyMatches),
    syncedAt: now.toISOString(),
  };
}

/**
 * O resumo guardado serve quando achou o PPA na partida. Sem ele, volta ao OpenDota na rodada
 * seguinte (a conta usada pode ter entrado na lista); sem resultado, desiste depois de um dia.
 */
export function reuseSummary(hit: PartyMatchSummary | undefined, nowMs: number): hit is PartyMatchSummary {
  if (!hit) return false;
  if (hit.ppaHeroId !== null && hit.teammates !== null) return true;
  return hit.won === null && nowMs - (hit.startTime + hit.duration) * 1000 > RETRY_NO_RESULT_MS;
}

/** Registro gravado no banco; null quando o formato não serve. */
export function parseOwnerProofData(value: unknown): OwnerProofData | null {
  const v = asRecord(value);
  if (!v || typeof v.syncedAt !== "string") return null;
  return {
    rankTier: intOrNull(v.rankTier),
    leaderboardRank: intOrNull(v.leaderboardRank),
    partyMatches: summaries(v.partyMatches),
    syncedAt: v.syncedAt,
  };
}
