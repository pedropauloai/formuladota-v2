import { describe, expect, it } from "vitest";
import { internalizePath, localeFromPath, localizePath } from "./pathnames";

describe("slug da fila da party", () => {
  it("vira /party em português e inglês e /grupo em espanhol", () => {
    expect(localizePath("/party", "pt")).toBe("/party");
    expect(localizePath("/party", "en")).toBe("/party");
    expect(localizePath("/party", "es")).toBe("/grupo");
  });

  it("volta para a rota interna /party", () => {
    expect(internalizePath("/grupo")).toBe("/party");
    expect(internalizePath("/party")).toBe("/party");
  });

  it("/grupo diz o idioma; /party, compartilhado, fica com o cookie", () => {
    expect(localeFromPath("/grupo")).toBe("es");
    expect(localeFromPath("/party")).toBeNull();
  });

  it("não mexe nas rotas que já existiam", () => {
    expect(localizePath("/torneios", "es")).toBe("/torneos");
    expect(internalizePath("/tournaments")).toBe("/torneios");
  });
});
