// Registro da partida do PPA pelo ID (OpenDota): quem jogou no time dele e quando a partida
// acabou. Regra pura; quem busca a partida e acha os jogadores pela Steam é o servidor.

/**
 * Contas do Dota do PPA (32 bits): a principal, a primeira (credencial da loja, 07/11/2026) e a
 * smurf "n tenho inimigos" (partida 9097240074, 19/11/2026). Smurf nova não precisa entrar aqui:
 * o registro acha o time pelos jogadores da party.
 */
export const PPA_ACCOUNT_IDS: readonly number[] = [1123609219, 201687094, 1667196039];

export const STEAM64_BASE = 76561197960265728n;

export interface MatchPlayerLike {
  account_id: number | null;
  player_slot: number;
}

export interface MatchLike {
  match_id: number;
  start_time: number;
  duration: number;
  players: readonly MatchPlayerLike[];
}

export type PartyFromMatch =
  | {
      ok: true;
      /** Fim da partida (início + duração), a hora que vale para o revezamento. */
      playedAt: string;
      /** Contas do time do PPA, sem ele (só as públicas na OpenDota). */
      teammates: number[];
      /** Quantos do time do PPA estão com o perfil do Dota privado. */
      hidden: number;
    }
  | { ok: false; reason: "sem_ppa" | "incompleta" };

const isRadiant = (slot: number) => slot < 128;

/**
 * O time do PPA: pela conta dele, ou, se ele jogou numa conta que o site não conhece (smurf), pelo
 * lado onde estão os jogadores da party (`partyAccounts`).
 */
export function partyFromMatch(match: MatchLike, ppaAccountIds: readonly number[] = PPA_ACCOUNT_IDS, partyAccounts: readonly number[] = []): PartyFromMatch {
  if (!Array.isArray(match.players) || match.players.length !== 10 || !match.start_time) return { ok: false, reason: "incompleta" };
  const has = (ids: readonly number[]) => (p: MatchPlayerLike) => p.account_id !== null && ids.includes(p.account_id);
  const ppa = match.players.find(has(ppaAccountIds));
  const anchor = ppa ?? match.players.find(has(partyAccounts));
  if (!anchor) return { ok: false, reason: "sem_ppa" };
  const team = match.players.filter((p) => p !== ppa && isRadiant(p.player_slot) === isRadiant(anchor.player_slot));
  const teammates = team.flatMap((p) => (p.account_id === null || p.account_id === 4294967295 ? [] : [p.account_id]));
  return {
    ok: true,
    playedAt: new Date((match.start_time + Math.max(0, match.duration)) * 1000).toISOString(),
    teammates,
    hidden: team.length - teammates.length,
  };
}

/** Conta do Dota (32 bits) para o SteamID64 que a tabela steam_links guarda. */
export function accountToSteam64(accountId: number): string {
  return String(STEAM64_BASE + BigInt(accountId));
}

/** Aceita o ID como o PPA cola: só dígitos, com ou sem o link do OpenDota ou do STRATZ. */
export function parseMatchId(input: string): string | null {
  const match = /(?:^|\/matches\/|\/match\/)?(\d{9,12})(?:\D*$)/.exec(input.trim());
  return match?.[1] ?? null;
}

export interface RecentMatchLike {
  match_id: number;
  start_time: number;
  duration: number;
}

/**
 * A partida mais recente que aparece nas listas de pelo menos `minShared` contas (as partidas
 * recentes de cada jogador da party na OpenDota): é a partida que eles jogaram juntos.
 */
export function commonRecentMatch(lists: readonly (readonly RecentMatchLike[])[], minShared: number): RecentMatchLike | null {
  const seen = new Map<number, { match: RecentMatchLike; count: number }>();
  for (const list of lists) {
    for (const m of new Map(list.map((x) => [x.match_id, x])).values()) {
      const cur = seen.get(m.match_id);
      seen.set(m.match_id, { match: m, count: (cur?.count ?? 0) + 1 });
    }
  }
  const shared = [...seen.values()].filter((v) => v.count >= Math.max(1, minShared)).map((v) => v.match);
  return shared.sort((a, b) => b.start_time - a.start_time)[0] ?? null;
}
