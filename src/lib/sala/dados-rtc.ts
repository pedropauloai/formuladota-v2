// Sessões do SFU, faixas publicadas e faixas recebidas no banco (service role). A faixa recebida é a
// base da estimativa de custo: quando uma faixa publicada fecha, as recepções dela fecham junto.

import "server-only";
import type { Db } from "./dados-sala";
import type { Layer, Quality, TrackKind, TrackLabel } from "./tipos";

export interface SessionRow {
  id: string;
  roomId: string;
  userId: string;
  closedAt: string | null;
}

export interface TrackRow {
  sessionId: string;
  userId: string;
  roomId: string;
  trackName: string;
  mid: string;
  kind: TrackKind;
  tipo: TrackLabel | null;
  quality: Quality | null;
}

export interface SubscriptionRow {
  id: number;
  sessionId: string;
  mid: string;
  publisherSessionId: string;
  trackName: string;
  kind: TrackKind;
  rid: Layer | null;
}

export type CloseReason = "saiu" | "nova_sessao" | "expulso" | "sem_batimento" | "sala_encerrada" | "acesso_perdido";

export async function getSession(db: Db, id: string): Promise<SessionRow | null> {
  const { data } = await db.from("voice_room_sessions").select("id, room_id, user_id, closed_at").eq("id", id).maybeSingle();
  return data ? { id: data.id, roomId: data.room_id, userId: data.user_id, closedAt: data.closed_at } : null;
}

export async function openSessions(db: Db, filter: { roomId: string; userId?: string }): Promise<SessionRow[]> {
  let q = db.from("voice_room_sessions").select("id, room_id, user_id, closed_at").eq("room_id", filter.roomId).is("closed_at", null);
  if (filter.userId) q = q.eq("user_id", filter.userId);
  const { data, error } = await q;
  if (error) throw new Error(`ler as sessões: ${error.message}`);
  return (data ?? []).map((s) => ({ id: s.id, roomId: s.room_id, userId: s.user_id, closedAt: s.closed_at }));
}

export async function insertSession(db: Db, row: { id: string; roomId: string; userId: string; ip: string | null; userAgent: string | null }): Promise<void> {
  const { error } = await db.from("voice_room_sessions").insert({ id: row.id, room_id: row.roomId, user_id: row.userId, ip: row.ip, user_agent: row.userAgent });
  if (error) throw new Error(`gravar a sessão: ${error.message}`);
}

/** Marca as sessões como fechadas e encerra, no banco, o que elas publicavam, o que recebiam e o que
 *  os outros recebiam delas. */
export async function closeSessionRows(db: Db, ids: string[], reason: CloseReason, now: Date): Promise<void> {
  if (ids.length === 0) return;
  const at = now.toISOString();
  await db.from("voice_room_sessions").update({ closed_at: at, close_reason: reason }).in("id", ids).is("closed_at", null);
  await db.from("voice_room_tracks").update({ closed_at: at }).in("session_id", ids).is("closed_at", null);
  await db.from("voice_room_subscriptions").update({ ended_at: at }).in("session_id", ids).is("ended_at", null);
  await db.from("voice_room_subscriptions").update({ ended_at: at }).in("publisher_session_id", ids).is("ended_at", null);
}

type TrackSelect = { session_id: string; track_name: string; mid: string; kind: string; tipo: string | null; quality: string | null };

function toTrack(t: TrackSelect, s: SessionRow): TrackRow {
  return {
    sessionId: t.session_id, userId: s.userId, roomId: s.roomId, trackName: t.track_name, mid: t.mid,
    kind: t.kind as TrackKind, tipo: t.tipo as TrackLabel | null, quality: t.quality as Quality | null,
  };
}

/** Faixas abertas das sessões dadas. */
export async function activeTracks(db: Db, sessions: SessionRow[]): Promise<TrackRow[]> {
  if (sessions.length === 0) return [];
  const bySession = new Map(sessions.map((s) => [s.id, s]));
  const { data, error } = await db
    .from("voice_room_tracks")
    .select("session_id, track_name, mid, kind, tipo, quality")
    .in("session_id", [...bySession.keys()])
    .is("closed_at", null);
  if (error) throw new Error(`ler as faixas: ${error.message}`);
  return (data ?? []).map((t) => toTrack(t, bySession.get(t.session_id) as SessionRow));
}

/** Rótulo que a mesma faixa já tinha numa sessão anterior (o partytracks republica com o mesmo nome). */
export async function previousLabels(db: Db, roomId: string, userId: string, trackNames: string[]): Promise<Map<string, { tipo: TrackLabel; quality: Quality | null }>> {
  if (trackNames.length === 0) return new Map();
  const { data: sessions } = await db.from("voice_room_sessions").select("id").eq("room_id", roomId).eq("user_id", userId);
  const ids = (sessions ?? []).map((s) => s.id);
  if (ids.length === 0) return new Map();
  const { data } = await db.from("voice_room_tracks").select("track_name, tipo, quality").in("session_id", ids).in("track_name", trackNames).not("tipo", "is", null);
  return new Map((data ?? []).map((t) => [t.track_name, { tipo: t.tipo as TrackLabel, quality: t.quality as Quality | null }]));
}

