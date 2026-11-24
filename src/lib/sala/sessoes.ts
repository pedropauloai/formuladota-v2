// Fecha sessões do SFU (as de uma pessoa ou as de uma sala inteira): corta as faixas à força no
// Realtime, sem troca de SDP, e marca o fim no banco. Usado ao sair, ao expulsar, na sessão nova
// da mesma pessoa, quando ela perde o acesso e no cron.

import "server-only";
import { closeMids, closeSessionRows, openMidsOf, openSessions, openSubscriptions, openVoiceTracksOf, type CloseReason, type SessionRow } from "./dados-rtc";
import { setTurnUsername, turnUsernames, type Db } from "./dados-sala";
import { forceCloseTracks, revokeTurnCredential, type RealtimeEnv } from "./realtime-api";

async function cutOnSfu(db: Db, env: RealtimeEnv | null, sessions: SessionRow[]): Promise<void> {
  if (!env) return;
  await Promise.all(
    sessions.map(async (s) => {
      const mids = await openMidsOf(db, s.id);
      // Melhor esforço: a sessão pode já ter caído no SFU; o banco fecha de qualquer jeito.
      await forceCloseTracks(env, s.id, mids).catch(() => null);
    })
  );
}

export async function closeUserSessions(
  db: Db,
  env: RealtimeEnv | null,
  where: { roomId: string; userId: string; exceptId?: string },
  reason: CloseReason,
  now: Date
): Promise<number> {
  const sessions = (await openSessions(db, { roomId: where.roomId, userId: where.userId })).filter((s) => s.id !== where.exceptId);
  await cutOnSfu(db, env, sessions);
  await closeSessionRows(db, sessions.map((s) => s.id), reason, now);
  return sessions.length;
}

export async function closeSessions(db: Db, env: RealtimeEnv | null, sessions: SessionRow[], reason: CloseReason, now: Date): Promise<void> {
  await cutOnSfu(db, env, sessions);
  await closeSessionRows(db, sessions.map((s) => s.id), reason, now);
}

/** Corta, nas sessões de quem recebe, as faixas que vêm das sessões listadas (bloqueio, expulsão). */
export async function cutSubscriptions(
  db: Db,
  env: RealtimeEnv | null,
  receiverSessionIds: string[],
  shouldCut: (publisherSessionId: string, trackName: string) => boolean,
  now: Date
): Promise<number> {
  const subs = (await openSubscriptions(db, receiverSessionIds)).filter((s) => shouldCut(s.publisherSessionId, s.trackName));
  const bySession = new Map<string, string[]>();
  for (const s of subs) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s.mid]);
  await Promise.all(
    [...bySession].map(async ([sessionId, mids]) => {
      if (env) await forceCloseTracks(env, sessionId, mids).catch(() => null);
      await closeMids(db, sessionId, mids, now);
    })
  );
  return subs.length;
}

/** Fecha à força a voz de uma pessoa (devolvida à plateia ou mutada pelo dono): no SFU e no banco. */
export async function closeVoice(db: Db, env: RealtimeEnv | null, roomId: string, userId: string, now: Date): Promise<number> {
  const voices = await openVoiceTracksOf(db, roomId, userId);
  const bySession = new Map<string, string[]>();
  for (const v of voices) bySession.set(v.sessionId, [...(bySession.get(v.sessionId) ?? []), v.mid]);
  await Promise.all(
    [...bySession].map(async ([sessionId, mids]) => {
      if (env) await forceCloseTracks(env, sessionId, mids).catch(() => null);
      await closeMids(db, sessionId, mids, now);
    })
  );
  return voices.length;
}

/** Revoga a credencial de TURN (de uma pessoa ou da sala inteira): quem saiu à força não usa mais o TURN. */
export async function revokeTurn(db: Db, env: RealtimeEnv | null, roomId: string, userId?: string): Promise<void> {
  if (!env) return;
  const names = await turnUsernames(db, roomId, userId);
  await Promise.all(names.map((name) => revokeTurnCredential(env, name)));
  if (userId) await setTurnUsername(db, roomId, userId, null);
}
