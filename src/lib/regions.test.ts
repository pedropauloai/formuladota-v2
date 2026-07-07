import { describe, it, expect } from "vitest";
import { countryToRegion } from "./regions";

// Mapa país (IP) → região de JOGO sugerida no onboarding. IP sugere, usuário confirma.
// Eixo independente do idioma. Regra-chave: russo/CIS jogam nos servidores europeus
// → entram na região EU (não existe região "RU" separada).
describe("countryToRegion", () => {
  it("BR → BR", () => {
    expect(countryToRegion("BR")).toBe("BR");
    expect(countryToRegion("br")).toBe("BR"); // case-insensitive
  });

  it("LATAM hispânica → LATAM", () => {
    for (const c of ["AR", "PE", "CL", "CO", "MX", "UY", "PY", "BO", "EC", "VE"]) {
      expect(countryToRegion(c)).toBe("LATAM");
    }
  });

  it("Europa Ocidental → EU", () => {
    for (const c of ["DE", "FR", "GB", "ES", "PT", "SE", "PL", "IT"]) {
      expect(countryToRegion(c)).toBe("EU");
    }
  });

  it("CIS / Rússia e vizinhos → EU (não 'RU' separada)", () => {
    for (const c of ["RU", "UA", "BY", "KZ", "GE", "AM", "TR"]) {
      expect(countryToRegion(c)).toBe("EU");
    }
  });

  it("resto do mundo / desconhecido → EU", () => {
    expect(countryToRegion("US")).toBe("EU");
    expect(countryToRegion("CA")).toBe("EU");
    expect(countryToRegion("JP")).toBe("EU");
    expect(countryToRegion("ZZ")).toBe("EU"); // código inexistente
    expect(countryToRegion(null)).toBe("EU");
    expect(countryToRegion(undefined)).toBe("EU");
    expect(countryToRegion("")).toBe("EU");
  });
});
