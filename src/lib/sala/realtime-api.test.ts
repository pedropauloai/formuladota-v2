import { afterEach, describe, expect, it, vi } from "vitest";
import { createSfuSession, forceCloseTracks, generateIceServers, realtimeEnv, revokeTurnCredential, sfu, type RealtimeEnv } from "./realtime-api";

vi.mock("server-only", () => ({}));

const env: RealtimeEnv = { appId: "app123", appSecret: "segredo-do-app", turnKeyId: "turn456", turnKeyToken: "token-do-turn" };

function fakeFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

function first(calls: Array<{ url: string; init: RequestInit }>) {
  const call = calls[0];
  if (!call) throw new Error("a API não foi chamada");
  return call;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("realtimeEnv", () => {
  it("sem o id ou o segredo do app, a sala fica indisponível (null)", () => {
    vi.stubEnv("REALTIME_APP_ID", "");
    vi.stubEnv("REALTIME_APP_SECRET", "x");
    expect(realtimeEnv()).toBeNull();
  });

  it("lê as quatro variáveis, com o TURN opcional", () => {
    vi.stubEnv("REALTIME_APP_ID", "a");
    vi.stubEnv("REALTIME_APP_SECRET", "s");
    vi.stubEnv("REALTIME_TURN_KEY_ID", "");
    vi.stubEnv("REALTIME_TURN_KEY_TOKEN", "");
    expect(realtimeEnv()).toEqual({ appId: "a", appSecret: "s", turnKeyId: null, turnKeyToken: null });
  });
});

describe("sfu", () => {
  it("chama a API oficial com o segredo no cabeçalho e devolve só o corpo", async () => {
    const calls = fakeFetch(201, { sessionId: "abc" });
    const res = await createSfuSession(env);
    expect(first(calls).url).toBe("https://rtc.live.cloudflare.com/v1/apps/app123/sessions/new");
    expect(first(calls).init.method).toBe("POST");
    expect((first(calls).init.headers as Record<string, string>).Authorization).toBe("Bearer segredo-do-app");
    expect(res).toEqual({ status: 201, body: { sessionId: "abc" } });
    expect(JSON.stringify(res)).not.toContain("segredo");
  });

  it("recusa caminho que tenta sair da pasta do app", async () => {
    fakeFetch(200, {});
    await expect(sfu(env, "/sessions/../../apps/outro", { method: "GET" })).rejects.toThrow();
  });

  it("resposta que não é JSON vira erro no formato do SFU", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad gateway", { status: 502 })));
    const res = await sfu(env, "/sessions/new", { method: "POST" });
    expect(res.status).toBe(502);
    expect(res.body.errorCode).toBe("resposta_invalida");
  });
});

describe("forceCloseTracks", () => {
  it("fecha à força pelos mids, sem SDP", async () => {
    const calls = fakeFetch(200, { tracks: [{ mid: "0" }] });
    await forceCloseTracks(env, "sessao1", ["0", "1"]);
    expect(first(calls).url).toBe("https://rtc.live.cloudflare.com/v1/apps/app123/sessions/sessao1/tracks/close");
    expect(first(calls).init.method).toBe("PUT");
    expect(JSON.parse(first(calls).init.body as string)).toEqual({ tracks: [{ mid: "0" }, { mid: "1" }], force: true });
  });

  it("sem mid, não chama a API", async () => {
    const calls = fakeFetch(200, {});
    await forceCloseTracks(env, "sessao1", []);
    expect(calls).toHaveLength(0);
  });

  it("com a Cloudflare ocupada ou fora (429 ou 5xx), tenta de novo uma vez antes de desistir", async () => {
    const calls = fakeFetch(503, { errorCode: "indisponivel" });
    const res = await forceCloseTracks(env, "sessao1", ["0"]);
    expect(calls).toHaveLength(2);
    expect(res?.status).toBe(503);
  });

  it("recusa que não é de ocupação (4xx) não repete", async () => {
    const calls = fakeFetch(404, { errorCode: "sessao_inexistente" });
    await forceCloseTracks(env, "sessao1", ["0"]);
    expect(calls).toHaveLength(1);
  });
});

describe("generateIceServers", () => {
  it("pede credencial de curta duração e tira a porta 53, que o navegador bloqueia", async () => {
    const calls = fakeFetch(201, {
      iceServers: [
        { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"] },
        { urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:53?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"], username: "u", credential: "c" },
      ],
    });
    const { iceServers: servers, username } = await generateIceServers(env, 3600, "sala-1");
    expect(first(calls).url).toBe("https://rtc.live.cloudflare.com/v1/turn/keys/turn456/credentials/generate-ice-servers");
    expect((first(calls).init.headers as Record<string, string>).Authorization).toBe("Bearer token-do-turn");
    expect(JSON.parse(first(calls).init.body as string)).toEqual({ ttl: 3600, customIdentifier: "sala-1" });
    expect(username).toBe("u");
    expect(servers).toEqual([
      { urls: ["stun:stun.cloudflare.com:3478"] },
      { urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"], username: "u", credential: "c" },
    ]);
  });

  it("sem chave de TURN, só o STUN da Cloudflare", async () => {
    const calls = fakeFetch(201, {});
    const { iceServers: servers, username } = await generateIceServers({ ...env, turnKeyId: null, turnKeyToken: null }, 3600, "sala-1");
    expect(calls).toHaveLength(0);
    expect(servers).toEqual([{ urls: ["stun:stun.cloudflare.com:3478"] }]);
    expect(username).toBeNull();
  });
});

describe("revokeTurnCredential", () => {
  it("revoga a credencial de quem foi expulso, pelo nome de usuário do TURN", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    const calls = (globalThis.fetch as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls;
    expect(await revokeTurnCredential(env, "bc91b63e2b5d759f")).toBe(true);
    expect(calls[0]?.[0]).toBe("https://rtc.live.cloudflare.com/v1/turn/keys/turn456/credentials/bc91b63e2b5d759f/revoke");
    expect(calls[0]?.[1].method).toBe("POST");
  });

  it("recusa nome de usuário que tenta sair da pasta e não chama a API sem chave", async () => {
    const fn = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fn);
    expect(await revokeTurnCredential(env, "../keys")).toBe(false);
    expect(await revokeTurnCredential({ ...env, turnKeyId: null, turnKeyToken: null }, "bc91b63e2b5d759f")).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });
});
