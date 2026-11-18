import { describe, expect, it } from "vitest";
import heroesCatalog from "@/data/dota-heroes.json";
import { buildMetaRows, heroSourcesFromCatalog } from "./hero-meta";
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
