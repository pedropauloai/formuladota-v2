import { describe, expect, it } from "vitest";
import { porMao } from "./ordem";

const p = (id: string, maoDesde: string | null) => ({ id, maoDesde });

describe("porMao (ordem da plateia)", () => {
  it("quem levantou a mão vem antes de quem não levantou", () => {
    expect(porMao(p("a", "2026-11-24T15:02:09.000Z"), p("b", null))).toBeLessThan(0);
    expect(porMao(p("b", null), p("a", "2026-11-24T15:02:09.000Z"))).toBeGreaterThan(0);
  });

  it("entre as mãos, a mais antiga primeiro", () => {
    expect(porMao(p("a", "2026-11-24T15:02:09.000Z"), p("b", "2026-11-24T15:01:00.000Z"))).toBeGreaterThan(0);
  });

  it("uma lista misturada fica com as mãos no topo, na ordem em que subiram", () => {
    const lista = [p("sem1", null), p("mao2", "2026-11-24T15:05:00.000Z"), p("sem2", null), p("mao1", "2026-11-24T15:01:00.000Z")];
    expect([...lista].sort(porMao).map((x) => x.id)).toEqual(["mao1", "mao2", "sem1", "sem2"]);
  });
});
