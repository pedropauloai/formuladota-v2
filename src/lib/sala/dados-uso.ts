// Consumo dos últimos 30 dias (base do teto) e métricas de qualidade no banco (service role). As somas
// são feitas no banco e voltam como um número só (plano grátis do Supabase, spec ADR-004 e ADR-005).

import "server-only";
import type { Db } from "./dados-sala";
import type { StatsSummary } from "./metricas";

export const JANELA_DIAS = 30;

export function windowStartFor(now: Date): Date {
  return new Date(now.getTime() - JANELA_DIAS * 24 * 3600 * 1000);
}

/** Estimativa (duração x taxa de toda faixa recebida que tocou a janela). Sala de teste conta à parte:
 *  o e2e simula o teto sem mexer no contador de produção. */
export async function computeUsageBytes(db: Db, since: Date, isTest = false): Promise<number> {
  const { data, error } = await db.rpc("voice_usage_bytes", { p_since: since.toISOString(), p_is_test: isTest });
  if (error) throw new Error(`ler o consumo: ${error.message}`);
  return Number(data ?? 0);
}

export async function saveUsageCache(db: Db, bytes: number, now: Date): Promise<void> {
  await db.from("voice_settings").update({ usage_bytes_30d: bytes, usage_computed_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", 1);
}

/** Consumo medido pelos navegadores (soma dos bytes recebidos), fora das salas de teste. */
export async function measuredBytes(db: Db, now: Date): Promise<number> {
  const { data, error } = await db.rpc("voice_usage_measured", { p_since: windowStartFor(now).toISOString() });
  if (error) throw new Error(`ler o consumo medido: ${error.message}`);
  return Number(data ?? 0);
}

export async function insertStats(db: Db, row: { roomId: string; userId: string; sessionId: string | null; s: StatsSummary }): Promise<void> {
  const round = (v: number | null, digits = 2) => (v === null ? null : Number(v.toFixed(digits)));
  const { error } = await db.from("voice_room_stats").insert({
    room_id: row.roomId,
    user_id: row.userId,
    session_id: row.sessionId,
    rtt_ms: round(row.s.rttMs),
    jitter_ms: round(row.s.jitterMs),
    jitter_buffer_ms: round(row.s.jitterBufferMs),
    latency_ms: round(row.s.latencyMs),
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
