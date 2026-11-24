import { describe, expect, it } from "vitest";
import { isQueuePath, pageviewPath, shouldSendPageview } from "./paginas";

describe("pageviewPath", () => {
  it("guarda só o caminho, sem query nem âncora", () => {
    expect(pageviewPath(new URL("https://www.formuladota.com.br/party?utm_source=ig#fila"))).toBe("/party");
  });

  it("tira a barra do fim, menos na raiz", () => {
    expect(pageviewPath(new URL("https://www.formuladota.com.br/loja/"))).toBe("/loja");
    expect(pageviewPath(new URL("https://www.formuladota.com.br/"))).toBe("/");
  });

  it("corta caminho longo no limite da coluna", () => {
    expect(pageviewPath(new URL(`https://www.formuladota.com.br/${"a".repeat(400)}`))).toHaveLength(300);
  });
});

describe("isQueuePath", () => {
  it("a fila é a /party, e a /grupo em espanhol", () => {
    expect(isQueuePath("/party")).toBe(true);
    expect(isQueuePath("/grupo")).toBe(true);
    expect(isQueuePath("/party/home-previa")).toBe(false);
    expect(isQueuePath("/loja")).toBe(false);
    expect(isQueuePath("/partidas")).toBe(false);
  });
});

describe("shouldSendPageview", () => {
  it("manda a primeira vez que a aba passa por um caminho", () => {
    expect(shouldSendPageview([], "/", false)).toBe(true);
    expect(shouldSendPageview(["/"], "/party", false)).toBe(true);
  });

  it("não repete um caminho que a aba já mandou", () => {
    expect(shouldSendPageview(["/", "/party"], "/party", false)).toBe(false);
  });

  it("campanha nova sempre manda, para o cookie de origem seguir o último link", () => {
    expect(shouldSendPageview(["/"], "/", true)).toBe(true);
  });
});
