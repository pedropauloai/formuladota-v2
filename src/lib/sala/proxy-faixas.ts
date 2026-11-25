// Publicar, receber e trocar a camada pelo intermediário: o tipo de cada faixa publicada sai do SDP
// da oferta, a camada da tela de cada pessoa sai da regra de custo, e só passa ao SFU o que as regras
// de faixas.ts deixam. O que passa vira linha no banco.

import "server-only";
import { z } from "zod";
import type { CallContext } from "./contexto";
import { capBytesFor, rateKbpsFor } from "./custo";
import { activeTracks, findTrack, getSession, insertSubscriptions, insertTracks, openSessions, openSubscriptions, previousLabels, switchSubscriptionLayer, type NewSubscription, type SessionRow } from "./dados-rtc";
import { blockedAmong, memberRows } from "./dados-sala";
import { computeUsageBytes, windowStartFor } from "./dados-uso";
import { checkLayerUpdate, decideLayer, decidePublish, decideSubscribe, hasRepeatedPull, publisherMayKeep, type SubscribeTarget } from "./faixas";
import { effectiveRole } from "./papeis";
import { sfu, type RealtimeEnv } from "./realtime-api";
import { midKinds } from "./sdp";
import type { Layer, Quality, TrackKind, TrackLabel } from "./tipos";

