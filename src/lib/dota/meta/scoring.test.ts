import { describe, expect, it } from "vitest";
import { LETTERS, adjustedWinRate, letterFloor, letterFor, metaScore, pickRate, winRate } from "./scoring";

describe("escolha e vitória", () => {
  it("escolha é a fatia das partidas em que o herói aparece", () => {
    expect(pickRate(500, 1000)).toBe(50);
    expect(pickRate(10, 0)).toBe(0);
  });

  it("vitória crua", () => {
    expect(winRate(55, 100)).toBeCloseTo(55);
    expect(winRate(0, 0)).toBe(0);
  });
});

describe("vitória ajustada à amostra (média bayesiana com 300 partidas)", () => {
  it("sem partida, fica na média da função", () => {
    expect(adjustedWinRate(0, 0, 50)).toBe(50);
  });

  it("com 300 partidas fica no meio do caminho entre a vitória dele e a média", () => {
    expect(adjustedWinRate(180, 300, 50)).toBeCloseTo(55); // 60% cru
  });

  it("amostra grande quase não muda: 20 mil partidas a 54% continuam perto de 54%", () => {
    expect(adjustedWinRate(10_800, 20_000, 50)).toBeCloseTo(53.94, 2);
  });

  it("um herói com 300 partidas e 57% não passa um com 20 mil e 54% por sorte", () => {
    expect(adjustedWinRate(171, 300, 50)).toBeCloseTo(53.5);
    expect(adjustedWinRate(171, 300, 50)).toBeLessThan(adjustedWinRate(10_800, 20_000, 50));
  });

  it("puxa para a média da própria função, não para 50", () => {
    expect(adjustedWinRate(0, 0, 49.5)).toBeCloseTo(49.5);
  });
});

describe("nota e letra", () => {
  it("nota = vitória ajustada + escolha ÷ 10", () => {
    expect(metaScore(52, 15)).toBeCloseTo(53.5);
    expect(metaScore(49, 0)).toBe(49);
  });

  it("cortes fixos: S 55, A 53, B 51,5, C 50, D 48,5 e F abaixo", () => {
    expect(letterFor(57.3)).toBe("S");
    expect(letterFor(55)).toBe("S");
    expect(letterFor(54.999)).toBe("A");
    expect(letterFor(53)).toBe("A");
    expect(letterFor(51.5)).toBe("B");
    expect(letterFor(51.49)).toBe("C");
    expect(letterFor(50)).toBe("C");
    expect(letterFor(48.5)).toBe("D");
    expect(letterFor(48.49)).toBe("F");
    expect(letterFor(30)).toBe("F");
  });

  it("cada letra tem o seu piso e o F não tem", () => {
    expect(LETTERS.map(letterFloor)).toEqual([55, 53, 51.5, 50, 48.5, null]);
  });
});
