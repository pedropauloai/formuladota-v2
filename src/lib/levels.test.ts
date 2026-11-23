import { describe, it, expect } from "vitest";
import { xpNoNivel, xpProgress } from "./levels";

describe("barra de XP do /progresso", () => {
  it("quem terminou o quiz (2.860 XP) está em 11% do nível 7, igual ao anel do avatar", () => {
    const barra = xpNoNivel(2860);
    expect(barra).toMatchObject({ level: 6, xp: 110, custo: 1000 });
    expect(Math.floor(barra.pct * 100)).toBe(11);
    expect(barra.pct).toBe(xpProgress(2860).pct);
  });

  it("começo de nível mostra zero, e não o XP do nível anterior", () => {
    expect(xpNoNivel(2750)).toMatchObject({ level: 6, xp: 0, custo: 1000, pct: 0 });
  });

  it("nível 30 enche a barra", () => {
    expect(xpNoNivel(72050)).toMatchObject({ level: 30, pct: 1 });
  });
});