const SID = /^[A-Za-z0-9_-]{8,128}$/;
const ONLINE_MS = 30_000;
const Sdp = z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().min(1).max(60_000) });
const Track = z.object({
  location: z.enum(["local", "remote"]),
  mid: z.string().min(1).max(32).optional(),
  trackName: z.string().min(1).max(128),
  sessionId: z.string().regex(SID).optional(),
  simulcast: z.object({ preferredRid: z.enum(["f", "h"]) }).optional(),
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

/** f fica na alta: a troca do SFU por banda travava a tela (subia, congelava 3 s e voltava, medido no
 *  pnpm sala:tela); só passa para h quando quem transmite para de mandar a alta. h é de quem está fora da página. */
function simulcastFor(rid: Layer) {
  return rid === "f"
    ? { preferredRid: "f", priorityOrdering: "none", ridNotAvailable: "asciibetical" }
    : { preferredRid: "h", priorityOrdering: "none", ridNotAvailable: "none" };
}

async function publish(ctx: CallContext, env: RealtimeEnv, session: SessionRow, body: Tracks): Promise<Response> {
  const { room, settings, decision, userId, member } = ctx;
  if (!room || !settings || !decision.ok || !userId) return deny(403, "sem_acesso", "sem acesso à sala");
  if (body.sessionDescription?.type !== "offer") return deny(400, "corpo_invalido", "publicar pede a oferta SDP");
  const kinds = midKinds(body.sessionDescription.sdp);
  const requested = body.tracks.map((t) => (t.mid ? kinds.get(t.mid) : undefined));
  if (requested.some((k) => !k)) return deny(400, "faixa_sem_tipo", "faixa sem seção de áudio ou vídeo na oferta");
  const kindsAsked = requested as TrackKind[];
  const tracks = await activeTracks(ctx.db, await openSessions(ctx.db, { roomId: room.id }));
  const mine = tracks.filter((t) => t.sessionId === session.id);
  const wantsVideo = kindsAsked.includes("video");
  const capReached = wantsVideo && (await computeUsageBytes(ctx.db, windowStartFor(ctx.now), room.isTest)) >= capBytesFor(settings.capGb30d);
  const rule = decidePublish({
    role: decision.role,
    roomKind: room.kind,
    voiceMode: room.voiceMode,
    screenPolicy: room.screenPolicy,
    partyScreenEnabled: settings.partyScreenEnabled,
    forceMuted: member?.forceMuted ?? false,
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
      accepted.map((t) => {
        const label = labels.get(t.trackName as string);
        return { sessionId: session.id, trackName: t.trackName as string, mid: t.mid as string, kind: kinds.get(t.mid as string) as TrackKind, tipo: label?.tipo ?? null, quality: label?.quality ?? null };
      })
    );
  }
  return Response.json(res.body, { status: res.status });
}

interface Target extends SubscribeTarget {
  kind: TrackKind;
  quality: Quality | null;
}

async function targetsFor(ctx: CallContext, remotes: Tracks["tracks"]): Promise<Array<Target | null>> {
  const found = await Promise.all(
    remotes.map(async (t) => {
      if (!t.sessionId) return null;
      const [pub, track] = await Promise.all([getSession(ctx.db, t.sessionId), findTrack(ctx.db, t.sessionId, t.trackName)]);
      return pub && track ? { pub, track } : null;
    })
  );
  const roomId = ctx.room?.id ?? "";
  const rows = await memberRows(ctx.db, roomId, found.flatMap((f) => (f ? [f.pub.userId] : [])));
  const onlineSince = ctx.now.getTime() - ONLINE_MS;
  return found.map((f) => {
    if (!f) return null;
    const m = rows.get(f.pub.userId);
    const online = !!m?.lastSeenAt && new Date(m.lastSeenAt).getTime() > onlineSince;
    const role = ctx.room ? effectiveRole(m?.role ?? "ouvinte", ctx.room.kind, ctx.room.voiceMode) : "ouvinte";
    const sala = ctx.room && ctx.settings ? { kind: ctx.room.kind, voiceMode: ctx.room.voiceMode, screenPolicy: ctx.room.screenPolicy, partyScreenEnabled: ctx.settings.partyScreenEnabled } : null;
    const allowed = !!m && m.status === "ativo" && online && (f.track.tipo === null || (sala !== null && publisherMayKeep(role, f.track.tipo as TrackLabel, sala)));
    return {
      roomId: f.pub.roomId, userId: f.pub.userId, closed: f.track.closed || !!f.pub.closedAt, tipo: f.track.tipo,
      publisherActive: allowed, kind: f.track.kind, quality: f.track.quality,
    };
  });
}

async function subscribe(ctx: CallContext, env: RealtimeEnv, session: SessionRow, body: Tracks): Promise<Response> {
  const { room, settings, userId } = ctx;
  if (!room || !settings || !userId) return deny(403, "sem_acesso", "sem acesso à sala");
  if (hasRepeatedPull(body.tracks)) return deny(400, "ja_recebendo", "a mesma faixa duas vezes no pedido");
  const targets = await targetsFor(ctx, body.tracks);
  const blocked = await blockedAmong(ctx.db, userId, targets.flatMap((t) => (t ? [t.userId] : [])));
  const mine = await openSubscriptions(ctx.db, [session.id]);
  for (const [i, t] of body.tracks.entries()) {
    const target = targets[i] ?? null;
    const rule = decideSubscribe({
      subscriberUserId: userId,
      roomId: room.id,
      target,
      blockedPair: target ? blocked.has(target.userId) : false,
      alreadySubscribed: mine.some((s) => s.publisherSessionId === t.sessionId && s.trackName === t.trackName),
    });
    if (!rule.ok) return deny(403, rule.code, "recebimento recusado pela regra da sala");
  }
  const layers = body.tracks.map((t, i) => (targets[i]?.kind === "video" ? decideLayer(t.simulcast?.preferredRid ?? null) : null));
  const forward = {
    tracks: body.tracks.map(({ sessionId, trackName }, i) => {
      const rid = layers[i];
      return rid ? { location: "remote", sessionId, trackName, simulcast: simulcastFor(rid) } : { location: "remote", sessionId, trackName };
    }),
  };
  const res = await sfu(env, `/sessions/${session.id}/tracks/new`, { method: "POST", body: forward });
  if (res.status < 300) {
    const rows: NewSubscription[] = tracksOf(res.body).flatMap((t) => {
      const i = body.tracks.findIndex((r) => r.sessionId === t.sessionId && r.trackName === t.trackName);
      const target = i >= 0 ? targets[i] : null;
      if (t.errorCode || !t.mid || !target) return [];
      const rid = layers[i] ?? null;
      return [{
        sessionId: session.id, mid: t.mid, publisherSessionId: t.sessionId as string, trackName: t.trackName as string, kind: target.kind, rid,
        rateKbps: rateKbpsFor(target.kind, target.tipo, target.quality, rid, settings.videoMaxKbps), isTest: room.isTest,
      }];
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

/** Troca de camada da tela (o partytracks pede quando a pessoa escolhe "alta" ou "leve"): a regra de
 *  custo decide a camada que vale, e o pedido nunca troca a faixa recebida. */
export async function handleLayerUpdate(ctx: CallContext, env: RealtimeEnv, session: SessionRow, body: Tracks): Promise<Response> {
  const { room, settings } = ctx;
  if (!room || !settings || !ctx.decision.ok) return deny(403, "sem_acesso", "sem acesso à sala");
  const subs = await openSubscriptions(ctx.db, [session.id]);
  const plan = [];
  for (const t of body.tracks) {
    const sub = subs.find((s) => s.mid === t.mid) ?? null;
    const rule = checkLayerUpdate({ requested: t, sub });
    if (!rule.ok || !sub) return deny(403, rule.ok ? "faixa_inexistente" : rule.code, "troca de camada recusada");
    const rid = decideLayer(t.simulcast?.preferredRid ?? null);
    plan.push({ sub, rid });
  }
  const forward = { tracks: plan.map(({ sub, rid }) => ({ location: "remote", sessionId: sub.publisherSessionId, trackName: sub.trackName, mid: sub.mid, simulcast: simulcastFor(rid) })) };
  const res = await sfu(env, `/sessions/${session.id}/tracks/update`, { method: "PUT", body: forward });
  if (res.status < 300) {
    for (const { sub, rid } of plan) {
      if (sub.rid === rid) continue;
      const track = await findTrack(ctx.db, sub.publisherSessionId, sub.trackName);
      await switchSubscriptionLayer(ctx.db, sub, rid, rateKbpsFor(sub.kind, track?.tipo ?? "tela", track?.quality ?? null, rid, settings.videoMaxKbps), room.isTest, ctx.now);
    }
  }
  return Response.json(res.body, { status: res.status });
}
