import { describe, expect, it } from "vitest";
import { daysBetween, groupWinDays, isMetaDay, shiftDay, sumDays, type MetaDay } from "./days";

// Meia-noite UTC em segundos, como o winDay da STRATZ devolve o campo day.
const sec = (day: string) => Date.parse(`${day}T00:00:00Z`) / 1000;

describe("dias em UTC", () => {
  it("anda para a frente e para trás, virando o mês", () => {
    expect(shiftDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDay("2026-11-23", -6)).toBe("2026-11-17");
  });

  it("lista os dias com as duas pontas", () => {
    expect(daysBetween("2026-11-29", "2026-12-02")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(daysBetween("2026-11-20", "2026-11-19")).toEqual([]);
  });
});

describe("groupWinDays", () => {
  it("junta as 5 funções por dia e descarta linha vazia ou fora do formato", () => {
    const days = groupWinDays({
      1: [
        { day: sec("2026-11-20"), heroId: 1, matchCount: 100, winCount: 55 },
        { day: sec("2026-11-19"), heroId: 1, matchCount: 80, winCount: 40 },
        { day: sec("2026-11-19"), heroId: 2, matchCount: 0, winCount: 0 },
      ],
      2: [{ day: sec("2026-11-19"), heroId: 74, matchCount: 300, winCount: 160 }, { day: "x", heroId: 3 }, null],
      3: "não é lista",
    });
    expect(days.map((d) => d.day)).toEqual(["2026-11-19", "2026-11-20"]);
    expect(days[0]?.stats).toEqual([
      [1, 1, 80, 40],
      [74, 2, 300, 160],
    ]);
    expect(days[1]?.stats).toEqual([[1, 1, 100, 55]]);
    expect(days.every(isMetaDay)).toBe(true);
  });
});

describe("sumDays", () => {
  it("soma o mesmo herói na mesma função e separa as funções", () => {
    const days: MetaDay[] = [
      { day: "2026-11-19", stats: [[1, 1, 80, 40], [1, 2, 10, 4]] },
      { day: "2026-11-20", stats: [[1, 1, 100, 55]] },
    ];
    expect(sumDays(days)).toEqual([
      [1, 1, 180, 95],
      [1, 2, 10, 4],
    ]);
    // Somar não mexe nos dias guardados.
    expect(days[0]?.stats[0]).toEqual([1, 1, 80, 40]);
  });

  it("recusa dia em formato errado", () => {
    expect(isMetaDay({ day: "2026-11-19", stats: [[1, 1, 80]] })).toBe(false);
    expect(isMetaDay({ day: "19/11", stats: [] })).toBe(false);
  });
});
