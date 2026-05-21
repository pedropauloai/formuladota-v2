// Status da fila do usuário atual: em qual PRO ele está, posição, tempo.

import { createClient } from "@/lib/supabase/server";

export interface MyQueueEntry {
  entryId: string;
  coachId: string;
  coachUsername: string | null;
  coachAvatar: string | null;
  position: number; // 1-based posição na fila daquele coach
  total: number; // total na fila do coach
  joinedAt: string;
  waitingMinutes: number;
}

export async function getMyQueueStatus(userId: string): Promise<MyQueueEntry[]> {
  const supabase = await createClient();

  // Entries waiting do user atual
  const { data: myEntries } = await supabase
    .from("coach_queue_entries")
    .select("id, coach_id, joined_at")
    .eq("user_id", userId)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true });

  if (!myEntries || myEntries.length === 0) return [];

  // Pega TODAS entries waiting dos coaches em que user está (pra calcular posição)
  const coachIds = myEntries.map((e) => e.coach_id);
  const { data: allEntries } = await supabase
    .from("coach_queue_entries")
    .select("id, coach_id, user_id, joined_at")
    .in("coach_id", coachIds)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true });

  // Buscar info dos coaches
  const { data: coachRows } = await supabase
    .from("coaches")
    .select("id, profile_id")
    .in("id", coachIds);
  const profileIds = (coachRows ?? []).map((c) => c.profile_id);
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", profileIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const coachInfoById = new Map(
    (coachRows ?? []).map((c) => {
      const p = profileById.get(c.profile_id);
      return [c.id, { username: p?.username ?? null, avatar: p?.avatar_url ?? null }];
    })
  );

  // Para cada minha entry, calcular posição na fila daquele coach
  const result: MyQueueEntry[] = myEntries.map((me) => {
    const coachQueue = (allEntries ?? []).filter((e) => e.coach_id === me.coach_id);
    const position = coachQueue.findIndex((e) => e.id === me.id) + 1;
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
    };
  });

  return result;
}
