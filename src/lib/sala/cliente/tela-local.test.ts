import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "./conexao";
import { compartilhar } from "./tela-local";

function faixa(kind: "video" | "audio", id: string) {
  return { kind, id, contentHint: "", parada: false, stop() { this.parada = true; }, addEventListener: vi.fn(), removeEventListener: vi.fn() };
}
type Faixa = ReturnType<typeof faixa>;

function captura(video: Faixa | null, audio: Faixa | null) {
  const v = video ? [video] : [];
  const a = audio ? [audio] : [];
  return { getVideoTracks: () => v, getAudioTracks: () => a, getTracks: () => [...v, ...a] };
}

function conexaoFalsa() {
  const publicadas: Array<{ faixa: unknown; trocas: unknown[]; parada: boolean }> = [];
  const conn = {
    publish: vi.fn(() => () => undefined),
    publishTrocavel: (track: unknown) => {
      const pub = { faixa: track, trocas: [] as unknown[], parada: false };
      publicadas.push(pub);
      return { parar: () => { pub.parada = true; }, trocar: (t: unknown) => { pub.trocas.push(t); } };
    },
  } as unknown as Connection;
  return { conn, publicadas };
}

function telaDoNavegador(...capturas: Array<ReturnType<typeof captura> | Error>) {
  const getDisplayMedia = vi.fn(async () => {
    const proxima = capturas.shift();
    if (!proxima || proxima instanceof Error) throw proxima ?? new Error("sem captura");
    return proxima;
  });
  vi.stubGlobal("navigator", { mediaDevices: { getDisplayMedia } });
}

const opcoes = (conn: Connection) => ({ conn, qualidade: "padrao" as const, videoMaxKbps: 2500, rotular: vi.fn(), onFim: vi.fn() });

afterEach(() => vi.unstubAllGlobals());

describe("trocar a janela compartilhada", () => {
  it("troca a imagem e o som na mesma publicação, sem publicar de novo, e solta a captura antiga", async () => {
    const v1 = faixa("video", "v1"), a1 = faixa("audio", "a1"), v2 = faixa("video", "v2"), a2 = faixa("audio", "a2");
    telaDoNavegador(captura(v1, a1), captura(v2, a2));
    const { conn, publicadas } = conexaoFalsa();
    const tela = await compartilhar(opcoes(conn));
    expect(await tela?.trocar()).toBe(true);
    expect(publicadas).toHaveLength(2);
    expect(publicadas[0]?.trocas).toEqual([v2]);
    expect(publicadas[1]?.trocas).toEqual([a2]);
    expect(v1.parada && a1.parada).toBe(true);
    expect(v2.parada).toBe(false);
    expect(tela?.stream.getVideoTracks()[0]).toBe(v2);
  });

  it("a janela antiga, ao parar, não encerra a tela nova", async () => {
    const v1 = faixa("video", "v1"), v2 = faixa("video", "v2");
    telaDoNavegador(captura(v1, null), captura(v2, null));
    const { conn } = conexaoFalsa();
    const o = opcoes(conn);
    const tela = await compartilhar(o);
    await tela?.trocar();
    expect(v1.removeEventListener).toHaveBeenCalledWith("ended", o.onFim);
    expect(v2.addEventListener).toHaveBeenCalledWith("ended", o.onFim);
  });

  it("cancelar a escolha da janela mantém a tela que estava", async () => {
    const v1 = faixa("video", "v1");
    telaDoNavegador(captura(v1, null), new Error("cancelou"));
    const { conn, publicadas } = conexaoFalsa();
    const tela = await compartilhar(opcoes(conn));
    expect(await tela?.trocar()).toBe(false);
    expect(publicadas[0]?.trocas).toEqual([]);
    expect(v1.parada).toBe(false);
  });

  it("janela nova sem som solta o som da antiga; com som onde não havia, publica o som", async () => {
    const v1 = faixa("video", "v1"), a1 = faixa("audio", "a1"), v2 = faixa("video", "v2"), v3 = faixa("video", "v3"), a3 = faixa("audio", "a3");
    telaDoNavegador(captura(v1, a1), captura(v2, null), captura(v3, a3));
    const { conn, publicadas } = conexaoFalsa();
    const tela = await compartilhar(opcoes(conn));
    await tela?.trocar();
    expect(publicadas[1]?.parada).toBe(true);
    await tela?.trocar();
    expect(publicadas).toHaveLength(3);
    expect(publicadas[2]?.faixa).toBe(a3);
  });
});
