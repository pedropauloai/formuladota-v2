import { describe, expect, it } from "vitest";
import { bottomCta } from "./bottom-cta";

describe("botão verde da barra inferior", () => {
  it("fora de fila, é sempre o JOGAR DOTA (com o Buscar partida no menu), mesmo com a busca pausada", () => {
    expect(bottomCta({ inQueue: false })).toBe("jogar_dota");
  });

  it("quem está numa fila vê a própria fila primeiro", () => {
    expect(bottomCta({ inQueue: true })).toBe("na_fila");
  });
});
