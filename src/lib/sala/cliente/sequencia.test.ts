import { describe, expect, it } from "vitest";
import { comecaSequencia } from "./sequencia";

const msg = (userId: string | null, em: string) => ({ userId, em });

describe("comecaSequencia (a foto e o nome aparecem no começo de cada sequência da mesma pessoa)", () => {
  it("a primeira mensagem começa uma sequência", () => {
    expect(comecaSequencia(undefined, msg("a", "2026-11-25T10:00:00Z"))).toBe(true);
  });

  it("outra pessoa começa uma sequência nova", () => {
    expect(comecaSequencia(msg("a", "2026-11-25T10:00:00Z"), msg("b", "2026-11-25T10:00:30Z"))).toBe(true);
  });

  it("a mesma pessoa em até 5 minutos continua a sequência", () => {
    expect(comecaSequencia(msg("a", "2026-11-25T10:00:00Z"), msg("a", "2026-11-25T10:05:00Z"))).toBe(false);
  });

  it("a mesma pessoa depois de 5 minutos começa outra sequência", () => {
    expect(comecaSequencia(msg("a", "2026-11-25T10:00:00Z"), msg("a", "2026-11-25T10:05:01Z"))).toBe(true);
  });
});
