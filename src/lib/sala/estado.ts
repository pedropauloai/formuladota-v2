// Estado da sala para quem está nela (spec, ADR-004). O cliente pergunta a cada 2 s (dono e quem fala)
// ou 3 s (plateia); o estado comum sai da memória (3 s) e a decisão de acesso também, até o próximo
// batimento. O batimento (a cada 10 s, ou quando a pessoa muta ou levanta a mão) grava presença,
// microfone, mão e métricas, e refaz a decisão.

import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { authInfo, contextFor, salaFlagOn, verdictOf, type CallContext, type Verdict } from "./contexto";
import { capBytesFor } from "./custo";
import type { Db } from "./dados-sala";
import { insertStats } from "./dados-uso";
import { publisherMayKeep, visibleTracks } from "./faixas";
import { SnapshotCache, TtlCache, type RawSnapshot } from "./memoria";
import { canChat, canPublishVoice, canRaiseHand, canShareScreen } from "./papeis";
import { realtimeEnv } from "./realtime-api";
import { closeUserSessions } from "./sessoes";
import type { DenyCode, MemberRole, Quality, RoomKind, TrackDenyCode, TrackLabel } from "./tipos";

const VERDICT_MS = 15_000;
const SNAPSHOT_MS = 3_000;
const verdicts = new TtlCache<Verdict>(VERDICT_MS, 5000);
/** Estado comum por sala, na memória desta instância do servidor. */
export const snapshots = new SnapshotCache(SNAPSHOT_MS);

/** Depois de uma mudança feita aqui (chat, moderação), a próxima consulta vê na hora. */
export function forgetRoomState(roomId: string, userId?: string): void {
  snapshots.invalidate(roomId);
  if (userId) verdicts.delete(`${roomId}:${userId}`);
}

// Mesmos limites das restrições da tabela voice_room_stats: número fora disso é recusado aqui.
const ms = z.number().min(0).max(60_000).nullable();
const pct = z.number().min(0).max(100).nullable();
const Metricas = z.object({
  rttMs: ms, jitterMs: ms, jitterBufferMs: ms, latencyMs: ms, packetLossPct: pct, audioConcealedPct: pct,
  videoWidth: z.number().int().min(0).max(8192).nullable(),
  videoHeight: z.number().int().min(0).max(8192).nullable(),
  videoFps: z.number().min(0).max(240).nullable(), videoFreezeMs: z.number().int().min(0).nullable(),
  bytesReceived: z.number().int().min(0), bytesSent: z.number().int().min(0),
  relay: z.boolean().nullable(),
  qualityLimitation: z.enum(["none", "cpu", "bandwidth", "other"]).nullable(),
});
export const EstadoBody = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/).nullable(),
  chatAfter: z.number().int().min(0).default(0),
  beat: z.object({ muted: z.boolean(), hand: z.boolean(), metricas: Metricas.optional() }).optional(),
});

const SnapshotSchema = z.object({
  room: z.object({ status: z.string(), chat_open: z.boolean(), closes_at: z.string() }).nullable(),
  members: z.array(z.object({
    u: z.string(), r: z.enum(["dono", "membro", "falante", "ouvinte"]), m: z.boolean(),
    f: z.boolean().optional(), h: z.string().optional(), on: z.boolean(),
  })),
  tracks: z.array(z.object({
    s: z.string(), u: z.string(), n: z.string(), k: z.enum(["audio", "video"]), t: z.enum(["voz", "tela", "tela_audio"]),
    q: z.enum(["leve", "padrao", "alta", "fluida"]).optional(),
  })),
  chat: z.array(z.object({ i: z.number(), u: z.string().nullable(), b: z.string(), a: z.string() })),
  deleted: z.array(z.number()),
  removed: z.array(z.string()),
});

async function fetchSnapshot(db: Db, roomId: string, chatAfter: number): Promise<RawSnapshot> {
  const { data, error } = await db.rpc("voice_room_snapshot", { p_room: roomId, p_chat_after: chatAfter });
  if (error) throw new Error(`ler o estado da sala: ${error.message}`);
  return SnapshotSchema.parse(data);
}

export interface MembroEstado {
  userId: string;
  papel: MemberRole;
  online: boolean;
  mutado: boolean;
  mutadoPeloDono: boolean;
  maoDesde: string | null;
  compartilhandoTela: boolean;
  bloqueado: boolean;
}

export interface FaixaEstado {
  sessionId: string;
  trackName: string;
  tipo: TrackLabel;
  userId: string;
  qualidade: Quality | null;
}

export interface MensagemEstado {
  id: number;
  userId: string | null;
  texto: string;
  em: string;
}

export interface Estado {
  saida: DenyCode | null;
  eu?: {
    userId: string;
    papel: MemberRole;
    podeFalar: boolean;
    mutadoPeloDono: boolean;
    podeLevantarMao: boolean;
    maoDesde: string | null;
    podeEscrever: boolean;
    podeCompartilharTela: boolean;
    motivoTela: TrackDenyCode | null;
  };
  sala?: { titulo: string; tipo: RoomKind; fechaEm: string; chatAberto: boolean; lugares: number; falantesMax: number; videoMaxKbps: number };
  membros?: MembroEstado[];
  faixas?: FaixaEstado[];
  chat?: MensagemEstado[];
  apagadas?: number[];
}

