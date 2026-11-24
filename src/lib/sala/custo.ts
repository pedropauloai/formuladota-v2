// Estimativa do tráfego que a Cloudflare cobra (spec, ADR-005 e seção 11): toda faixa recebida conta
// pelo teto de bitrate do tipo, do início ao fim, dentro dos últimos 30 dias. Erra para cima de propósito.

import type { TrackKind, TrackLabel } from "./tipos";

export const VOZ_KBPS = 64;
export const TELA_AUDIO_KBPS = 128;
/** Cabeçalho de RTP, retransmissão e correção de erro sobre o teto do vídeo. */
const VIDEO_FOLGA = 1.1;
/** Quem para de dar sinal ainda recebe por até 30 s, até a conexão cair no SFU. */
const SEM_SINAL_MS = 30_000;

export function rateKbpsFor(kind: TrackKind, tipo: TrackLabel | null, videoMaxKbps: number): number {
  if (kind === "video") return Math.round(videoMaxKbps * VIDEO_FOLGA);
  return tipo === "tela_audio" ? TELA_AUDIO_KBPS : VOZ_KBPS;
}

export interface UsageSubscription {
  startedAt: string;
  endedAt: string | null;
  rateKbps: number;
  subscriberLastSeenAt: string | null;
}

function endOf(sub: UsageSubscription, now: Date): number {
  if (sub.endedAt) return new Date(sub.endedAt).getTime();
  const nowMs = now.getTime();
  if (!sub.subscriberLastSeenAt) return nowMs;
  return Math.min(nowMs, new Date(sub.subscriberLastSeenAt).getTime() + SEM_SINAL_MS);
}

export function estimateUsageBytes(subs: UsageSubscription[], windowStart: Date, now: Date): number {
  let total = 0;
  for (const sub of subs) {
    const start = Math.max(new Date(sub.startedAt).getTime(), windowStart.getTime());
    const end = endOf(sub, now);
    if (end <= start) continue;
    total += ((end - start) / 1000) * ((sub.rateKbps * 1000) / 8);
  }
  return Math.round(total);
}

/** GB decimal (10^9), o menor dos dois: o teto em bytes fica do lado seguro. */
export function capBytesFor(capGb: number): number {
  return capGb * 1_000_000_000;
}

export function alertLevelFor(usageBytes: number, capBytes: number): 0 | 50 | 80 | 100 {
  const pct = (usageBytes / capBytes) * 100;
  if (pct >= 100) return 100;
  if (pct >= 80) return 80;
  if (pct >= 50) return 50;
  return 0;
}
