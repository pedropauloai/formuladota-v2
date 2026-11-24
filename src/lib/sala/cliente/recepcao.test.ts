import { describe, expect, it, vi } from "vitest";
import type { Connection } from "./conexao";
import { Recepcao, type FaixaRemota } from "./recepcao";

function conexaoFalsa() {
  const pedidas: string[] = [];
  const soltas: string[] = [];
  const conn = {
    receive: (ref: { trackName: string }) => {
      pedidas.push(ref.trackName);
      return { stop: () => soltas.push(ref.trackName), setLayer: () => undefined };
    },
  } as unknown as Connection;
  return { conn, pedidas, soltas };
}

const faixa = (trackName: string, tipo: FaixaRemota["tipo"]): FaixaRemota => ({ sessionId: "sessao-do-dono", trackName, tipo, userId: "dono" });
const LISTA = [faixa("voz-dono", "voz"), faixa("tela-dono", "tela"), faixa("som-da-tela", "tela_audio")];

describe("Recepcao fora da página da sala", () => {
  it("recebe só as vozes enquanto a página da sala está fechada", () => {
    const { conn, pedidas } = conexaoFalsa();
    const r = new Recepcao(conn, "h", () => undefined, () => undefined);
    r.setVerTela(false);
    r.sync(LISTA);
    expect(pedidas).toEqual(["voz-dono"]);
  });

  it("ao voltar para a página da sala, pede a tela e o som dela de novo", () => {
    const { conn, pedidas } = conexaoFalsa();
    const r = new Recepcao(conn, "h", () => undefined, () => undefined);
    r.setVerTela(false);
    r.sync(LISTA);
    r.setVerTela(true);
    expect(pedidas).toEqual(["voz-dono", "tela-dono", "som-da-tela"]);
  });

  it("ao sair da página da sala, solta a tela que chegava e mantém a voz", () => {
    const { conn, soltas } = conexaoFalsa();
    const r = new Recepcao(conn, "h", () => undefined, () => undefined);
    r.sync(LISTA);
    r.setVerTela(false);
    expect(soltas.sort()).toEqual(["som-da-tela", "tela-dono"]);
  });
});

describe("Recepcao ao sair e voltar rápido", () => {
  it("soltar a tela espera, e voltar antes da espera não pede a tela de novo", () => {
    vi.useFakeTimers();
    const { conn, pedidas, soltas } = conexaoFalsa();
    const r = new Recepcao(conn, "h", () => undefined, () => undefined);
    r.sync(LISTA);
    r.setVerTela(false, 1500);
    r.setVerTela(true);
    vi.advanceTimersByTime(2000);
    expect(soltas).toEqual([]);
    expect(pedidas).toEqual(["voz-dono", "tela-dono", "som-da-tela"]);
    vi.useRealTimers();
  });

  it("sem voltar, solta a tela depois da espera", () => {
    vi.useFakeTimers();
    const { conn, soltas } = conexaoFalsa();
    const r = new Recepcao(conn, "h", () => undefined, () => undefined);
    r.sync(LISTA);
    r.setVerTela(false, 1500);
    expect(soltas).toEqual([]);
    vi.advanceTimersByTime(1600);
    expect(soltas.sort()).toEqual(["som-da-tela", "tela-dono"]);
    vi.useRealTimers();
  });
});
