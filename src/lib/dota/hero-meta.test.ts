import { describe, expect, it } from "vitest";
import heroesCatalog from "@/data/dota-heroes.json";
import { buildMetaRows, heroSourcesFromCatalog, matchesInPeriod } from "./hero-meta";
import type { PositionStat } from "./stratz-meta";

const sources = heroSourcesFromCatalog(heroesCatalog);

describe("heroSourcesFromCatalog", () => {
  it("cobre o catálogo inteiro com face oficial e atributo conhecido", () => {
    expect(sources).toHaveLength(heroesCatalog.length);
    expect(sources.length).toBeGreaterThan(120);
    for (const h of sources) {
      expect(h.face).toMatch(/^https:\/\/cdn\.cloudflare\.steamstatic\.com\/.+\/heroes\/icons\/.+\.png$/);
      expect(["str", "agi", "int", "uni"]).toContain(h.attr);
      expect(h.name.length).toBeGreaterThan(0);
    }
  });
});

describe("buildMetaRows", () => {
  const stat = (heroId: number, position: number, matchCount: number, winCount: number): PositionStat => ({
    heroId,
    position,
    matchCount,
    winCount,
  });
  const stats = [
    stat(1, 1, 1000, 550), // Anti-Mage carry, 55%
    stat(1, 1, 1000, 450), // segunda semana somada: 50% no total
    stat(2, 1, 1000, 600), // 60%
    stat(5, 5, 4000, 2000),
    stat(99999, 1, 5000, 4000), // herói fora do catálogo: some
    stat(3, 1, 1, 1), // participação abaixo do mínimo: some
  ];

  it("filtra pela função, soma as semanas e ordena por win rate", () => {
    const { rows } = buildMetaRows(sources, stats, "1");
    expect(rows.map((r) => r.id)).toEqual([2, 1]);
    const [axe, antiMage] = rows;
    expect(antiMage?.matches).toBe(2000);
    expect(antiMage?.winRate).toBeCloseTo(50);
    expect(axe?.name).toBe("Axe");
  });

  it("todas as funções juntas incluem o suporte", () => {
    const { rows } = buildMetaRows(sources, stats, "all");
    expect(rows.map((r) => r.id)).toContain(5);
    expect(rows.find((r) => r.id === 99999)).toBeUndefined();
  });
});

// Na STRATZ, cada função tem 2 linhas por partida (um herói por time) e a partida inteira tem 10.
describe("escolha em % das partidas", () => {
  const stat = (heroId: number, position: number, matchCount: number): PositionStat => ({
    heroId,
    position,
    matchCount,
    winCount: Math.round(matchCount / 2),
  });
  // 1.000 partidas: 2.000 linhas em cada função.
  const filler = 99999; // herói fora do catálogo completa as linhas sem aparecer na tabela
  const stats = [
    stat(74, 2, 500), // Invoker mid em metade das partidas
    stat(74, 4, 100),
    stat(filler, 2, 1500),
    stat(filler, 4, 1900),
    stat(14, 1, 9), // abaixo de 1% das partidas da função: some
    stat(8, 1, 10), // exatamente 1%: fica
    stat(filler, 1, 1981),
    stat(filler, 3, 2000),
    stat(filler, 5, 2000),
  ];

  it("conta as partidas da função e do período", () => {
    expect(matchesInPeriod(stats, "2")).toBe(1000);
    expect(matchesInPeriod(stats, "all")).toBe(1000);
  });

  it("na função divide pelas partidas da função, não pelas escolhas", () => {
    const invoker = buildMetaRows(sources, stats, "2").rows.find((r) => r.id === 74);
    expect(invoker?.pickRate).toBeCloseTo(50);
  });

  it("em Todas divide pelas partidas do período", () => {
    const invoker = buildMetaRows(sources, stats, "all").rows.find((r) => r.id === 74);
    expect(invoker?.matches).toBe(600);
    expect(invoker?.pickRate).toBeCloseTo(60);
  });

  it("o corte é 1% das partidas", () => {
    const ids = buildMetaRows(sources, stats, "1").rows.map((r) => r.id);
    expect(ids).toContain(8);
    expect(ids).not.toContain(14);
  });

  // Linhas reais da STRATZ de 05 a 18/11/2026 (Imortal): o Invoker aparecia com 2,1% na conta antiga.
  it("Invoker com os números reais de duas semanas sai em cerca de 21% das partidas", () => {
    const lines = { 1: 377211, 2: 376649, 3: 377164, 4: 379011, 5: 376994 };
    const invoker = { 1: 96, 2: 31786, 3: 278, 4: 5290, 5: 2221 };
    const real = ([1, 2, 3, 4, 5] as const).flatMap((p) => [
      stat(74, p, invoker[p]),
      stat(filler, p, lines[p] - invoker[p]),
    ]);
    expect(buildMetaRows(sources, real, "all").rows.find((r) => r.id === 74)?.pickRate).toBeCloseTo(21.02, 1);
    expect(buildMetaRows(sources, real, "2").rows.find((r) => r.id === 74)?.pickRate).toBeCloseTo(16.88, 1);
  });
});
