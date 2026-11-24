import { describe, expect, it } from "vitest";
import { alertLevelFor, capBytesFor, gbPerHourPerViewer, rateKbpsFor } from "./custo";

describe("rateKbpsFor (taxa de cada faixa recebida, base da estimativa)", () => {
  it("voz 64 kbps e áudio da tela 128 kbps", () => {
    expect(rateKbpsFor("audio", "voz", null, null, 6000)).toBe(64);
    expect(rateKbpsFor("audio", "tela_audio", null, null, 6000)).toBe(128);
  });

  it("tela pela qualidade e pela camada, com 10% de cabeçalho", () => {
    expect(rateKbpsFor("video", "tela", "padrao", "f", 6000)).toBe(3300);
    expect(rateKbpsFor("video", "tela", "padrao", "h", 6000)).toBe(880);
  });

  it("o teto da configuração limita a qualidade", () => {
    expect(rateKbpsFor("video", "tela", "fluida", "f", 4000)).toBe(4400);
  });

  it("tela sem qualidade conhecida conta pelo teto (lado seguro)", () => {
    expect(rateKbpsFor("video", "tela", null, "f", 6000)).toBe(6600);
    expect(rateKbpsFor("video", "tela", null, "h", 6000)).toBe(1650);
  });
});

describe("gbPerHourPerViewer (a tabela da spec, seção 11)", () => {
  const casos: Array<[Parameters<typeof gbPerHourPerViewer>[0], number, number]> = [
    ["leve", 0.83, 0.33],
    ["padrao", 1.57, 0.48],
    ["alta", 2.31, 0.48],
    ["fluida", 3.06, 0.58],
  ];
  for (const [q, alta, leve] of casos) {
    it(`${q}: ${alta} GB por hora na camada alta e ${leve} na leve, com a voz e o áudio do jogo`, () => {
      expect(gbPerHourPerViewer(q, "f")).toBeCloseTo(alta, 2);
      expect(gbPerHourPerViewer(q, "h")).toBeCloseTo(leve, 2);
    });
  }
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
