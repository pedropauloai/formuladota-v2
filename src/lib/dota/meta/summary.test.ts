import { describe, expect, it } from "vitest";
import { buildSummary, daysNeeded, isMetaSummary, SERIES_DAYS } from "./summary";
import { DAYS, INVOKER, PATCHES } from "./test-fixtures";

const summary = buildSummary(DAYS, PATCHES);

describe("buildSummary", () => {
  it("monta os três períodos com os dias de cada um", () => {
    expect(summary?.lastDay).toBe("2026-11-23");
    expect(summary?.periods.map((p) => `${p.kind} ${p.start} ${p.end} ${p.days}`)).toEqual([
      "patch 2026-11-19 2026-11-23 5",
      "recent 2026-11-17 2026-11-23 7",
      "previous 2026-11-11 2026-11-17 7",
    ]);
  });

  it("soma o herói no período: Invoker mid no 7.42 tem 300 partidas e 165 vitórias", () => {
    const patch = summary?.periods.find((p) => p.kind === "patch");
    expect(patch?.stats.find(([h, pos]) => h === INVOKER && pos === 2)).toEqual([INVOKER, 2, 300, 165]);
    const previous = summary?.periods.find((p) => p.kind === "previous");
    expect(previous?.stats.find(([h, pos]) => h === INVOKER && pos === 2)).toEqual([INVOKER, 2, 420, 189]);
  });

  it("a linha de tendência tem 14 dias, um valor por dia", () => {
    expect(summary?.series.days).toHaveLength(SERIES_DAYS);
    expect(summary?.series.days[0]).toBe("2026-11-10");
    const invoker = summary?.series.rows.find(([h, pos]) => h === INVOKER && pos === 2);
    expect(invoker?.[2]).toEqual(Array(SERIES_DAYS).fill(60));
    expect(invoker?.[3].slice(-6)).toEqual([27, 33, 33, 33, 33, 33]);
  });

  it("dia sem dado fica fora da conta e zera na linha", () => {
    const semDia20 = buildSummary(DAYS.filter((d) => d.day !== "2026-11-20"), PATCHES);
    expect(semDia20?.periods.find((p) => p.kind === "patch")?.days).toBe(4);
    const invoker = semDia20?.series.rows.find(([h, pos]) => h === INVOKER && pos === 2);
    expect(invoker?.[2][10]).toBe(0);
  });

  it("guarda só os últimos patches e passa na própria conferência de formato", () => {
    expect(summary?.patches.map((p) => p.name)).toEqual(["7.40", "7.41", "7.42"]);
    expect(isMetaSummary(summary)).toBe(true);
    expect(isMetaSummary(JSON.parse(JSON.stringify(summary)))).toBe(true);
    expect(isMetaSummary({ ...summary, version: 2 })).toBe(false);
    expect(isMetaSummary({ ...summary, series: { days: ["2026-11-23"], rows: [[1, 1, [1, 2], [0, 1]]] } })).toBe(false);
  });

  it("sem dia nenhum não há resumo", () => {
    expect(buildSummary([], PATCHES)).toBeNull();
  });
});

describe("daysNeeded", () => {
  it("cobre a linha de 14 dias e as três janelas", () => {
    const needed = daysNeeded(PATCHES, "2026-11-23");
    expect(needed[0]).toBe("2026-11-10");
    expect(needed.at(-1)).toBe("2026-11-23");
    expect(needed).toHaveLength(14);
  });

  it("um patch longo pede os dias antigos que a STRATZ não devolve mais, sem o dia da troca", () => {
    const needed = daysNeeded(PATCHES, "2027-01-31");
    expect(needed[0]).toBe("2026-11-11");
    expect(needed).toContain("2026-11-19");
    expect(needed).not.toContain("2026-11-18");
    expect(needed.at(-1)).toBe("2027-01-31");
  });
});
