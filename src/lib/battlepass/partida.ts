// Registro da partida do PPA pelo ID (OpenDota): quem jogou no time dele e quando a partida
// acabou. Regra pura; quem busca a partida e acha os jogadores pela Steam é o servidor.

/** Contas do Dota do PPA (32 bits): a principal e a primeira (credencial da loja, 07/11/2026). */
export const PPA_ACCOUNT_IDS: readonly number[] = [1123609219, 201687094];

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

export function partyFromMatch(match: MatchLike, ppaAccountIds: readonly number[] = PPA_ACCOUNT_IDS): PartyFromMatch {
  if (!Array.isArray(match.players) || match.players.length !== 10 || !match.start_time) return { ok: false, reason: "incompleta" };
  const ppa = match.players.find((p) => p.account_id !== null && ppaAccountIds.includes(p.account_id));
  if (!ppa) return { ok: false, reason: "sem_ppa" };
  const team = match.players.filter((p) => p !== ppa && isRadiant(p.player_slot) === isRadiant(ppa.player_slot));
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
