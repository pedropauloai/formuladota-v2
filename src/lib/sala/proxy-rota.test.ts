import { describe, expect, it } from "vitest";
import { clientIp, matchRoute, readJson, MAX_BODY_BYTES } from "./proxy-rota";

describe("matchRoute", () => {
  it("aceita as quatro rotas do partytracks", () => {
    expect(matchRoute("POST", ["sessions", "new"])).toEqual({ kind: "new" });
    expect(matchRoute("POST", ["sessions", "abc12345", "tracks", "new"])).toEqual({ kind: "tracks", sid: "abc12345" });
    expect(matchRoute("PUT", ["sessions", "abc12345", "renegotiate"])).toEqual({ kind: "renegotiate", sid: "abc12345" });
    expect(matchRoute("PUT", ["sessions", "abc12345", "tracks", "close"])).toEqual({ kind: "close", sid: "abc12345" });
  });

  it("recusa método trocado, rota a mais e o pedido de credencial do TURN (vem pela entrada)", () => {
    expect(matchRoute("GET", ["sessions", "new"])).toBeNull();
    expect(matchRoute("PUT", ["sessions", "abc12345", "tracks", "new"])).toBeNull();
    expect(matchRoute("POST", ["sessions", "abc12345", "tracks", "new", "x"])).toBeNull();
    expect(matchRoute("GET", ["generate-ice-servers"])).toBeNull();
    expect(matchRoute("GET", ["sessions", "abc12345"])).toBeNull();
  });

  it("recusa id de sessão que tenta sair da pasta do app ou tem caractere estranho", () => {
    expect(matchRoute("POST", ["sessions", "..", "tracks", "new"])).toBeNull();
    expect(matchRoute("POST", ["sessions", "abc/../../x", "tracks", "new"])).toBeNull();
    expect(matchRoute("POST", ["sessions", "abc%2F..%2F", "tracks", "new"])).toBeNull();
    expect(matchRoute("POST", ["sessions", "curto", "tracks", "new"])).toBeNull();
  });
});

describe("readJson", () => {
  const req = (body: string) => new Request("http://localhost/x", { method: "POST", body });

  it("lê JSON, devolve undefined sem corpo e null para corpo inválido ou grande demais", async () => {
    expect(await readJson(req('{"a":1}'))).toEqual({ a: 1 });
    expect(await readJson(new Request("http://localhost/x", { method: "POST" }))).toBeUndefined();
    expect(await readJson(req("{quebrado"))).toBeNull();
    expect(await readJson(req(`"${"x".repeat(MAX_BODY_BYTES)}"`))).toBeNull();
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost/x", { headers });

  it("usa o IP que a Cloudflare põe e ignora valor que não é IP", () => {
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-forwarded-for": "2001:db8::1, 10.0.0.1" }))).toBe("2001:db8::1");
    expect(clientIp(req({ "cf-connecting-ip": "1.2.3.4'; drop table" }))).toBeNull();
    expect(clientIp(req({}))).toBeNull();
  });
});
