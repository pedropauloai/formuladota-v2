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
  /** Heróis da party nessa partida (o do PPA primeiro); null no resumo antigo do cache, que se refaz. */
  partyHeroIds: number[] | null;
  /**
   * As contas (32 bits) de quem jogou no time do PPA, sem ele e sem as anônimas: o site reconhece
   * quem delas tem conta no FORMULADOTA. null no resumo antigo, gravado antes desta lista.
   */
  teammates: number[] | null;
}

const ANONYMOUS = 4294967295;

const int = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null);
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/**
 * O lado da party sai de qualquer conta em que o PPA joga; sem nenhuma delas na partida, de quem da
 * party aparece nela (a Steam vinculada no site). Sem ninguém conhecido, o resultado fica em aberto.
 */
export function summarizePartyMatch(match: unknown, ownerAccountIds: readonly number[], partyAccountIds: readonly number[]): PartyMatchSummary | null {
  const m = record(match);
  const matchId = int(m?.match_id);
  if (!m || !matchId) return null;
  const players = Array.isArray(m.players) ? m.players.map(record).filter((p): p is Record<string, unknown> => p !== null) : [];
  // A primeira conta da lista que aparece na partida é o PPA: as dele antes das emprestadas.
  const owner = ownerAccountIds.map((id) => players.find((p) => int(p.account_id) === id)).find((p) => p !== undefined);
  const known = owner ?? players.find((p) => partyAccountIds.includes(int(p.account_id) ?? -1));
  const slot = known ? int(known.player_slot) : null;
  const radiantWin = typeof m.radiant_win === "boolean" ? m.radiant_win : null;
  // Do lado da party, os heróis de quem o site conhece: a conta do PPA e as Steam vinculadas de quem jogou.
  const ofParty = (p: Record<string, unknown>) => {
    const account = int(p.account_id);
    const pSlot = int(p.player_slot);
    return slot !== null && pSlot !== null && (pSlot < 128) === (slot < 128) && account !== null && (p === owner || partyAccountIds.includes(account));
  };
  const partyHeroIds = players
    .filter(ofParty)
    .sort((a, b) => Number(b === owner) - Number(a === owner))
    .map((p) => int(p.hero_id))
    .filter((h): h is number => h !== null && h > 0);
  return {
    matchId,
    startTime: int(m.start_time) ?? 0,
    duration: int(m.duration) ?? 0,
    won: slot === null || radiantWin === null ? null : (slot < 128) === radiantWin,
    radiant: slot === null ? null : slot < 128,
    radiantScore: int(m.radiant_score) ?? 0,
    direScore: int(m.dire_score) ?? 0,
    ppaHeroId: owner ? int(owner.hero_id) : null,
    partyHeroIds,
    teammates: slot === null ? [] : teamAccounts(players, owner, slot < 128),
  };
}

function teamAccounts(players: Record<string, unknown>[], owner: Record<string, unknown> | undefined, radiant: boolean): number[] {
  return players
    .filter((p) => p !== owner && ((int(p.player_slot) ?? 0) < 128) === radiant)
    .map((p) => int(p.account_id))
    .filter((a): a is number => a !== null && a > 0 && a !== ANONYMOUS);
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
    partyHeroIds: Array.isArray(v.partyHeroIds) ? v.partyHeroIds.map(int).filter((h): h is number => h !== null && h > 0) : null,
    teammates: Array.isArray(v.teammates) ? v.teammates.map(int).filter((a): a is number => a !== null) : null,
  };
}