export async function insertTracks(db: Db, rows: Array<{ sessionId: string; trackName: string; mid: string; kind: TrackKind; tipo: TrackLabel | null; quality: Quality | null }>): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db.from("voice_room_tracks").upsert(
    rows.map((r) => ({ session_id: r.sessionId, track_name: r.trackName, mid: r.mid, kind: r.kind, tipo: r.tipo, quality: r.quality, closed_at: null })),
    { onConflict: "session_id,track_name" }
  );
  if (error) throw new Error(`gravar as faixas: ${error.message}`);
}

export async function labelTrack(db: Db, sessionId: string, trackName: string, tipo: TrackLabel, quality: Quality | null): Promise<void> {
  const { error } = await db.from("voice_room_tracks").update({ tipo, quality }).eq("session_id", sessionId).eq("track_name", trackName).is("closed_at", null);
  if (error) throw new Error(`rotular a faixa: ${error.message}`);
}

export async function findTrack(db: Db, sessionId: string, trackName: string): Promise<{ kind: TrackKind; tipo: TrackLabel | null; quality: Quality | null; closed: boolean } | null> {
  const { data } = await db.from("voice_room_tracks").select("kind, tipo, quality, closed_at").eq("session_id", sessionId).eq("track_name", trackName).maybeSingle();
  if (!data) return null;
  return { kind: data.kind as TrackKind, tipo: data.tipo as TrackLabel | null, quality: data.quality as Quality | null, closed: data.closed_at !== null };
}

export async function openSubscriptions(db: Db, sessionIds: string[]): Promise<SubscriptionRow[]> {
  if (sessionIds.length === 0) return [];
  const { data, error } = await db
    .from("voice_room_subscriptions")
    .select("id, session_id, mid, publisher_session_id, track_name, kind, rid")
    .in("session_id", sessionIds)
    .is("ended_at", null);
  if (error) throw new Error(`ler as faixas recebidas: ${error.message}`);
  return (data ?? []).map((s) => ({
    id: s.id, sessionId: s.session_id, mid: s.mid, publisherSessionId: s.publisher_session_id, trackName: s.track_name,
    kind: s.kind as TrackKind, rid: s.rid as Layer | null,
  }));
}

export interface NewSubscription {
  sessionId: string;
  mid: string;
  publisherSessionId: string;
  trackName: string;
  kind: TrackKind;
  rid: Layer | null;
  rateKbps: number;
  isTest: boolean;
}

export async function insertSubscriptions(db: Db, rows: NewSubscription[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db.from("voice_room_subscriptions").insert(
    rows.map((r) => ({
      session_id: r.sessionId, mid: r.mid, publisher_session_id: r.publisherSessionId, track_name: r.trackName,
      kind: r.kind, rid: r.rid, rate_kbps: r.rateKbps, is_test: r.isTest,
    }))
  );
  if (error) throw new Error(`gravar as faixas recebidas: ${error.message}`);
}

/** Troca de camada: fecha a linha da camada antiga e abre outra com a nova taxa (o custo muda junto). */
export async function switchSubscriptionLayer(db: Db, sub: SubscriptionRow, rid: Layer, rateKbps: number, isTest: boolean, now: Date): Promise<void> {
  await db.from("voice_room_subscriptions").update({ ended_at: now.toISOString() }).eq("id", sub.id).is("ended_at", null);
  await insertSubscriptions(db, [{ sessionId: sub.sessionId, mid: sub.mid, publisherSessionId: sub.publisherSessionId, trackName: sub.trackName, kind: sub.kind, rid, rateKbps, isTest }]);
}

/** Fecha, no banco, o que a sessão publicava ou recebia nesses mids, e o que os outros recebiam dela neles. */
export async function closeMids(db: Db, sessionId: string, mids: string[], now: Date): Promise<void> {
  if (mids.length === 0) return;
  const at = now.toISOString();
  const { data: published } = await db.from("voice_room_tracks").select("track_name").eq("session_id", sessionId).in("mid", mids).is("closed_at", null);
  await db.from("voice_room_tracks").update({ closed_at: at }).eq("session_id", sessionId).in("mid", mids).is("closed_at", null);
  await db.from("voice_room_subscriptions").update({ ended_at: at }).eq("session_id", sessionId).in("mid", mids).is("ended_at", null);
  const names = (published ?? []).map((t) => t.track_name);
  if (names.length) await db.from("voice_room_subscriptions").update({ ended_at: at }).eq("publisher_session_id", sessionId).in("track_name", names).is("ended_at", null);
}

/** Todos os mids abertos da sessão, publicados e recebidos, para o fechamento forçado no SFU. */
export async function openMidsOf(db: Db, sessionId: string): Promise<string[]> {
  const [tracks, subs] = await Promise.all([
    db.from("voice_room_tracks").select("mid").eq("session_id", sessionId).is("closed_at", null),
    db.from("voice_room_subscriptions").select("mid").eq("session_id", sessionId).is("ended_at", null),
  ]);
  return [...new Set([...(tracks.data ?? []).map((t) => t.mid), ...(subs.data ?? []).map((s) => s.mid)])];
}

/** As faixas de voz abertas de uma pessoa na sala (devolver à plateia e mutar pelo dono fecham a voz). */
export async function openVoiceTracksOf(db: Db, roomId: string, userId: string): Promise<Array<{ sessionId: string; mid: string }>> {
  const sessions = await openSessions(db, { roomId, userId });
  const tracks = await activeTracks(db, sessions);
  return tracks.filter((t) => t.kind === "audio" && t.tipo !== "tela_audio").map((t) => ({ sessionId: t.sessionId, mid: t.mid }));
}
