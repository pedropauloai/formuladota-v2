import { describe, expect, it } from "vitest";
import { qualityLevel, snapshotFromStats, summarizeStats, type RawStat } from "./metricas";

// Formato do que o RTCPeerConnection.getStats() devolve, só com os campos usados.
function report(over: { lost?: number; received?: number; concealed?: number; samples?: number; bytesA?: number; bytesV?: number; relay?: boolean; at?: number } = {}): RawStat[] {
  const at = over.at ?? 10_000;
  return [
    { id: "ia", type: "inbound-rtp", kind: "audio", timestamp: at, packetsLost: over.lost ?? 0, packetsReceived: over.received ?? 1000, jitter: 0.012, bytesReceived: over.bytesA ?? 50_000, concealedSamples: over.concealed ?? 0, totalSamplesReceived: over.samples ?? 480_000 },
    { id: "iv", type: "inbound-rtp", kind: "video", timestamp: at, packetsLost: 0, packetsReceived: 5000, bytesReceived: over.bytesV ?? 2_000_000, frameWidth: 1920, frameHeight: 1080, framesPerSecond: 30, totalFreezesDuration: 0.25 },
    { id: "ov", type: "outbound-rtp", kind: "audio", timestamp: at, bytesSent: 40_000, qualityLimitationReason: "none" },
    { id: "cp", type: "candidate-pair", timestamp: at, nominated: true, state: "succeeded", currentRoundTripTime: 0.042, localCandidateId: "lc" },
    { id: "lc", type: "local-candidate", timestamp: at, candidateType: over.relay ? "relay" : "srflx" },
    { id: "t", type: "transport", timestamp: at, selectedCandidatePairId: "cp" },
  ];
}

describe("snapshotFromStats e summarizeStats", () => {
  it("primeira amostra: taxas sobre o total, RTT e resolução da tela", () => {
    const s = summarizeStats(null, snapshotFromStats(report({ lost: 10, received: 990 })));
    expect(s.packetLossPct).toBeCloseTo(10 / (10 + 990 + 5000) * 100, 3);
    expect(s.rttMs).toBeCloseTo(42, 5);
    expect(s.jitterMs).toBeCloseTo(12, 5);
    expect(s.videoHeight).toBe(1080);
    expect(s.videoWidth).toBe(1920);
    expect(s.videoFps).toBe(30);
    expect(s.relay).toBe(false);
  });

  it("perda e voz picotada contam só o intervalo entre duas amostras", () => {
    const prev = snapshotFromStats(report({ lost: 10, received: 990, concealed: 0, samples: 480_000, at: 10_000 }));
    const curr = snapshotFromStats(report({ lost: 20, received: 1980, concealed: 4_800, samples: 960_000, at: 20_000 }));
    const s = summarizeStats(prev, curr);
    // Áudio: 10 perdidos de 1.000 no intervalo; vídeo: 0 de 0 (mesmos números nas duas amostras).
    expect(s.packetLossPct).toBeCloseTo(1, 5);
    expect(s.audioConcealedPct).toBeCloseTo(1, 5);
  });

  it("bytes do intervalo, separados em áudio e vídeo recebidos no total", () => {
    const prev = snapshotFromStats(report({ bytesA: 50_000, bytesV: 2_000_000, at: 10_000 }));
    const curr = snapshotFromStats(report({ bytesA: 90_000, bytesV: 7_000_000, at: 20_000 }));
    const s = summarizeStats(prev, curr);
    expect(s.bytesReceived).toBe(40_000 + 5_000_000);
    expect(curr.audioBytesReceived).toBe(90_000);
    expect(curr.videoBytesReceived).toBe(7_000_000);
  });

  it("marca quando a conexão passa pelo TURN", () => {
    expect(summarizeStats(null, snapshotFromStats(report({ relay: true }))).relay).toBe(true);
  });

  it("sem faixa recebida, as taxas ficam nulas em vez de zero", () => {
    const s = summarizeStats(null, snapshotFromStats([{ id: "t", type: "transport", timestamp: 1 }]));
    expect(s.packetLossPct).toBeNull();
    expect(s.videoHeight).toBeNull();
    expect(s.rttMs).toBeNull();
  });
});

describe("qualityLevel", () => {
  it("boa, instável ou ruim pela perda e pelo RTT", () => {
    expect(qualityLevel({ packetLossPct: 0.5, rttMs: 40 })).toBe("boa");
    expect(qualityLevel({ packetLossPct: 3, rttMs: 40 })).toBe("instavel");
    expect(qualityLevel({ packetLossPct: 0.5, rttMs: 300 })).toBe("instavel");
    expect(qualityLevel({ packetLossPct: 9, rttMs: 40 })).toBe("ruim");
    expect(qualityLevel({ packetLossPct: null, rttMs: null })).toBe("boa");
  });
});
