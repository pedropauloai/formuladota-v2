// Publicar e receber faixas pelo intermediário: o tipo de cada faixa publicada sai do SDP da oferta,
// e só passa ao SFU o que as regras de faixas.ts deixam. O que passa vira linha no banco.

import "server-only";
import { z } from "zod";
import type { CallContext } from "./contexto";
import { capBytesFor, rateKbpsFor } from "./custo";
import { activeTracks, findTrack, getSession, insertSubscriptions, insertTracks, openSessions, openSubscriptions, previousLabels, type SessionRow } from "./dados-rtc";
import { blockedPairsAmong, isBlockedPair, listMembers } from "./dados-sala";
import { computeUsageBytes } from "./dados-uso";
import { decidePublish, decideSubscribe, type SubscribeTarget } from "./faixas";
import { sfu, type RealtimeEnv } from "./realtime-api";
import { midKinds } from "./sdp";
import type { TrackKind } from "./tipos";

const SID = /^[A-Za-z0-9_-]{8,128}$/;
const Sdp = z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().min(1).max(60_000) });
const Track = z.object({
  location: z.enum(["local", "remote"]),
  mid: z.string().min(1).max(32).optional(),
  trackName: z.string().min(1).max(128),
  sessionId: z.string().regex(SID).optional(),
});
export const TracksBody = z.object({ sessionDescription: Sdp.optional(), tracks: z.array(Track).min(1).max(16) });
type Tracks = z.infer<typeof TracksBody>;

const deny = (status: number, errorCode: string, errorDescription: string) =>
  Response.json({ errorCode, errorDescription, tracks: [] }, { status });

interface SfuTrack {
  mid?: string;
  trackName?: string;
  sessionId?: string;
  errorCode?: string;
}

function tracksOf(body: Record<string, unknown>): SfuTrack[] {
  return Array.isArray(body.tracks) ? (body.tracks as SfuTrack[]) : [];
}

async function publish(ctx: CallContext, env: RealtimeEnv, session: SessionRow, body: Tracks): Promise<Response> {
  const { room, settings, decision, userId } = ctx;
  if (!room || !settings || !decision.ok || !userId) return deny(403, "sem_acesso", "sem acesso à sala");
  if (body.sessionDescription?.type !== "offer") return deny(400, "corpo_invalido", "publicar pede a oferta SDP");
  const kinds = midKinds(body.sessionDescription.sdp);
  const requested = body.tracks.map((t) => (t.mid ? kinds.get(t.mid) : undefined));
  if (requested.some((k) => !k)) return deny(400, "faixa_sem_tipo", "faixa sem seção de áudio ou vídeo na oferta");
  const kindsAsked = requested as TrackKind[];
  const tracks = await activeTracks(ctx.db, await openSessions(ctx.db, { roomId: room.id }));
  const mine = tracks.filter((t) => t.sessionId === session.id);
  const wantsVideo = kindsAsked.includes("video");
  const capReached = wantsVideo && (await computeUsageBytes(ctx.db, ctx.now, undefined, room.isTest)) >= capBytesFor(settings.capGb30d);
  const rule = decidePublish({
    role: decision.role,
    roomKind: room.kind,
    screenPolicy: room.screenPolicy,
    partyScreenEnabled: settings.partyScreenEnabled,
    requested: kindsAsked,
    mine: { audio: mine.filter((t) => t.kind === "audio").length, video: mine.filter((t) => t.kind === "video").length },
    videoActiveByOthers: tracks.some((t) => t.kind === "video" && t.userId !== userId),
    capReached,
  });
  if (!rule.ok) return deny(403, rule.code, "publicação recusada pela regra da sala");
  const forward = { sessionDescription: body.sessionDescription, tracks: body.tracks.map(({ mid, trackName }) => ({ location: "local", mid, trackName })) };
  const res = await sfu(env, `/sessions/${session.id}/tracks/new`, { method: "POST", body: forward });
  if (res.status < 300) {
    const accepted = tracksOf(res.body).filter((t) => !t.errorCode && t.mid && t.trackName && kinds.get(t.mid));
    const labels = await previousLabels(ctx.db, room.id, userId, accepted.map((t) => t.trackName as string));
    await insertTracks(
      ctx.db,
      accepted.map((t) => ({ sessionId: session.id, trackName: t.trackName as string, mid: t.mid as string, kind: kinds.get(t.mid as string) as TrackKind, tipo: labels.get(t.trackName as string) ?? null }))
    );
  }
  return Response.json(res.body, { status: res.status });
}

