// Status da fila do usuário atual: em qual PRO ele está, posição, tempo.

import { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";

export interface MyQueueEntry {
  entryId: string;
  coachId: string;
  coachUsername: string | null;
  coachAvatar: string | null;
  /** Posição (1-based) na fila ordenada por LRU (pts_today ASC, joined_at ASC). */
  position: number;
  total: number;
  joinedAt: string;
  waitingMinutes: number;
  /** Quantas PTs o user já jogou com esse coach nas últimas 24h. */
  ptsToday: number;
}

/**
 * Ordena entries por LRU justo: quem jogou menos PTs com o coach nas últimas
 * 24h tem prioridade. Empate desempata por joined_at (FIFO).
 */
function sortByLRU<
  T extends { user_id: string; coach_id: string; joined_at: string }
>(
  entries: T[],
  ptsTodayMap: Map<string, number>
): Array<T & { ptsToday: number }> {
  return entries
    .map((e) => ({
      ...e,
      ptsToday: ptsTodayMap.get(`${e.user_id}::${e.coach_id}`) ?? 0,
    }))
    .sort((a, b) => {
      if (a.ptsToday !== b.ptsToday) return a.ptsToday - b.ptsToday;
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    });
}

/**
 * Busca PTs consumed nas últimas 24h e devolve mapa (user_id::coach_id → count).
 * Compartilhado entre getMyQueueStatus e getProsWithQueues.
 */
export async function getPtsTodayMap(
  coachIds: string[]
): Promise<Map<string, number>> {
  if (coachIds.length === 0) return new Map();
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: consumedRecent } = await supabase
    .from("coach_queue_entries")
    .select("user_id, coach_id")
    .in("coach_id", coachIds)
    .eq("status", "consumed")
    .gte("consumed_at", since);
  const map = new Map<string, number>();
  for (const e of consumedRecent ?? []) {
    const key = `${e.user_id}::${e.coach_id}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export async function getMyQueueStatus(userId: string): Promise<MyQueueEntry[]> {
  const supabase = await createClient();

  // Entries waiting do user atual
  const { data: myEntries } = await supabase
    .from("coach_queue_entries")
    .select("id, coach_id, user_id, joined_at")
    .eq("user_id", userId)
    .eq("status", "waiting");

  if (!myEntries || myEntries.length === 0) return [];

  const coachIds = [...new Set(myEntries.map((e) => e.coach_id))];

  // Pega TODAS entries waiting dos coaches em que user está (pra calcular posição)
  const { data: allEntries } = await supabase
    .from("coach_queue_entries")
    .select("id, coach_id, user_id, joined_at")
    .in("coach_id", coachIds)
    .eq("status", "waiting");

  // Buscar info dos coaches
  const { data: coachRows } = await supabase
    .from("coaches")
    .select("id, profile_id")
    .in("id", coachIds);
  // Profiles (Discord) + steam_links (identidade canônica) em paralelo —
  // nick/avatar exibidos seguem a lib/identity: Steam > Discord.
  const profileIds = (coachRows ?? []).map((c) => c.profile_id);
  const [{ data: profiles }, steamMap] = await Promise.all([
    profileIds.length
      ? supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", profileIds)
      : Promise.resolve({ data: null }),
    getSteamIdentityMap(supabase, profileIds),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const coachInfoById = new Map(
    (coachRows ?? []).map((c) => {
      const p = profileById.get(c.profile_id);
      const ident = resolveIdentity(steamMap, c.profile_id, p?.username, p?.avatar_url);
      return [c.id, { username: ident.name, avatar: ident.avatarUrl }];
    })
  );

  // PTs hoje (LRU)
  const ptsTodayMap = await getPtsTodayMap(coachIds);

  // Para cada minha entry, calcular posição LRU na fila daquele coach
  const result: MyQueueEntry[] = myEntries.map((me) => {
    const coachQueue = (allEntries ?? []).filter((e) => e.coach_id === me.coach_id);
    const sortedQueue = sortByLRU(coachQueue, ptsTodayMap);
    const position = sortedQueue.findIndex((e) => e.id === me.id) + 1;
    const coachInfo = coachInfoById.get(me.coach_id) ?? { username: null, avatar: null };
    const waitingMinutes = Math.floor(
      (Date.now() - new Date(me.joined_at).getTime()) / 60000
    );
    return {
      entryId: me.id,
      coachId: me.coach_id,
      coachUsername: coachInfo.username,
      coachAvatar: coachInfo.avatar,
      position,
      total: coachQueue.length,
      joinedAt: me.joined_at,
      waitingMinutes,
      ptsToday: ptsTodayMap.get(`${me.user_id}::${me.coach_id}`) ?? 0,
    };
  });

  // Ordena resultado por urgência (menor posição primeiro)
  return result.sort((a, b) => a.position - b.position);
}

/**
 * Quantos jogadores estão buscando partida agora — entries `waiting` em qualquer PRO.
 * Indicador "buscando partida" do header. Atualiza via Realtime (QueueRealtimeListener
 * dispara router.refresh em mudanças de coach_queue_entries).
 */
export async function getSearchingCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("coach_queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting");
  return count ?? 0;
}
