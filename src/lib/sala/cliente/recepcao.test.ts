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