async function targetsFor(ctx: CallContext, remotes: Tracks["tracks"]): Promise<Array<SubscribeTarget | null>> {
  const roomId = ctx.room?.id ?? "";
  const members = await listMembers(ctx.db, roomId);
  const since = ctx.now.getTime() - 15_000;
  const active = new Set(members.filter((m) => m.status === "ativo" && m.lastSeenAt && new Date(m.lastSeenAt).getTime() > since).map((m) => m.userId));
  return Promise.all(
    remotes.map(async (t) => {
      if (!t.sessionId) return null;
      const [pub, track] = await Promise.all([getSession(ctx.db, t.sessionId), findTrack(ctx.db, t.sessionId, t.trackName)]);
      if (!pub || !track) return null;
      return { roomId: pub.roomId, userId: pub.userId, closed: track.closed || !!pub.closedAt, tipo: track.tipo, publisherActive: active.has(pub.userId) };
    })
  );
}

async function subscribe(ctx: CallContext, env: RealtimeEnv, session: SessionRow, body: Tracks): Promise<Response> {
  const { room, settings, userId } = ctx;
  if (!room || !settings || !userId) return deny(403, "sem_acesso", "sem acesso à sala");
  const targets = await targetsFor(ctx, body.tracks);
  const blocked = await blockedPairsAmong(ctx.db, [userId, ...targets.flatMap((t) => (t ? [t.userId] : []))]);
  const mine = await openSubscriptions(ctx.db, [session.id]);
  for (const [i, t] of body.tracks.entries()) {
    const target = targets[i] ?? null;
    const rule = decideSubscribe({
      subscriberUserId: userId,
      roomId: room.id,
      target,
      blockedPair: target ? isBlockedPair(blocked, userId, target.userId) : false,
      alreadySubscribed: mine.some((s) => s.publisherSessionId === t.sessionId && s.trackName === t.trackName),
    });
    if (!rule.ok) return deny(403, rule.code, "recebimento recusado pela regra da sala");
  }
  const forward = { tracks: body.tracks.map(({ sessionId, trackName }) => ({ location: "remote", sessionId, trackName })) };
  const res = await sfu(env, `/sessions/${session.id}/tracks/new`, { method: "POST", body: forward });
  if (res.status < 300) {
    const rows = tracksOf(res.body).flatMap((t) => {
      const i = body.tracks.findIndex((r) => r.sessionId === t.sessionId && r.trackName === t.trackName);
      const target = i >= 0 ? targets[i] : null;
      if (t.errorCode || !t.mid || !target) return [];
      const kind: TrackKind = target.tipo === "tela" ? "video" : "audio";
      return [{ sessionId: session.id, mid: t.mid, publisherSessionId: t.sessionId as string, trackName: t.trackName as string, kind, rateKbps: rateKbpsFor(kind, target.tipo, settings.videoMaxKbps), isTest: room.isTest }];
    });
    await insertSubscriptions(ctx.db, rows);
  }
  return Response.json(res.body, { status: res.status });
}

export async function handleNewTracks(ctx: CallContext, env: RealtimeEnv, session: SessionRow, body: Tracks): Promise<Response> {
  const locals = body.tracks.filter((t) => t.location === "local");
  if (locals.length > 0 && locals.length < body.tracks.length) return deny(400, "corpo_invalido", "publicar e receber no mesmo pedido");
  return locals.length > 0 ? publish(ctx, env, session, body) : subscribe(ctx, env, session, body);
}
