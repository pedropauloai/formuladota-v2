// Tarefa "sala-voz" do cron do site (a cada minuto): fecha no SFU as sessões sem batimento, encerra
// salas vencidas, recalcula o consumo dos 30 dias, avisa o PPA nos limiares e no pico, e apaga o que
// passou do prazo de guarda (spec, seções 10 e 11).

import "server-only";
import { sendOpsAlert } from "@/lib/cron/alert";
import { createServiceClient } from "@/lib/supabase/service";
import { alertLevelFor, capBytesFor } from "./custo";
import { getSettings, type Db } from "./dados-sala";
import { openSessions, type SessionRow } from "./dados-rtc";
import { computeUsageBytes, saveUsageCache, windowStartFor } from "./dados-uso";
import { realtimeEnv } from "./realtime-api";
import { closeSessions, revokeTurn } from "./sessoes";

// O batimento é a cada 10 s; sem sinal por 60 s, a sessão fecha no SFU.
const SEM_SINAL_MS = 60_000;
const PICO_BYTES_HORA = 20_000_000_000;
const PICO_INTERVALO_MS = 6 * 3600_000;
const DIA = 24 * 3600_000;
const GB = 1_000_000_000;

export interface SweepResult {
  sessoesSemSinal: number;
  salasEncerradas: number;
  usoGb: number;
  aviso: number | null;
}

async function closeStale(db: Db, now: Date): Promise<number> {
  const { data } = await db.from("voice_room_sessions").select("id, room_id, user_id, created_at").is("closed_at", null);
  const open = data ?? [];
  if (open.length === 0) return 0;
  const { data: members } = await db.from("voice_room_members").select("room_id, user_id, last_seen_at").in("room_id", [...new Set(open.map((s) => s.room_id))]);
  const seen = new Map((members ?? []).map((m) => [`${m.room_id}:${m.user_id}`, m.last_seen_at]));
  const limit = now.getTime() - SEM_SINAL_MS;
  const stale: SessionRow[] = open
    .filter((s) => new Date(seen.get(`${s.room_id}:${s.user_id}`) ?? s.created_at).getTime() < limit)
    .map((s) => ({ id: s.id, roomId: s.room_id, userId: s.user_id, closedAt: null }));
  await closeSessions(db, realtimeEnv(), stale, "sem_batimento", now);
  return stale.length;
}

/** Quem foi chamado ao palco e sumiu há mais de 5 minutos volta à plateia: não fica ocupando lugar. */
async function demoteGoneSpeakers(db: Db, now: Date): Promise<void> {
  const limite = new Date(now.getTime() - 5 * 60_000).toISOString();
  await db.from("voice_room_members").update({ role: "ouvinte", hand_raised_at: null })
    .eq("role", "falante").eq("status", "ativo").or(`last_seen_at.is.null,last_seen_at.lt.${limite}`);
}

async function closeExpired(db: Db, now: Date): Promise<number> {
  const { data } = await db.from("voice_rooms").update({ status: "encerrada", closed_at: now.toISOString() }).eq("status", "aberta").lt("closes_at", now.toISOString()).select("id");
  for (const room of data ?? []) {
    await closeSessions(db, realtimeEnv(), await openSessions(db, { roomId: room.id }), "sala_encerrada", now);
    await revokeTurn(db, realtimeEnv(), room.id);
  }
  return (data ?? []).length;
}

async function refreshUsage(db: Db, now: Date): Promise<{ bytes: number; aviso: number | null }> {
  const [settings, bytes, hour] = await Promise.all([getSettings(db), computeUsageBytes(db, windowStartFor(now)), computeUsageBytes(db, new Date(now.getTime() - 3600_000))]);
  await saveUsageCache(db, bytes, now);
  const cap = capBytesFor(settings.capGb30d);
  const level = alertLevelFor(bytes, cap);
  let aviso: number | null = null;
  if (level > settings.alertLevel) {
    const gb = (bytes / GB).toFixed(1);
    const texto = level === 100
      ? `Sala de voz: o teto de ${settings.capGb30d} GB em 30 dias foi atingido (${gb} GB estimados). Compartilhar tela fica bloqueado até o consumo cair; a voz continua.`
      : `Sala de voz: o tráfego estimado dos últimos 30 dias chegou a ${level}% do teto (${gb} de ${settings.capGb30d} GB). A franquia grátis da Cloudflare é de 1.000 GB por mês.`;
    await sendOpsAlert(texto, true);
    aviso = level;
  }
  if (level !== settings.alertLevel) await db.from("voice_settings").update({ alert_level: level, alert_at: now.toISOString() }).eq("id", 1);
  const lastPeak = settings.peakAlertAt ? new Date(settings.peakAlertAt).getTime() : 0;
  if (hour > PICO_BYTES_HORA && now.getTime() - lastPeak > PICO_INTERVALO_MS) {
    await sendOpsAlert(`Sala de voz: pico de ${(hour / GB).toFixed(1)} GB estimados na última hora. Confira /admin/salas.`, true);
    await db.from("voice_settings").update({ peak_alert_at: now.toISOString() }).eq("id", 1);
  }
  return { bytes, aviso };
}

/** Métricas em 30 dias (o banco do plano grátis tem 500 MB); chat no prazo da configuração e sessões
 *  (com IP) em 6 meses, os dois menos os de sala com denúncia aberta. O chat do canal de texto aberto
 *  fica guardado enquanto o canal existir; apagado o canal, vale o prazo. */
async function purge(db: Db, now: Date, chatDays: number): Promise<void> {
  await db.from("voice_room_stats").delete().lt("at", new Date(now.getTime() - 30 * DIA).toISOString());
  const { data: held } = await db.from("voice_room_reports").select("room_id").in("status", ["aberta", "em_analise"]).not("room_id", "is", null);
  const { data: canais } = await db.from("voice_rooms").select("id").eq("kind", "texto").eq("status", "aberta");
  const keep = [...new Set((held ?? []).map((r) => r.room_id as string))];
  const keepChat = [...new Set([...keep, ...(canais ?? []).map((c) => c.id)])];
  let chat = db.from("voice_room_messages").delete().lt("created_at", new Date(now.getTime() - chatDays * DIA).toISOString());
  if (keepChat.length) chat = chat.not("room_id", "in", `(${keepChat.join(",")})`);
  await chat;
  let q = db.from("voice_room_sessions").delete().lt("created_at", new Date(now.getTime() - 183 * DIA).toISOString());
  if (keep.length) q = q.not("room_id", "in", `(${keep.join(",")})`);
  await q;
}

export async function sweepVoiceRooms(now = new Date()): Promise<SweepResult> {
  const db = createServiceClient();
  const sessoesSemSinal = await closeStale(db, now);
  const salasEncerradas = await closeExpired(db, now);
  await demoteGoneSpeakers(db, now);
  const { bytes, aviso } = await refreshUsage(db, now);
  await purge(db, now, (await getSettings(db)).chatRetentionDays);
  return { sessoesSemSinal, salasEncerradas, usoGb: Number((bytes / GB).toFixed(3)), aviso };
}
