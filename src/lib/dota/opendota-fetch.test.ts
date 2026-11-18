import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "chave-de-teste-opendota";

async function load() {
  vi.resetModules();
  process.env.OPENDOTA_API_KEY = KEY;
  return import("./opendota-fetch");
}

function reply(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("openDotaFetch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers({ toFake: ["setTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("manda a chave em toda chamada e devolve o JSON", async () => {
    const { openDotaJson } = await load();
    fetchMock.mockResolvedValueOnce(reply(200, { ok: 1 }));
    await expect(openDotaJson("/players/1")).resolves.toEqual({ ok: 1 });
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/players/1");
    expect(url.searchParams.get("api_key")).toBe(KEY);
  });

  it("429 seguido de 200: tenta de novo e passa", async () => {
    const { openDotaFetch } = await load();
    fetchMock.mockResolvedValueOnce(reply(429)).mockResolvedValueOnce(reply(200));
    const pending = openDotaFetch("/matches/1");
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toBeInstanceOf(Response);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("404 é 'ainda indexando': falha na hora, sem nova tentativa", async () => {
    const { openDotaFetch, isOpenDotaPending, OpenDotaError } = await load();
    fetchMock.mockResolvedValueOnce(reply(404));
    const err = await openDotaFetch("/matches/1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenDotaError);
    expect((err as InstanceType<typeof OpenDotaError>).kind).toBe("indexando");
    expect(isOpenDotaPending(err)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("429 que não passa vira falha de verdade, e a mensagem não carrega a chave", async () => {
    const { openDotaFetch, isOpenDotaPending } = await load();
    fetchMock.mockResolvedValue(reply(429));
    const pending = openDotaFetch("/matches/1").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(4_000);
    const err = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((err as { kind: string }).kind).toBe("bloqueada");
    expect(isOpenDotaPending(err)).toBe(false);
    expect(String((err as Error).message)).not.toContain(KEY);
  });

  it("erro de rede ou tempo esgotado falha na hora como 'rede'", async () => {
    const { openDotaFetch } = await load();
    fetchMock.mockRejectedValueOnce(new Error("The operation was aborted due to timeout"));
    const err = await openDotaFetch("/players/1").catch((e: unknown) => e);
    expect((err as { kind: string }).kind).toBe("rede");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
