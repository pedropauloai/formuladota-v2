// As quatro qualidades da tela que o dono escolhe na hora de compartilhar (decisão do PPA de
// 23/11/2026; números na spec, seção 11), com a camada leve do simulcast de cada uma.

import type { Layer, Quality } from "./tipos";

export interface QualityPreset {
  id: Quality;
  width: number;
  height: number;
  fps: number;
  /** Bitrate da camada f, a qualidade escolhida. */
  kbps: number;
  /** Bitrate da camada h, com metade da resolução. */
  lowKbps: number;
}

export const QUALIDADES: Record<Quality, QualityPreset> = {
  leve: { id: "leve", width: 1280, height: 720, fps: 30, kbps: 1500, lowKbps: 500 },
  padrao: { id: "padrao", width: 1920, height: 1080, fps: 30, kbps: 3000, lowKbps: 800 },
  alta: { id: "alta", width: 1920, height: 1080, fps: 30, kbps: 4500, lowKbps: 800 },
  fluida: { id: "fluida", width: 1920, height: 1080, fps: 60, kbps: 6000, lowKbps: 1000 },
};

export const QUALITY_IDS = Object.keys(QUALIDADES) as Quality[];

export function isQuality(v: unknown): v is Quality {
  return typeof v === "string" && v in QUALIDADES;
}

export function layerKbps(q: Quality, rid: Layer): number {
  return rid === "f" ? QUALIDADES[q].kbps : QUALIDADES[q].lowKbps;
}

export interface LayerEncoding {
  rid: Layer;
  maxBitrate: number;
  maxFramerate: number;
  scaleResolutionDownBy?: number;
}

/** As duas camadas do envio (simulcast): f na qualidade escolhida e h com metade da resolução. */
export function encodingsFor(q: Quality): LayerEncoding[] {
  const p = QUALIDADES[q];
  return [
    { rid: "f", maxBitrate: p.kbps * 1000, maxFramerate: p.fps },
    { rid: "h", maxBitrate: p.lowKbps * 1000, maxFramerate: p.fps, scaleResolutionDownBy: 2 },
  ];
}

export function captureConstraintsFor(q: Quality): { width: { ideal: number }; height: { ideal: number }; frameRate: { ideal: number; max: number } } {
  const p = QUALIDADES[q];
  return { width: { ideal: p.width }, height: { ideal: p.height }, frameRate: { ideal: p.fps, max: p.fps } };
}
