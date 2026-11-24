// Estado da sala para quem está nela (spec, ADR-004). O cliente pergunta a cada 2 s (dono e quem fala)
// ou 3 s (plateia); o estado comum sai da memória (3 s) e a decisão de acesso também, até o próximo
// batimento. O batimento (a cada 10 s, ou quando a pessoa muta ou levanta a mão) grava presença,
// microfone, mão e métricas, e refaz a decisão.

import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { authInfo, contextFor, salaFlagOn, verdictOf, type CallContext, type Verdict } from "./contexto";
import { SnapshotSchema } from "./contratos";
import type { Db } from "./dados-sala";
import { insertStats } from "./dados-uso";
import { SnapshotCache, TtlCache, type RawSnapshot } from "./memoria";
import { compose, type Estado } from "./montagem";
import { realtimeEnv } from "./realtime-api";
import { closeUserSessions } from "./sessoes";

export type { Estado, FaixaEstado, MembroEstado, MensagemEstado } from "./montagem";

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

async function fetchSnapshot(db: Db, roomId: string, chatAfter: number): Promise<RawSnapshot> {
  const { data, error } = await db.rpc("voice_room_snapshot", { p_room: roomId, p_chat_after: chatAfter });
  if (error) throw new Error(`ler o estado da sala: ${error.message}`);
  return SnapshotSchema.parse(data);
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
