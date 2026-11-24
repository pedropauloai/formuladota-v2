// Batimento da sala (spec, ADR-004): a cada 2 s o cliente marca presença, manda o microfone e, a
// cada 10 s, as métricas; recebe quem está na sala e as faixas que pode receber, já filtradas.
// Aqui também se corta, no SFU, o que a pessoa recebia e deixou de poder receber.

import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { ONLINE_MS, type CallContext } from "./contexto";
import { capBytesFor } from "./custo";
import { activeTracks, openSessions } from "./dados-rtc";
import { blockedPairsAmong, isBlockedPair, listMembers, touchMember } from "./dados-sala";
import { computeUsageBytes, insertStats } from "./dados-uso";
import { canShareScreen, visibleTracks } from "./faixas";
import { realtimeEnv } from "./realtime-api";
import { closeUserSessions, cutSubscriptions } from "./sessoes";
import type { DenyCode, MemberRole, TrackDenyCode, TrackLabel } from "./tipos";

// Mesmos limites das restrições da tabela voice_room_stats: número fora disso é recusado aqui.
const ms = z.number().min(0).max(60_000).nullable();
const pct = z.number().min(0).max(100).nullable();
const Metricas = z.object({
  rttMs: ms, jitterMs: ms, packetLossPct: pct, audioConcealedPct: pct,
  videoWidth: z.number().int().min(0).max(8192).nullable(),
  videoHeight: z.number().int().min(0).max(8192).nullable(),
  videoFps: z.number().min(0).max(240).nullable(), videoFreezeMs: z.number().int().min(0).nullable(),
  bytesReceived: z.number().int().min(0), bytesSent: z.number().int().min(0),
  relay: z.boolean().nullable(),
  qualityLimitation: z.enum(["none", "cpu", "bandwidth", "other"]).nullable(),
});
export const EstadoBody = z.object({ muted: z.boolean(), sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/).nullable(), metricas: Metricas.optional() });

export interface MembroEstado {
  userId: string;
  nome: string;
  avatarUrl: string | null;
  papel: MemberRole;
  online: boolean;
  mutado: boolean;
  compartilhandoTela: boolean;
  bloqueado: boolean;
}

export interface FaixaEstado {
  sessionId: string;
  trackName: string;
  tipo: TrackLabel;
  userId: string;
}

export interface Estado {
  saida: DenyCode | null;
  eu?: { userId: string; papel: MemberRole; podeCompartilharTela: boolean; motivoTela: TrackDenyCode | null };
  membros?: MembroEstado[];
  faixas?: FaixaEstado[];
  sala?: { titulo: string; tipo: "mentoria" | "party"; fechaEm: string };
}

/** Quem perdeu o acesso sai: as sessões fecham no SFU e a tela recebe o motivo. */
async function leaveWith(ctx: CallContext, code: DenyCode): Promise<Estado> {
  if (ctx.userId && ctx.room) await closeUserSessions(ctx.db, realtimeEnv(), { roomId: ctx.room.id, userId: ctx.userId }, "acesso_perdido", ctx.now);
  return { saida: code };
}

async function screenRule(ctx: CallContext, role: MemberRole, othersSharing: boolean): Promise<TrackDenyCode | null> {
  const { room, settings } = ctx;
  if (!room || !settings) return "tela_nao_permitida";
  if (!canShareScreen(role, room.kind, room.screenPolicy, settings.partyScreenEnabled)) return "tela_nao_permitida";
  if (othersSharing) return "tela_ocupada";
  // Produção lê o consumo que o cron recalcula a cada minuto; sala de teste conta o dela na hora.
  const usage = room.isTest ? await computeUsageBytes(ctx.db, ctx.now, undefined, true) : settings.usageBytes30d;
  if (usage >= capBytesFor(settings.capGb30d)) return "teto_de_trafego";
  return null;
}

export async function roomState(ctx: CallContext, body: z.infer<typeof EstadoBody>): Promise<Estado> {
  const { room, userId, decision } = ctx;
  if (!decision.ok || !room || !userId) return decision.ok ? { saida: "sala_inexistente" } : leaveWith(ctx, decision.code);
  await touchMember(ctx.db, room.id, userId, body.muted, ctx.now);
  if (body.metricas) await insertStats(ctx.db, { roomId: room.id, userId, sessionId: body.sessionId, s: body.metricas });

  const [members, sessions] = await Promise.all([listMembers(ctx.db, room.id), openSessions(ctx.db, { roomId: room.id })]);
  const since = ctx.now.getTime() - ONLINE_MS;
  const online = new Set(members.filter((m) => m.status === "ativo" && m.lastSeenAt && new Date(m.lastSeenAt).getTime() > since).map((m) => m.userId));
  online.add(userId);
  const shown = members.filter((m) => m.status === "ativo" && (online.has(m.userId) || m.role === "dono"));
  const [tracks, blocked, identities] = await Promise.all([
    activeTracks(ctx.db, sessions),
    blockedPairsAmong(ctx.db, shown.map((m) => m.userId)),
    getIdentityMap(await createClient(), shown.map((m) => m.userId)),
  ]);
  const visible = visibleTracks(tracks, userId, online, (a, b) => isBlockedPair(blocked, a, b));
  const allowed = new Set(visible.map((t) => `${t.sessionId}:${t.trackName}`));
  const mySessions = sessions.filter((s) => s.userId === userId).map((s) => s.id);
  await cutSubscriptions(ctx.db, realtimeEnv(), mySessions, (pub, name) => !allowed.has(`${pub}:${name}`), ctx.now);

  const sharing = new Set(tracks.filter((t) => t.tipo === "tela" && online.has(t.userId)).map((t) => t.userId));
  const motivoTela = await screenRule(ctx, decision.role, [...sharing].some((id) => id !== userId));
  return {
    saida: null,
    eu: { userId, papel: decision.role, podeCompartilharTela: motivoTela === null, motivoTela },
    membros: shown.map((m) => ({
      userId: m.userId,
      nome: identities.get(m.userId)?.name ?? "Jogador",
      avatarUrl: identities.get(m.userId)?.avatarUrl ?? null,
      papel: m.role,
      online: online.has(m.userId),
      mutado: m.userId === userId ? body.muted : m.muted,
      compartilhandoTela: sharing.has(m.userId),
      bloqueado: m.userId !== userId && isBlockedPair(blocked, userId, m.userId),
    })),
    faixas: visible.map((t) => ({ sessionId: t.sessionId, trackName: t.trackName, tipo: t.tipo as TrackLabel, userId: t.userId })),
    sala: { titulo: room.title, tipo: room.kind, fechaEm: room.closesAt },
  };
}
