import { describe, expect, it, vi } from "vitest";
import type { Connection } from "./conexao";
import { Recepcao, type FaixaRemota } from "./recepcao";

function conexaoFalsa() {
  const pedidas: string[] = [];
  const soltas: string[] = [];
  const camadas: string[] = [];
  const conn = {
    receive: (ref: { trackName: string }, _onTrack: unknown, layer?: string) => {
      pedidas.push(layer ? `${ref.trackName}@${layer}` : ref.trackName);
      return { stop: () => soltas.push(ref.trackName), setLayer: (rid: string) => camadas.push(`${ref.trackName}@${rid}`) };
    },
  } as unknown as Connection;
  return { conn, pedidas, soltas, camadas };
}

const faixa = (trackName: string, tipo: FaixaRemota["tipo"]): FaixaRemota => ({ sessionId: "sessao-do-dono", trackName, tipo, userId: "dono" });
const LISTA = [faixa("voz-dono", "voz"), faixa("tela-dono", "tela"), faixa("som-da-tela", "tela_audio")];
const nada = () => undefined;

describe("Recepcao fora da página da sala", () => {
  it("a tela segue chegando, na camada leve, e volta à escolhida, sem soltar nem pedir a faixa de novo", () => {
    const { conn, pedidas, soltas, camadas } = conexaoFalsa();
    const r = new Recepcao(conn, "f", nada, nada);
    r.sync(LISTA);
    r.setForaDaSala(true);
    r.setForaDaSala(false);
    expect(pedidas).toEqual(["voz-dono", "tela-dono@f", "som-da-tela"]);
    expect(soltas).toEqual([]);
    expect(camadas).toEqual(["tela-dono@h", "tela-dono@f"]);
  });

  it("a tela que começa enquanto a pessoa está fora já vem na leve", () => {
    const { conn, pedidas } = conexaoFalsa();
    const r = new Recepcao(conn, "f", nada, nada);
    r.setForaDaSala(true);
    r.sync(LISTA);
    expect(pedidas).toContain("tela-dono@h");
  });

  it("escolher a camada fora da sala vale ao voltar", () => {
    const { conn, camadas } = conexaoFalsa();
    const r = new Recepcao(conn, "h", nada, nada);
    r.sync(LISTA);
    r.setForaDaSala(true);
    r.setLayer("f");
    r.setForaDaSala(false);
    expect(camadas.at(-1)).toBe("tela-dono@f");
  });
});

describe("Recepcao ao sair e voltar rápido", () => {
  it("sair espera, e voltar antes da espera não troca a camada", () => {
    vi.useFakeTimers();
    const { conn, camadas } = conexaoFalsa();
    const r = new Recepcao(conn, "f", nada, nada);
    r.sync(LISTA);
    r.setForaDaSala(true, 1500);
    r.setForaDaSala(false);
    vi.advanceTimersByTime(2000);
    expect(camadas).toEqual([]);
    vi.useRealTimers();
  });

  it("sem voltar, desce para a leve depois da espera", () => {
    vi.useFakeTimers();
    const { conn, camadas } = conexaoFalsa();
    const r = new Recepcao(conn, "f", nada, nada);
    r.sync(LISTA);
    r.setForaDaSala(true, 1500);
    expect(camadas).toEqual([]);
    vi.advanceTimersByTime(1600);
    expect(camadas).toEqual(["tela-dono@h"]);
    vi.useRealTimers();
  });
});

describe("Recepcao quando a faixa não chega", () => {
  it("faixa pedida que não chega em 10 s é solta e pedida de novo", () => {
    vi.useFakeTimers();
    const { conn, pedidas, soltas } = conexaoFalsa();
    const r = new Recepcao(conn, "h", nada, nada);
    r.sync([faixa("voz-dono", "voz")]);
    vi.advanceTimersByTime(10_500);
    expect(soltas).toEqual(["voz-dono"]);
    expect(pedidas).toEqual(["voz-dono", "voz-dono"]);
    vi.useRealTimers();
  });

  it("faixa que chega a tempo não é pedida de novo", () => {
    vi.useFakeTimers();
    vi.stubGlobal("MediaStream", class {
      constructor(readonly tracks: unknown[]) {}
    });
    const chegadas: Array<(t: MediaStreamTrack) => void> = [];
    const pedidas: string[] = [];
    const conn = {
      receive: (ref: { trackName: string }, onTrack: (t: MediaStreamTrack) => void) => {
        pedidas.push(ref.trackName);
        chegadas.push(onTrack);
        return { stop: () => undefined, setLayer: () => undefined };
      },
    } as unknown as Connection;
    const r = new Recepcao(conn, "h", nada, nada);
    r.sync([faixa("tela-dono", "tela")]);
    chegadas[0]?.({ kind: "video" } as MediaStreamTrack);
    vi.advanceTimersByTime(20_000);
    expect(pedidas).toEqual(["tela-dono"]);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("faixa que saiu da lista antes dos 10 s não é pedida de novo", () => {
    vi.useFakeTimers();
    const { conn, pedidas } = conexaoFalsa();
    const r = new Recepcao(conn, "h", nada, nada);
    r.sync([faixa("voz-dono", "voz")]);
    r.sync([]);
    vi.advanceTimersByTime(20_000);
    expect(pedidas).toEqual(["voz-dono"]);
    vi.useRealTimers();
  });
});

describe("Recepcao quando a ligação trava", () => {
  it("faixa que não chega nem na segunda tentativa avisa que a ligação travou, uma vez", () => {
    vi.useFakeTimers();
    const { conn } = conexaoFalsa();
    const travou = vi.fn();
    const r = new Recepcao(conn, "h", nada, nada, nada, travou);
    r.sync([faixa("voz-dono", "voz")]);
    vi.advanceTimersByTime(10_500);
    expect(travou).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(travou).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
