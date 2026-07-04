import { describe, it, expect } from "vitest";
import {
  computePerfScore,
  perfComponents,
  assignRolesByNetWorth,
  normalizeStuns,
  normalizeWards,
  PERF_PROFILES,
  STUN_SECONDS_PER_MIN_CAP,
  WARDS_PER_MIN_CAP,
} from "./mmr";

// Benchmarks no formato da OpenDota: { key: { pct } }.
const bench = (o: Record<string, number>) =>
  Object.fromEntries(Object.entries(o).map(([k, pct]) => [k, { pct }]));

describe("assignRolesByNetWorth", () => {
  it("marca os 2 menores net worth de cada time como support", () => {
    const players = [
      { team: "radiant", netWorth: 20000 }, // core
      { team: "radiant", netWorth: 18000 }, // core
      { team: "radiant", netWorth: 15000 }, // core
      { team: "radiant", netWorth: 9000 }, // support
      { team: "radiant", netWorth: 7000 }, // support
      { team: "dire", netWorth: 8000 }, // support
      { team: "dire", netWorth: 6000 }, // support
      { team: "dire", netWorth: 22000 }, // core
      { team: "dire", netWorth: 17000 }, // core
      { team: "dire", netWorth: 14000 }, // core
    ];
    const roles = assignRolesByNetWorth(players);
    expect(roles).toEqual([
      "core", "core", "core", "support", "support",
      "support", "support", "core", "core", "core",
    ]);
  });

  it("net worth ausente conta como 0 (vira support)", () => {
    const roles = assignRolesByNetWorth([
      { team: "radiant", netWorth: 10000 },
      { team: "radiant", netWorth: null },
      { team: "radiant", netWorth: 5000 },
    ]);
    // os 2 menores (null=0 e 5000) = support; 10000 = core
    expect(roles).toEqual(["core", "support", "support"]);
  });
});

describe("normalizeStuns / normalizeWards", () => {
  it("stuns: teto em 4s/min (STUN_SECONDS_PER_MIN_CAP)", () => {
    expect(STUN_SECONDS_PER_MIN_CAP).toBe(4);
    // 40min × 4 = 160s = teto → 200s clampa em 1
    expect(normalizeStuns(200, 40)).toBe(1);
    // metade do teto
    expect(normalizeStuns(80, 40)).toBeCloseTo(0.5, 5);
    // ausente / duração inválida → null
    expect(normalizeStuns(null, 40)).toBeNull();
    expect(normalizeStuns(80, 0)).toBeNull();
  });

  it("wards: teto em 0,6 ward/min (WARDS_PER_MIN_CAP)", () => {
    expect(WARDS_PER_MIN_CAP).toBe(0.6);
    // 40min × 0,6 = 24 wards = teto
    expect(normalizeWards(24, 40)).toBe(1);
    expect(normalizeWards(12, 40)).toBeCloseTo(0.5, 5);
    expect(normalizeWards(null, 40)).toBeNull();
  });
});

describe("PERF_PROFILES (v3) — sem componente fantasma", () => {
  it('nenhum perfil usa "stuns_per_min" (benchmark inexistente na OpenDota)', () => {
    for (const role of ["core", "support"] as const) {
      const keys = PERF_PROFILES[role].map((c) => c.key);
      expect(keys).not.toContain("stuns_per_min");
    }
  });
  it("support NÃO usa tower_damage nem gold_per_min", () => {
    const keys = PERF_PROFILES.support.map((c) => c.key);
    expect(keys).not.toContain("tower_damage");
    expect(keys).not.toContain("gold_per_min");
  });
});

describe("computePerfScore — v3 não pune suporte", () => {
  // Caso REAL de hoje (Cowork 04/07): suporte com tf 0,59, dmg 0,25, heal 0,59.
  // No perfil SUPPORT tem que sair >= 0,5 (antes, no perfil único v2, saía ~0,42).
  it("suporte real (tf .59, dmg .25, heal .59) >= 0,5", () => {
    const score = computePerfScore(
      "support",
      bench({ hero_damage_per_min: 0.25, hero_healing_per_min: 0.59 }),
      { teamfightParticipation: 0.59, stuns: null, wards: null }
    );
    expect(score).toBeGreaterThanOrEqual(0.5);
    expect(score).toBeCloseTo(0.533, 2); // 3*.59 + 2*.59 + 1*.25 = 3.20 / 6
  });

  it("core com tudo ~0,60 mantém ~0,60", () => {
    const score = computePerfScore(
      "core",
      bench({ hero_damage_per_min: 0.6, tower_damage: 0.6, hero_healing_per_min: 0.6, gold_per_min: 0.6 }),
      { teamfightParticipation: 0.6, stuns: 0.6, wards: null }
    );
    expect(score).toBeCloseTo(0.6, 5);
  });

  it("sem nenhum dado → 0,5 (neutro: win/loss puro)", () => {
    expect(computePerfScore("core", null, {})).toBe(0.5);
    expect(computePerfScore("support", null, {})).toBe(0.5);
  });

  it("componentes ausentes saem da média ponderada", () => {
    // Só teamfight presente → score = o próprio valor (peso único).
    const score = computePerfScore("support", null, { teamfightParticipation: 0.8 });
    expect(score).toBeCloseTo(0.8, 5);
  });
});

describe("perfComponents — breakdown exibido", () => {
  it("lista só os componentes presentes, com peso do perfil", () => {
    const comps = perfComponents(
      "support",
      bench({ hero_healing_per_min: 0.7 }),
      { teamfightParticipation: 0.5, stuns: 0.4, wards: null }
    );
    const byKey = Object.fromEntries(comps.map((c) => [c.key, c]));
    expect(byKey.teamfight_participation).toEqual({ key: "teamfight_participation", value: 0.5, weight: 3 });
    expect(byKey.stuns).toEqual({ key: "stuns", value: 0.4, weight: 2 });
    expect(byKey.hero_healing_per_min).toEqual({ key: "hero_healing_per_min", value: 0.7, weight: 2 });
    // wards ausente e hero_damage ausente → não aparecem
    expect(byKey.wards).toBeUndefined();
    expect(byKey.hero_damage_per_min).toBeUndefined();
  });
});
