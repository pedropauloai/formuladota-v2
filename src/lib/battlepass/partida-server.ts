// Registro da partida do PPA no servidor: busca a partida na OpenDota pelo ID, acha o time dele e
// troca as contas do Dota pelos jogadores do site com a Steam vinculada.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchOpenDotaMatch } from "@/lib/dota/opendota";
import { isOpenDotaPending, openDotaJson } from "@/lib/dota/opendota-fetch";
import { PPA_ACCOUNT_IDS, accountToSteam64, parseMatchId, partyFromMatch } from "./partida";

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

export async function resolveMatch(input: string): Promise<ResolvedMatch> {
  const matchId = parseMatchId(input);
  if (!matchId) return { ok: false, reason: "id_invalido" };
  let match;
  try {
    match = await fetchOpenDotaMatch(matchId);
  } catch (err) {
    return { ok: false, reason: isOpenDotaPending(err) ? "ainda_nao" : "opendota" };
  }
  const party = partyFromMatch(match, PPA_ACCOUNT_IDS);
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

interface RecentMatch {
  match_id: number;
  start_time: number;
  duration: number;
}

/** A última partida do PPA na OpenDota, para o painel sugerir o ID com um toque. */
export async function ppaLastMatch(): Promise<{ matchId: string; endedAt: string } | null> {
  try {
    const recent = await openDotaJson<RecentMatch[]>(`/players/${PPA_ACCOUNT_IDS[0]}/recentMatches`);
    const last = Array.isArray(recent) ? recent[0] : undefined;
    if (!last?.match_id) return null;
    return { matchId: String(last.match_id), endedAt: new Date((last.start_time + last.duration) * 1000).toISOString() };
  } catch {
    return null;
  }
}
