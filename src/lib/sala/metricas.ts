// Resumo do RTCPeerConnection.getStats() (spec, seção 13). Roda no navegador a cada 5 s; o resumo
// vai ao servidor a cada 10 s. Taxas contam só o intervalo entre duas amostras.

import type { TrackKind } from "./tipos";

export interface RawStat {
  id: string;
  type: string;
  timestamp: number;
  [field: string]: unknown;
}

interface Inbound {
  kind: TrackKind;
  packetsLost: number;
  packetsReceived: number;
  jitter: number | null;
  bytesReceived: number;
  concealedSamples: number;
  totalSamplesReceived: number;
  frameWidth: number | null;
  frameHeight: number | null;
  framesPerSecond: number | null;
  totalFreezesDuration: number;
}

export type QualityLimitation = "none" | "cpu" | "bandwidth" | "other";

export interface StatsSnapshot {
  at: number;
  inbound: Record<string, Inbound>;
  outboundBytes: Record<string, number>;
  rttMs: number | null;
  relay: boolean | null;
  qualityLimitation: QualityLimitation | null;
  audioBytesReceived: number;
  videoBytesReceived: number;
}

export interface StatsSummary {
  rttMs: number | null;
  jitterMs: number | null;
  packetLossPct: number | null;
  audioConcealedPct: number | null;
  videoWidth: number | null;
  videoHeight: number | null;
  videoFps: number | null;
  videoFreezeMs: number | null;
  bytesReceived: number;
  bytesSent: number;
  relay: boolean | null;
  qualityLimitation: QualityLimitation | null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function inboundOf(s: RawStat): Inbound {
  return {
    kind: s.kind === "video" ? "video" : "audio",
    packetsLost: Math.max(0, num(s.packetsLost) ?? 0),
    packetsReceived: num(s.packetsReceived) ?? 0,
    jitter: num(s.jitter),
    bytesReceived: num(s.bytesReceived) ?? 0,
    concealedSamples: num(s.concealedSamples) ?? 0,
    totalSamplesReceived: num(s.totalSamplesReceived) ?? 0,
    frameWidth: num(s.frameWidth),
    frameHeight: num(s.frameHeight),
    framesPerSecond: num(s.framesPerSecond),
    totalFreezesDuration: num(s.totalFreezesDuration) ?? 0,
  };
}

function limitationOf(v: unknown): QualityLimitation | null {
  if (v === "none" || v === "cpu" || v === "bandwidth") return v;
  return typeof v === "string" ? "other" : null;
}

function selectedPair(stats: RawStat[]): RawStat | undefined {
  const byId = new Map(stats.map((s) => [s.id, s]));
  const transport = stats.find((s) => s.type === "transport" && typeof s.selectedCandidatePairId === "string");
  const viaTransport = transport ? byId.get(transport.selectedCandidatePairId as string) : undefined;
  return viaTransport ?? stats.find((s) => s.type === "candidate-pair" && s.nominated === true && s.state === "succeeded");
}

export function snapshotFromStats(stats: RawStat[]): StatsSnapshot {
  const inbound: Record<string, Inbound> = {};
  const outboundBytes: Record<string, number> = {};
  let qualityLimitation: QualityLimitation | null = null;
  for (const s of stats) {
    if (s.type === "inbound-rtp") inbound[s.id] = inboundOf(s);
    if (s.type === "outbound-rtp") {
      outboundBytes[s.id] = num(s.bytesSent) ?? 0;
      if (s.kind === "video") qualityLimitation = limitationOf(s.qualityLimitationReason);
    }
  }
  const pair = selectedPair(stats);
  const rtt = pair ? num(pair.currentRoundTripTime) : null;
  const local = pair ? stats.find((s) => s.id === pair.localCandidateId) : undefined;
  const sum = (kind: TrackKind) => Object.values(inbound).filter((i) => i.kind === kind).reduce((a, i) => a + i.bytesReceived, 0);
  return {
    at: Math.max(0, ...stats.map((s) => s.timestamp)),
    inbound,
    outboundBytes,
    rttMs: rtt === null ? null : rtt * 1000,
    relay: local ? local.candidateType === "relay" : null,
    qualityLimitation,
    audioBytesReceived: sum("audio"),
    videoBytesReceived: sum("video"),
  };
}

function delta(curr: number, prev: number | undefined): number {
  return Math.max(0, curr - (prev ?? 0));
}

function ratio(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null;
}

export function summarizeStats(prev: StatsSnapshot | null, curr: StatsSnapshot): StatsSummary {
  let lost = 0, received = 0, concealed = 0, samples = 0, bytes = 0, freezeS = 0;
  let jitter: number | null = null;
  let video: Inbound | null = null;
  for (const [id, now] of Object.entries(curr.inbound)) {
    const before = prev?.inbound[id];
    lost += delta(now.packetsLost, before?.packetsLost);
    received += delta(now.packetsReceived, before?.packetsReceived);
    bytes += delta(now.bytesReceived, before?.bytesReceived);
    if (now.kind === "audio") {
      concealed += delta(now.concealedSamples, before?.concealedSamples);
      samples += delta(now.totalSamplesReceived, before?.totalSamplesReceived);
      if (now.jitter !== null) jitter = Math.max(jitter ?? 0, now.jitter * 1000);
    } else if (!video || (now.frameHeight ?? 0) > (video.frameHeight ?? 0)) {
      video = now;
      freezeS = delta(now.totalFreezesDuration, before?.totalFreezesDuration);
    }
  }
  const sent = Object.entries(curr.outboundBytes).reduce((a, [id, b]) => a + delta(b, prev?.outboundBytes[id]), 0);
  return {
    rttMs: curr.rttMs,
    jitterMs: jitter,
    packetLossPct: ratio(lost, lost + received),
    audioConcealedPct: ratio(concealed, samples),
    videoWidth: video?.frameWidth ?? null,
    videoHeight: video?.frameHeight ?? null,
    videoFps: video?.framesPerSecond ?? null,
    videoFreezeMs: video ? Math.round(freezeS * 1000) : null,
    bytesReceived: bytes,
    bytesSent: sent,
    relay: curr.relay,
    qualityLimitation: curr.qualityLimitation,
  };
}

export type QualityLevel = "boa" | "instavel" | "ruim";

export function qualityLevel(s: Pick<StatsSummary, "packetLossPct" | "rttMs">): QualityLevel {
  const loss = s.packetLossPct ?? 0;
  const rtt = s.rttMs ?? 0;
  if (loss >= 8 || rtt >= 400) return "ruim";
  if (loss >= 2 || rtt >= 200) return "instavel";
  return "boa";
}
