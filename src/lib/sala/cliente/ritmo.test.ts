import { describe, expect, it } from "vitest";
import { beatDue, estadoIntervalMs, statsEveryBeats, vozCaiu } from "./ritmo";

describe("ritmo do cliente (plano grátis do Supabase, spec ADR-004)", () => {
  it("quem fala pergunta o estado a cada 2 s; a plateia, a cada 3 s", () => {
    expect(estadoIntervalMs("dono")).toBe(2000);
    expect(estadoIntervalMs("falante")).toBe(2000);
    expect(estadoIntervalMs("membro")).toBe(2000);
    expect(estadoIntervalMs("ouvinte")).toBe(3000);
  });

  it("o batimento vai a cada 10 s, ou na hora em que algo mudou", () => {
    expect(beatDue({ now: 10_000, lastBeatAt: 0, changed: false })).toBe(true);
    expect(beatDue({ now: 9_999, lastBeatAt: 0, changed: false })).toBe(false);
    expect(beatDue({ now: 1_000, lastBeatAt: 0, changed: true })).toBe(true);
    expect(beatDue({ now: 1_000, lastBeatAt: null, changed: false })).toBe(true);
  });

  it("métricas: a plateia da sala pública manda a cada 30 s; o resto, a cada 10 s", () => {
    expect(statsEveryBeats("ouvinte", "palco")).toBe(3);
    expect(statsEveryBeats("falante", "palco")).toBe(1);
    expect(statsEveryBeats("membro", "mentoria")).toBe(1);
  });
});

describe("vozCaiu (o servidor fechou a voz sem o navegador ver o mutado)", () => {
  const base = { noAr: true, podeFalar: true, vozAberta: false, noArDesde: 0, agora: 9_000 };
  it("voz no ar no navegador, fora do estado do servidor há mais de 8 s, com a pessoa podendo falar: religa", () => {
    expect(vozCaiu(base)).toBe(true);
  });
  it("logo depois de publicar, espera a faixa aparecer no estado comum (até 8 s)", () => {
    expect(vozCaiu({ ...base, agora: 7_000 })).toBe(false);
  });
  it("com a voz no estado do servidor, fora do ar, ou sem poder falar, não mexe", () => {
    expect(vozCaiu({ ...base, vozAberta: true })).toBe(false);
    expect(vozCaiu({ ...base, noAr: false })).toBe(false);
    expect(vozCaiu({ ...base, podeFalar: false })).toBe(false);
  });
});
