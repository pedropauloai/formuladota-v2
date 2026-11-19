import { describe, expect, it } from "vitest";
import { bottomCta } from "./bottom-cta";

describe("botão verde da barra inferior", () => {
  it("com a busca pausada e a loja aberta, vira JOGAR COM O PEDRO", () => {
    expect(bottomCta({ inQueue: false, queuePaused: true, showLoja: true })).toBe("jogar_com_o_pedro");
  });

  it("com a busca no ar, continua JOGAR DOTA", () => {
    expect(bottomCta({ inQueue: false, queuePaused: false, showLoja: true })).toBe("jogar_dota");
  });

  it("com a loja fechada, não manda para uma fila que some (flag autoritativa)", () => {
    expect(bottomCta({ inQueue: false, queuePaused: true, showLoja: false })).toBe("jogar_dota");
  });

  it("quem está numa fila vê a própria fila primeiro", () => {
    expect(bottomCta({ inQueue: true, queuePaused: true, showLoja: true })).toBe("na_fila");
  });
});
