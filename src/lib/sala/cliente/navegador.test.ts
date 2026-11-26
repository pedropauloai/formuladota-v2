import { describe, expect, it } from "vitest";
import { iconeDoSite, navegadorDe, ondeAvisa, sistemaDe } from "./navegador";

const UA = {
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
  opera: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/126.0.0.0",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
  safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};

describe("qual navegador e qual sistema a pessoa usa (para o guia do microfone)", () => {
  it("reconhece Chrome, Edge, Opera, Firefox e Safari pelo que o navegador diz de si", () => {
    expect(navegadorDe(UA.chrome)).toBe("chrome");
    expect(navegadorDe(UA.edge)).toBe("edge");
    expect(navegadorDe(UA.opera)).toBe("opera");
    expect(navegadorDe(UA.firefox)).toBe("firefox");
    expect(navegadorDe(UA.safari)).toBe("safari");
    expect(navegadorDe("")).toBe("outro");
  });

  it("o Brave se apresenta como Chrome: reconhece pela marca ou pelo navigator.brave", () => {
    expect(navegadorDe(UA.chrome, { brave: true })).toBe("brave");
    expect(navegadorDe(UA.chrome, { marcas: ["Chromium", "Brave"] })).toBe("brave");
    expect(navegadorDe(UA.chrome, { marcas: ["Chromium", "Google Chrome"] })).toBe("chrome");
  });

  it("o aviso de permissão aparece à esquerda, junto do endereço, e no Safari no centro", () => {
    for (const n of ["chrome", "edge", "opera", "brave", "firefox", "outro"] as const) expect(ondeAvisa(n)).toBe("esquerda");
    expect(ondeAvisa("safari")).toBe("centro");
  });

  it("o ícone ao lado do endereço que abre a permissão do site: ajustes no Chrome, cadeado no Edge, microfone riscado no Firefox", () => {
    expect(iconeDoSite("chrome")).toBe("ajustes");
    expect(iconeDoSite("brave")).toBe("ajustes");
    expect(iconeDoSite("edge")).toBe("cadeado");
    expect(iconeDoSite("opera")).toBe("cadeado");
    expect(iconeDoSite("firefox")).toBe("microfone");
    expect(iconeDoSite("safari")).toBe("safari");
    expect(iconeDoSite("outro")).toBe("ajustes");
  });

  it("o sistema, para o caminho da privacidade do microfone", () => {
    expect(sistemaDe(UA.chrome)).toBe("windows");
    expect(sistemaDe(UA.safari)).toBe("mac");
    expect(sistemaDe(UA.linux)).toBe("outro");
  });
});
