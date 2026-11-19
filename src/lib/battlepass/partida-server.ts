// Registro da partida do PPA no servidor: busca a partida na OpenDota pelo ID, acha o time dele e
// troca as contas do Dota pelos jogadores do site com a Steam vinculada.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchOpenDotaMatch } from "@/lib/dota/opendota";
import { isOpenDotaPending, openDotaJson } from "@/lib/dota/opendota-fetch";
import { PPA_ACCOUNT_IDS, STEAM64_BASE, accountToSteam64, commonRecentMatch, parseMatchId, partyFromMatch, type RecentMatchLike } from "./partida";

export type ResolvedMatch =
  | {
      ok: true;
      matchId: string;
      playedAt: string;
      /** Jogadores do site no time do PPA, conferidos pela Steam vinculada. */
      confirmedUserIds: string[];
      /** Do time do PPA com o perfil do Dota privado (a OpenDota não mostra quem é). */
      hidden: number;
    }
  | { ok: false; reason: "id_invalido" | "sem_ppa" | "ainda_nao" | "opendota" };

/** Contas do Dota (32 bits) de quem está na party agora, pela Steam vinculada. */
export async function currentPartyAccounts(isTest: boolean): Promise<number[]> {
  const supabase = createServiceClient();
  const { data: party, error } = await supabase.from("store_bookings").select("user_id").eq("is_test", isTest).eq("queue_state", "na_party");
  if (error) throw new Error(`ler a party falhou: ${error.message}`);
  const ids = (party ?? []).map((b) => b.user_id).filter((id): id is string => !!id);
  if (ids.length === 0) return [];
  const { data: links, error: linkError } = await supabase.from("steam_links").select("steam_id_64").in("user_id", ids);
  if (linkError) throw new Error(`ler a Steam da party falhou: ${linkError.message}`);
  return (links ?? []).filter((l) => /^\d{17}$/.test(l.steam_id_64)).map((l) => Number(BigInt(l.steam_id_64) - STEAM64_BASE));
}

export async function resolveMatch(input: string, partyAccounts: readonly number[] = []): Promise<ResolvedMatch> {
  const matchId = parseMatchId(input);
  if (!matchId) return { ok: false, reason: "id_invalido" };
  let match;
  try {
    match = await fetchOpenDotaMatch(matchId);
  } catch (err) {
    return { ok: false, reason: isOpenDotaPending(err) ? "ainda_nao" : "opendota" };
  }
  const party = partyFromMatch(match, PPA_ACCOUNT_IDS, partyAccounts);
  if (!party.ok) return { ok: false, reason: party.reason === "incompleta" ? "ainda_nao" : "sem_ppa" };
  const steamIds = party.teammates.map(accountToSteam64);
  let confirmedUserIds: string[] = [];
  if (steamIds.length > 0) {
    const { data, error } = await createServiceClient().from("steam_links").select("user_id").in("steam_id_64", steamIds);
    if (error) throw new Error(`achar os jogadores da partida falhou: ${error.message}`);
    confirmedUserIds = [...new Set((data ?? []).map((row) => row.user_id))];
  }
  return { ok: true, matchId, playedAt: party.playedAt, confirmedUserIds, hidden: party.hidden };
}

async function recentMatches(accountId: number): Promise<RecentMatchLike[]> {
  try {
    const recent = await openDotaJson<RecentMatchLike[]>(`/players/${accountId}/recentMatches`);
    return Array.isArray(recent) ? recent : [];
  } catch {
    return [];
  }
}

const ended = (m: RecentMatchLike) => ({ matchId: String(m.match_id), endedAt: new Date((m.start_time + m.duration) * 1000).toISOString() });

/**
 * A partida que a party jogou: a mais recente em comum nas partidas recentes de quem está na party
 * (funciona com o PPA numa smurf). Com um só jogador público, a última dele; sem ninguém, a última
 * das contas conhecidas do PPA.
 */
export async function partyLastMatch(partyAccounts: readonly number[]): Promise<{ matchId: string; endedAt: string } | null> {
  const lists = (await Promise.all(partyAccounts.slice(0, 4).map(recentMatches))).filter((l) => l.length > 0);
  if (lists.length > 0) {
    const shared = commonRecentMatch(lists, Math.min(2, lists.length));
    if (shared) return ended(shared);
  }
  const ppa = (await Promise.all(PPA_ACCOUNT_IDS.map(recentMatches))).flat().sort((a, b) => b.start_time - a.start_time)[0];
  return ppa ? ended(ppa) : null;
}
