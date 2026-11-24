// Taxas da estimativa do tráfego que a Cloudflare cobra (spec, ADR-005 e seção 11). A soma dos 30 dias
// é feita no banco (voice_usage_bytes); aqui ficam a taxa de cada faixa recebida, o consumo por hora
// de cada qualidade e os limiares do teto. Erra para cima de propósito.

import { layerKbps } from "./qualidade";
import type { Layer, Quality, TrackKind, TrackLabel } from "./tipos";

export const VOZ_KBPS = 64;
export const TELA_AUDIO_KBPS = 128;
/** Cabeçalho de RTP, retransmissão e correção de erro sobre o bitrate do vídeo. */
export const VIDEO_FOLGA = 1.1;
const BYTES_POR_HORA_POR_KBPS = (1000 / 8) * 3600;

export function rateKbpsFor(kind: TrackKind, tipo: TrackLabel | null, quality: Quality | null, rid: Layer | null, videoMaxKbps: number): number {
  if (kind === "audio") return tipo === "tela_audio" ? TELA_AUDIO_KBPS : VOZ_KBPS;
  const layer = rid ?? "f";
  const base = quality ? layerKbps(quality, layer) : layer === "h" ? videoMaxKbps / 4 : videoMaxKbps;
  return Math.round(Math.min(base, videoMaxKbps) * VIDEO_FOLGA);
}

/** GB por hora de quem assiste: a tela na camada, mais a voz do dono e o áudio do jogo. */
export function gbPerHourPerViewer(q: Quality, rid: Layer): number {
  const kbps = layerKbps(q, rid) * VIDEO_FOLGA + VOZ_KBPS + TELA_AUDIO_KBPS;
  return (kbps * BYTES_POR_HORA_POR_KBPS) / 1e9;
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
