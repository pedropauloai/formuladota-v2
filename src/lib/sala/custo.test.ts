import { describe, expect, it } from "vitest";
import { alertLevelFor, capBytesFor, estimateUsageBytes, rateKbpsFor } from "./custo";

const now = new Date("2026-11-24T20:00:00Z");
const windowStart = new Date("2026-10-25T20:00:00Z");

describe("rateKbpsFor", () => {
  it("tela conta o teto do vídeo com 10% de cabeçalho; voz 64; áudio da tela 128", () => {
    expect(rateKbpsFor("video", "tela", 4000)).toBe(4400);
    expect(rateKbpsFor("audio", "voz", 4000)).toBe(64);
    expect(rateKbpsFor("audio", "tela_audio", 4000)).toBe(128);
  });
});

describe("estimateUsageBytes", () => {
  it("uma hora de tela a 4.400 kbps dá 1,98 GB", () => {
    const sub = { startedAt: "2026-11-24T18:00:00Z", endedAt: "2026-11-24T19:00:00Z", rateKbps: 4400, subscriberLastSeenAt: null };
    expect(estimateUsageBytes([sub], windowStart, now)).toBe(1_980_000_000);
  });

  it("faixa ainda aberta conta até agora", () => {
    const sub = { startedAt: "2026-11-24T19:59:00Z", endedAt: null, rateKbps: 64, subscriberLastSeenAt: "2026-11-24T19:59:59Z" };
    expect(estimateUsageBytes([sub], windowStart, now)).toBe(480_000);
  });

  it("faixa que começou antes da janela conta só a parte de dentro", () => {
    const sub = { startedAt: "2026-10-25T19:00:00Z", endedAt: "2026-10-25T21:00:00Z", rateKbps: 64, subscriberLastSeenAt: null };
    expect(estimateUsageBytes([sub], windowStart, now)).toBe(28_800_000);
  });

  it("faixa que acabou antes da janela não conta", () => {
    const sub = { startedAt: "2026-10-20T19:00:00Z", endedAt: "2026-10-20T21:00:00Z", rateKbps: 4400, subscriberLastSeenAt: null };
    expect(estimateUsageBytes([sub], windowStart, now)).toBe(0);
  });

  it("faixa aberta de quem parou de dar sinal conta até 30 s depois do último sinal", () => {
    const sub = { startedAt: "2026-11-24T19:00:00Z", endedAt: null, rateKbps: 64, subscriberLastSeenAt: "2026-11-24T19:10:00Z" };
    expect(estimateUsageBytes([sub], windowStart, now)).toBe(5_040_000);
  });

  it("soma várias faixas", () => {
    const a = { startedAt: "2026-11-24T18:00:00Z", endedAt: "2026-11-24T19:00:00Z", rateKbps: 4400, subscriberLastSeenAt: null };
    const b = { startedAt: "2026-11-24T18:00:00Z", endedAt: "2026-11-24T19:00:00Z", rateKbps: 64, subscriberLastSeenAt: null };
    expect(estimateUsageBytes([a, b], windowStart, now)).toBe(1_980_000_000 + 28_800_000);
  });
});

describe("limiares do teto", () => {
  const cap = capBytesFor(800);
  it("800 GB em bytes decimais", () => {
    expect(cap).toBe(800_000_000_000);
  });

  it("avisa em 50%, 80% e 100%", () => {
    expect(alertLevelFor(399_000_000_000, cap)).toBe(0);
    expect(alertLevelFor(400_000_000_000, cap)).toBe(50);
    expect(alertLevelFor(640_000_000_000, cap)).toBe(80);
    expect(alertLevelFor(800_000_000_000, cap)).toBe(100);
  });
});
