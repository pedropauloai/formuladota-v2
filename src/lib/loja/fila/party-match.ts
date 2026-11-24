// Resumo de uma partida da party do PPA (registrada no painel da fila com o ID) a partir da OpenDota
// /matches/{id}: de que lado a party jogou, se ganhou, o placar e o herói do PPA. Regra pura: o cron
// grava o resumo no cache (store_owner_proof) e a coluna da direita só lê. Testado sem rede.

export interface PartyMatchSummary {
  matchId: number;
  /** Início, em segundos desde 1970 (como o OpenDota manda). */
  startTime: number;
  /** Segundos. */
  duration: number;
  /** null quando nem o PPA nem ninguém da party aparece na partida (perfil privado, smurf sem vínculo). */
  won: boolean | null;
  /** A party jogou pelos Iluminados; null quando não deu para saber o lado. */
  radiant: boolean | null;
  radiantScore: number;
  direScore: number;
  /** O herói do PPA, quando a conta dele está na partida. */
  ppaHeroId: number | null;
}

const int = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null);
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/**
 * O lado da party sai da conta do PPA; numa smurf, de quem da party aparece na partida (a Steam
 * vinculada no site). Sem ninguém conhecido, o resultado fica em aberto.
 */
export function summarizePartyMatch(match: unknown, ownerAccountId: number | null, partyAccountIds: readonly number[]): PartyMatchSummary | null {
  const m = record(match);
  const matchId = int(m?.match_id);
  if (!m || !matchId) return null;
  const players = Array.isArray(m.players) ? m.players.map(record).filter((p): p is Record<string, unknown> => p !== null) : [];
  const owner = ownerAccountId === null ? undefined : players.find((p) => int(p.account_id) === ownerAccountId);
  const known = owner ?? players.find((p) => partyAccountIds.includes(int(p.account_id) ?? -1));
  const slot = known ? int(known.player_slot) : null;
  const radiantWin = typeof m.radiant_win === "boolean" ? m.radiant_win : null;
  return {
    matchId,
    startTime: int(m.start_time) ?? 0,
    duration: int(m.duration) ?? 0,
    won: slot === null || radiantWin === null ? null : (slot < 128) === radiantWin,
    radiant: slot === null ? null : slot < 128,
    radiantScore: int(m.radiant_score) ?? 0,
    direScore: int(m.dire_score) ?? 0,
    ppaHeroId: owner ? int(owner.hero_id) : null,
  };
}

/** Resumo já gravado no cache; null quando o formato não serve. */
export function parsePartyMatchSummary(value: unknown): PartyMatchSummary | null {
  const v = record(value);
  const matchId = int(v?.matchId);
  if (!v || !matchId) return null;
  return {
    matchId,
    startTime: int(v.startTime) ?? 0,
    duration: int(v.duration) ?? 0,
    won: typeof v.won === "boolean" ? v.won : null,
    radiant: typeof v.radiant === "boolean" ? v.radiant : null,
    radiantScore: int(v.radiantScore) ?? 0,
    direScore: int(v.direScore) ?? 0,
    ppaHeroId: int(v.ppaHeroId),
  };
}
