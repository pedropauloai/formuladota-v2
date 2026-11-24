// Consumo dos últimos 30 dias (base do teto) e métricas de qualidade no banco (service role).

import "server-only";
import { estimateUsageBytes, type UsageSubscription } from "./custo";
import type { Db } from "./dados-sala";
import type { StatsSummary } from "./metricas";

export const JANELA_DIAS = 30;

export function windowStartFor(now: Date): Date {
  return new Date(now.getTime() - JANELA_DIAS * 24 * 3600 * 1000);
}

/** Estimativa ao vivo: toda faixa recebida que tocou a janela, com o último sinal de quem recebe.
 *  Sala de teste conta só contra sala de teste: o e2e simula o teto sem mexer no de produção. */
export async function computeUsageBytes(db: Db, now: Date, windowStart: Date = windowStartFor(now), isTest = false): Promise<number> {
  const since = windowStart.toISOString();
  const { data: subs, error } = await db
    .from("voice_room_subscriptions")
    .select("session_id, started_at, ended_at, rate_kbps")
    .eq("is_test", isTest)
    .or(`ended_at.is.null,ended_at.gt.${since}`);
  if (error) throw new Error(`ler o consumo: ${error.message}`);
  const rows = subs ?? [];
  const open = [...new Set(rows.filter((s) => !s.ended_at).map((s) => s.session_id))];
  const lastSeen = await lastSeenBySession(db, open);
  const usage: UsageSubscription[] = rows.map((s) => ({
    startedAt: s.started_at,
    endedAt: s.ended_at,
    rateKbps: s.rate_kbps,
    subscriberLastSeenAt: s.ended_at ? null : (lastSeen.get(s.session_id) ?? null),
  }));
  return estimateUsageBytes(usage, windowStart, now);
}

async function lastSeenBySession(db: Db, sessionIds: string[]): Promise<Map<string, string | null>> {
  if (sessionIds.length === 0) return new Map();
  const { data: sessions } = await db.from("voice_room_sessions").select("id, room_id, user_id").in("id", sessionIds);
  const rows = sessions ?? [];
  if (rows.length === 0) return new Map();
  const { data: members } = await db
    .from("voice_room_members")
    .select("room_id, user_id, last_seen_at")
    .in("room_id", [...new Set(rows.map((s) => s.room_id))])
    .in("user_id", [...new Set(rows.map((s) => s.user_id))]);
  const seen = new Map((members ?? []).map((m) => [`${m.room_id}:${m.user_id}`, m.last_seen_at]));
  // Sem batimento registrado, conta até agora (lado seguro); o cron fecha a sessão sem sinal.
  return new Map(rows.map((s) => [s.id, seen.get(`${s.room_id}:${s.user_id}`) ?? null]));
}

export async function saveUsageCache(db: Db, bytes: number, now: Date): Promise<void> {
  await db.from("voice_settings").update({ usage_bytes_30d: bytes, usage_computed_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", 1);
}

/** Consumo medido pelos navegadores (soma de bytes recebidos), para comparar com a estimativa. */
export async function measuredBytes(db: Db, now: Date): Promise<number> {
  const { data: rooms } = await db.from("voice_rooms").select("id").eq("is_test", true);
  const testRooms = (rooms ?? []).map((r) => r.id);
  let q = db.from("voice_room_stats").select("bytes_received").gt("at", windowStartFor(now).toISOString());
  if (testRooms.length) q = q.not("room_id", "in", `(${testRooms.join(",")})`);
  const { data } = await q;
  return (data ?? []).reduce((a, s) => a + (s.bytes_received ?? 0), 0);
}

export async function insertStats(db: Db, row: { roomId: string; userId: string; sessionId: string | null; s: StatsSummary }): Promise<void> {
  const round = (v: number | null, digits = 2) => (v === null ? null : Number(v.toFixed(digits)));
  const { error } = await db.from("voice_room_stats").insert({
    room_id: row.roomId,
    user_id: row.userId,
    session_id: row.sessionId,
    rtt_ms: round(row.s.rttMs),
    jitter_ms: round(row.s.jitterMs),
    packet_loss_pct: round(row.s.packetLossPct, 3),
    audio_concealed_pct: round(row.s.audioConcealedPct, 3),
    video_width: row.s.videoWidth,
    video_height: row.s.videoHeight,
    video_fps: round(row.s.videoFps),
    video_freeze_ms: row.s.videoFreezeMs,
    bytes_received: row.s.bytesReceived,
    bytes_sent: row.s.bytesSent,
    relay: row.s.relay,
    quality_limitation: row.s.qualityLimitation,
  });
  if (error) throw new Error(`gravar as métricas: ${error.message}`);
}