function screenReason(v: Verdict, role: MemberRole, othersSharing: boolean): TrackDenyCode | null {
  const { room, settings } = v;
  if (!room || !settings || !canShareScreen(role, room.kind, room.screenPolicy, settings.partyScreenEnabled)) return "tela_nao_permitida";
  if (othersSharing) return "tela_ocupada";
  // Sala de teste conta o próprio consumo na hora de publicar; aqui vale o de produção (o aviso da tela).
  if (!room.isTest && settings.usageBytes30d >= capBytesFor(settings.capGb30d)) return "teto_de_trafego";
  return null;
}

function compose(v: Verdict, snap: RawSnapshot, me: string, role: MemberRole, chatAfter: number): Estado {
  const room = v.room as NonNullable<Verdict["room"]>;
  const settings = v.settings as NonNullable<Verdict["settings"]>;
  const live = snap.room ?? { status: room.status, chat_open: room.chatOpen, closes_at: room.closesAt };
  const roles = new Map(snap.members.map((m) => [m.u, { role: m.r, online: m.on }]));
  roles.set(me, { role, online: true });
  const blocked = new Set(v.blocked);
  const sharing = new Set(snap.tracks.filter((t) => t.t === "tela" && publisherMayKeep(roles.get(t.u)?.role ?? "ouvinte", "tela")).map((t) => t.u));
  const mine = snap.members.find((m) => m.u === me);
  const forceMuted = mine?.f ?? v.member?.forceMuted ?? false;
  const motivoTela = screenReason(v, role, [...sharing].some((id) => id !== me));
  const tracks = visibleTracks(snap.tracks.map((t) => ({ sessionId: t.s, userId: t.u, trackName: t.n, tipo: t.t, qualidade: t.q ?? null })), me, roles, blocked);
  const membros: MembroEstado[] = snap.members.map((m) => ({
    userId: m.u, papel: m.u === me ? role : m.r, online: m.on || m.u === me, mutado: m.m, mutadoPeloDono: !!m.f,
    maoDesde: m.h ?? null, compartilhandoTela: sharing.has(m.u), bloqueado: blocked.has(m.u),
  }));
  if (!mine) membros.push({ userId: me, papel: role, online: true, mutado: true, mutadoPeloDono: forceMuted, maoDesde: null, compartilhandoTela: false, bloqueado: false });
  return {
    saida: null,
    eu: {
      userId: me, papel: role, podeFalar: canPublishVoice(role) && !(forceMuted && role !== "dono"), mutadoPeloDono: forceMuted,
      podeLevantarMao: canRaiseHand(role, room.kind), maoDesde: mine?.h ?? null,
      podeEscrever: canChat(role, room.kind, live.chat_open), podeCompartilharTela: motivoTela === null, motivoTela,
    },
    sala: { titulo: room.title, tipo: room.kind, fechaEm: live.closes_at, chatAberto: live.chat_open, lugares: room.maxMembers, falantesMax: settings.palcoMaxSpeakers, videoMaxKbps: settings.videoMaxKbps },
    membros,
    faixas: tracks.map((t) => ({ sessionId: t.sessionId, trackName: t.trackName, tipo: t.tipo as TrackLabel, userId: t.userId, qualidade: t.qualidade })),
    chat: snap.chat.filter((m) => m.i > chatAfter).map((m) => ({ id: m.i, userId: m.u, texto: m.b, em: m.a })),
    apagadas: snap.deleted,
  };
}

export async function roomState(roomId: string, body: z.infer<typeof EstadoBody>): Promise<Estado> {
  const now = new Date();
  const [auth, flagOn] = await Promise.all([authInfo(), salaFlagOn(now.getTime())]);
  if (!flagOn) return { saida: "flag_desligada" };
  if (!auth) return { saida: "sem_login" };
  const key = `${roomId}:${auth.userId}`;
  let v = body.beat ? undefined : verdicts.get(key, now.getTime());
  let ctx: CallContext | null = null;
  if (!v) {
    const rpc = body.beat ? { fn: "tick" as const, muted: body.beat.muted, hand: body.beat.hand } : { fn: "access" as const };
    ctx = await contextFor(roomId, auth, flagOn, rpc, now);
    v = verdictOf(ctx);
    verdicts.set(key, v, now.getTime());
  }
  if (!v.decision.ok || !v.room) {
    // No batimento, quem perdeu o acesso sai do SFU (saiu da party, foi banido, a sala fechou).
    if (body.beat && ctx && v.room) await closeUserSessions(ctx.db, realtimeEnv(), { roomId, userId: auth.userId }, "acesso_perdido", now);
    return { saida: v.decision.ok ? "sala_inexistente" : v.decision.code };
  }
  const db = ctx?.db ?? createServiceClient();
  if (body.beat?.metricas) await insertStats(db, { roomId, userId: auth.userId, sessionId: body.sessionId, s: body.beat.metricas });
  const snap = await snapshots.get(roomId, now.getTime(), (after) => fetchSnapshot(db, roomId, after));
  if (snap.removed.includes(auth.userId)) return { saida: "expulso" };
  if (snap.room && snap.room.status !== "aberta") return { saida: "sala_encerrada" };
  return compose(v, snap, auth.userId, v.decision.role, body.chatAfter);
}
