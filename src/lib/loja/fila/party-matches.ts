// As partidas que o PPA registra com o ID no painel da fila ("Partida terminou", party_participacoes):
// a lista pública de quem jogou com ele (coluna da direita e /partidas) e, para o cron, as contas da
// Steam de quem jogou cada uma (o lado da party numa smurf). Service role: a tabela só abre para o
// próprio jogador e o admin; daqui sai só o que já é público (nome e avatar da identidade pública).

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { PARTY_MATCHES_CACHED, parseOwnerProofData } from "@/lib/loja/owner-proof-data";

const STEAM_BASE = BigInt("76561197960265728");

export interface RegisteredPartyMatch {
  matchId: number;
  playedAt: string;
  players: { userId: string; name: string; avatarUrl: string | null }[];
}

interface Row {
  user_id: string;
  dota_match_id: number;
  played_at: string;
}

/** As últimas partidas registradas com o ID (só as de verdade), cada uma com quem jogou. */
async function latestRows(limit: number): Promise<{ matchId: number; playedAt: string; userIds: string[] }[]> {
  const { data, error } = await createServiceClient()
    .from("party_participacoes")
    .select("user_id, dota_match_id, played_at")
    .eq("is_test", false)
    .eq("kind", "jogou")
    .not("dota_match_id", "is", null)
    .order("played_at", { ascending: false })
    .limit(limit * 6);
  if (error) throw new Error(`ler as partidas da party falhou: ${error.message}`);
  const groups = new Map<number, { matchId: number; playedAt: string; userIds: string[] }>();
  for (const r of (data ?? []) as Row[]) {
    const group = groups.get(r.dota_match_id) ?? { matchId: r.dota_match_id, playedAt: r.played_at, userIds: [] };
    if (!group.userIds.includes(r.user_id)) group.userIds.push(r.user_id);
    groups.set(r.dota_match_id, group);
  }
  return [...groups.values()].slice(0, limit);
}

/** Do resumo que o cron guardou: as contas de quem jogou no time do PPA em cada partida. */
async function cachedTeams(): Promise<Map<number, number[]>> {
  const { data } = await createServiceClient().from("store_owner_proof").select("data").eq("id", 1).maybeSingle();
  const proof = parseOwnerProofData(data?.data ?? null);
  return new Map((proof?.partyMatches ?? []).map((s) => [s.matchId, s.teammates ?? []]));
}

/** De cada conta da Steam (32 bits), quem a vinculou no FORMULADOTA. */
async function linkedUsers(accounts: number[]): Promise<Map<number, string>> {
  if (accounts.length === 0) return new Map();
  const steamIds = accounts.map((a) => (STEAM_BASE + BigInt(a)).toString());
  const { data, error } = await createServiceClient().from("steam_links").select("user_id, steam_id_64").in("steam_id_64", steamIds);
  if (error) throw new Error(`ler as contas do time do PPA falhou: ${error.message}`);
  return new Map((data ?? []).map((l) => [Number(BigInt(l.steam_id_64) - STEAM_BASE), l.user_id]));
}

/**
 * Quem jogou: os da party registrados na fila e, sozinho, quem do time do PPA tem conta no site
 * (a OpenDota mostra a conta, a Steam vinculada diz quem é), mesmo sem ter passado pela fila.
 */
export async function getRegisteredPartyMatches(limit = PARTY_MATCHES_CACHED): Promise<RegisteredPartyMatch[]> {
  const [registered, teams] = await Promise.all([latestRows(limit), cachedTeams()]);
  const users = await linkedUsers([...new Set([...teams.values()].flat())]);
  const rows = registered.map((r) => {
    const fromTeam = (teams.get(r.matchId) ?? []).flatMap((a) => {
      const id = users.get(a);
      return id ? [id] : [];
    });
    return { ...r, userIds: [...new Set([...r.userIds, ...fromTeam])] };
  });
  const identities = await getIdentityMap(await createClient(), [...new Set(rows.flatMap((r) => r.userIds))]);
  return rows.map((r) => ({
    matchId: r.matchId,
    playedAt: r.playedAt,
    players: r.userIds.map((id) => ({ userId: id, name: identities.get(id)?.name ?? "Jogador", avatarUrl: identities.get(id)?.avatarUrl ?? null })),
  }));
}

/** Para o cron: as partidas registradas e as contas da Steam (32 bits) de quem jogou cada uma. */
export async function registeredMatchAccounts(limit = PARTY_MATCHES_CACHED): Promise<{ matchId: number; accounts: number[] }[]> {
  const rows = await latestRows(limit);
  const userIds = [...new Set(rows.flatMap((r) => r.userIds))];
  if (userIds.length === 0) return [];
  const { data, error } = await createServiceClient().from("steam_links").select("user_id, steam_id_64").in("user_id", userIds);
  if (error) throw new Error(`ler as contas da party falhou: ${error.message}`);
  const account = new Map((data ?? []).map((l) => [l.user_id, Number(BigInt(l.steam_id_64) - STEAM_BASE)]));
  return rows.map((r) => ({ matchId: r.matchId, accounts: r.userIds.map((id) => account.get(id)).filter((a): a is number => a !== undefined) }));
}
