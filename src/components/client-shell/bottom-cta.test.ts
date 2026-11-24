import { describe, expect, it } from "vitest";
import { bottomCta } from "./bottom-cta";

describe("botão principal da barra inferior", () => {
  it("com a busca pausada e a loja aberta, é o JOGAR COM O PPA (leva à fila da party)", () => {
    expect(bottomCta({ inQueue: false, queuePaused: true, showLoja: true })).toBe("jogar_com_o_ppa");
  });

  it("com a busca de volta, volta o JOGAR DOTA com o menu", () => {
    expect(bottomCta({ inQueue: false, queuePaused: false, showLoja: true })).toBe("jogar_dota");
  });

  it("com a loja fechada não há fila da party: fica o JOGAR DOTA", () => {
    expect(bottomCta({ inQueue: false, queuePaused: true, showLoja: false })).toBe("jogar_dota");
  });

  it("quem está numa fila vê a própria fila primeiro", () => {
    expect(bottomCta({ inQueue: true, queuePaused: true, showLoja: true })).toBe("na_fila");
  });
});
