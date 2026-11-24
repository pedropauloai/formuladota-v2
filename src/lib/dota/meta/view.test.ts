import { describe, expect, it } from "vitest";
import heroesCatalog from "@/data/dota-heroes.json";
import { buildSummary, type MetaSummary } from "./summary";
import { ANTI_MAGE, DAYS, INVOKER, PATCHES, QUEEN_OF_PAIN, SHADOW_FIEND } from "./test-fixtures";
import { buildMetaView, heroesFromCatalog, movers } from "./view";

const heroes = heroesFromCatalog(heroesCatalog);
const summary = buildSummary(DAYS, PATCHES) as MetaSummary;
const mid = buildMetaView({ summary, heroes, period: "patch", role: "2", minMatches: 150 });
const row = (id: number) => mid?.rows.find((r) => r.id === id);

describe("heroesFromCatalog", () => {
  it("cobre o catálogo com rosto, retrato e atributo", () => {
    expect(heroes.size).toBe(heroesCatalog.length);
    expect(heroes.get(INVOKER)?.name).toBe("Invoker");
    expect(heroes.get(INVOKER)?.portrait).toMatch(/\/heroes\/invoker\.png$/);
  });
});

describe("buildMetaView na função Mid, patch 7.42", () => {
  it("partidas da função = linhas ÷ 2, e a média da função fica em 50%", () => {
    expect(mid?.matches).toBe(1000);
    expect(mid?.mean).toBeCloseTo(50);
    expect(mid?.period).toEqual({ kind: "patch", start: "2026-11-19", end: "2026-11-23", patch: "7.42", days: 5 });
  });

  it("Invoker: 55% cru, 30% de escolha, 52,5% ajustada, nota 55,5 e letra S", () => {
    const invoker = row(INVOKER);
    expect(invoker?.matches).toBe(300);
    expect(invoker?.winRate).toBeCloseTo(55);
    expect(invoker?.pick).toBeCloseTo(30);
    expect(invoker?.adjustedWinRate).toBeCloseTo(52.5);
    expect(invoker?.score).toBeCloseTo(55.5);
    expect(invoker?.letter).toBe("S");
  });

  it("variação contra o fim do 7.41: Invoker subiu 5,4 pontos e Shadow Fiend caiu 4", () => {
    expect(row(INVOKER)?.delta).toBeCloseTo(52.5 - (339 / 720) * 100);
    expect(row(SHADOW_FIEND)?.delta).toBeCloseTo(-4);
    expect(row(SHADOW_FIEND)?.letter).toBe("F");
    expect(mid?.baseline?.kind).toBe("previous");
  });

  it("abaixo da amostra mínima aparece apagado, no fim, sem variação", () => {
    const qop = row(QUEEN_OF_PAIN);
    expect(qop?.belowMin).toBe(true);
    expect(qop?.delta).toBeNull();
    expect(mid?.rows.map((r) => r.id)).toEqual([INVOKER, SHADOW_FIEND, QUEEN_OF_PAIN]);
  });

  it("herói fora do catálogo não entra", () => {
    expect(mid?.rows.find((r) => r.id === 9999)).toBeUndefined();
  });

  it("a linha mostra a vitória ajustada de cada dia e marca o dia da troca", () => {
    const trend = row(INVOKER)?.trend ?? [];
    expect(trend).toHaveLength(14);
    expect(trend[0]).toBeCloseTo((177 / 360) * 100);
    expect(trend[13]).toBeCloseTo((183 / 360) * 100);
    expect(mid?.patchChangeIndex).toBe(8);
  });

  it("quem subiu e quem caiu", () => {
    const { up, down } = movers(mid?.rows ?? []);
    expect(up.map((r) => r.id)).toEqual([INVOKER]);
    expect(down.map((r) => r.id)).toEqual([SHADOW_FIEND]);
  });
});

describe("buildMetaView em Todas e nos outros períodos", () => {
  it("em Todas a escolha é sobre as partidas do período (linhas ÷ 10)", () => {
    const all = buildMetaView({ summary, heroes, period: "patch", role: "all", minMatches: 150 });
    expect(all?.matches).toBe(1000);
    expect(all?.rows.find((r) => r.id === INVOKER)?.pick).toBeCloseTo(30);
    expect(all?.rows.find((r) => r.id === ANTI_MAGE)?.pick).toBeCloseTo(75);
  });

  it("no patch anterior não há variação", () => {
    const previous = buildMetaView({ summary, heroes, period: "previous", role: "2", minMatches: 150 });
    expect(previous?.baseline).toBeNull();
    expect(previous?.rows.every((r) => r.delta === null)).toBe(true);
    expect(previous?.rows.find((r) => r.id === INVOKER)?.winRate).toBeCloseTo(45);
  });

  it("período que não existe no resumo volta null", () => {
    const semPatch = buildSummary(DAYS.filter((d) => d.day <= "2026-11-18"), PATCHES) as MetaSummary;
    expect(buildMetaView({ summary: semPatch, heroes, period: "patch", role: "2", minMatches: 150 })).toBeNull();
    expect(buildMetaView({ summary: semPatch, heroes, period: "recent", role: "2", minMatches: 150 })).not.toBeNull();
  });
});
