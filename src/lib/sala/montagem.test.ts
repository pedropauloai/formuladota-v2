import { describe, expect, it } from "vitest";
import type { Verdict } from "./contexto";
import type { RawSnapshot } from "./memoria";
import { compose } from "./montagem";

const palco = {
  id: "sala", kind: "palco" as const, title: "Sala da live", status: "aberta" as const, ownerId: "ppa", isTest: false,
  maxMembers: 30, screenPolicy: "dono" as const, audience: "todos" as const, chatOpen: true, closesAt: "2026-11-24T23:00:00Z", voiceMode: "palco" as const, channelPosition: null,
};

function verdict(over: Partial<Verdict> = {}): Verdict {
  return {
    userId: "eu",
    room: palco,
    settings: { capGb30d: 800, videoMaxKbps: 6000, palcoMaxSpeakers: 4, partyScreenEnabled: false, usageBytes30d: 0 },
    member: { role: "ouvinte", status: "ativo", muted: true, forceMuted: false, handRaisedAt: null, lastSeenAt: null },
    speakers: 0,
    blocked: [],
    decision: { ok: true, role: "ouvinte" },
    ...over,
  };
}

function snap(over: Partial<RawSnapshot> = {}): RawSnapshot {
  return {
    room: { status: "aberta", chat_open: true, closes_at: palco.closesAt },
    members: [
      { u: "ppa", r: "dono", m: false, on: true },
      { u: "eu", r: "ouvinte", m: true, on: true },
    ],
    tracks: [{ s: "s-ppa", u: "ppa", n: "voz-ppa", k: "audio", t: "voz" }],
    chat: [],
    deleted: [],
    removed: [],
    ...over,
  };
}

describe("compose (o que o estado entrega a cada pessoa)", () => {
  it("na plateia: ouve o dono, não fala, levanta a mão e escreve no chat", () => {
    const e = compose(verdict(), snap(), "eu", "ouvinte", 0);
    expect(e.eu).toMatchObject({ papel: "ouvinte", podeFalar: false, podeLevantarMao: true, podeEscrever: true });
    expect(e.faixas?.map((f) => f.trackName)).toEqual(["voz-ppa"]);
  });

  it("chamada ao palco, a pessoa fala já pelo estado comum, antes do próximo batimento", () => {
    const s = snap({ members: [{ u: "ppa", r: "dono", m: false, on: true }, { u: "eu", r: "falante", m: false, on: true }] });
    const e = compose(verdict(), s, "eu", "ouvinte", 0);
    expect(e.eu).toMatchObject({ papel: "falante", podeFalar: true, podeLevantarMao: false });
  });

  it("mutada pelo dono não fala; liberada (sem a marca no estado comum), volta a poder", () => {
    const mutada = snap({ members: [{ u: "eu", r: "falante", m: true, f: true, on: true }] });
    expect(compose(verdict(), mutada, "eu", "falante", 0).eu?.podeFalar).toBe(false);
    const liberada = snap({ members: [{ u: "eu", r: "falante", m: true, on: true }] });
    const ainda = verdict({ member: { role: "falante", status: "ativo", muted: true, forceMuted: true, handRaisedAt: null, lastSeenAt: null } });
    expect(compose(ainda, liberada, "eu", "falante", 0).eu?.podeFalar).toBe(true);
  });

  it("não lista a faixa de quem está bloqueado nem a de quem voltou à plateia", () => {
    const s = snap({
      members: [{ u: "ppa", r: "dono", m: false, on: true }, { u: "chato", r: "falante", m: false, on: true }, { u: "ex", r: "ouvinte", m: false, on: true }, { u: "eu", r: "ouvinte", m: true, on: true }],
      tracks: [{ s: "s-ppa", u: "ppa", n: "voz-ppa", k: "audio", t: "voz" }, { s: "s-c", u: "chato", n: "voz-chato", k: "audio", t: "voz" }, { s: "s-e", u: "ex", n: "voz-ex", k: "audio", t: "voz" }],
    });
    const e = compose(verdict({ blocked: ["chato"] }), s, "eu", "ouvinte", 0);
    expect(e.faixas?.map((f) => f.trackName)).toEqual(["voz-ppa"]);
    expect(e.membros?.find((m) => m.userId === "chato")?.bloqueado).toBe(true);
  });

  it("manda só o chat depois do último que a pessoa já tem, e as apagadas", () => {
    const s = snap({ chat: [{ i: 1, u: "ppa", b: "um", a: "x" }, { i: 2, u: "ppa", b: "dois", a: "x" }], deleted: [7] });
    const e = compose(verdict(), s, "eu", "ouvinte", 1);
    expect(e.chat?.map((m) => m.id)).toEqual([2]);
    expect(e.apagadas).toEqual([7]);
  });

  it("com o chat fechado, a plateia não escreve e o dono sim", () => {
    const s = snap({ room: { status: "aberta", chat_open: false, closes_at: palco.closesAt } });
    expect(compose(verdict(), s, "eu", "ouvinte", 0).eu?.podeEscrever).toBe(false);
    const dono = verdict({ userId: "ppa", decision: { ok: true, role: "dono" } });
    expect(compose(dono, s, "ppa", "dono", 0).eu?.podeEscrever).toBe(true);
  });

  it("o dono não compartilha com outra tela no ar nem com o teto de produção atingido", () => {
    const dono = verdict({ userId: "ppa", decision: { ok: true, role: "dono" } });
    const outra = snap({ members: [{ u: "ppa", r: "dono", m: false, on: true }, { u: "aluno", r: "membro", m: false, on: true }], tracks: [{ s: "s-a", u: "aluno", n: "tela-a", k: "video", t: "tela", q: "padrao" }] });
    expect(compose({ ...dono, room: { ...palco, kind: "mentoria", screenPolicy: "um_por_vez" } }, outra, "ppa", "dono", 0).eu?.motivoTela).toBe("tela_ocupada");
    const teto = verdict({ userId: "ppa", decision: { ok: true, role: "dono" }, settings: { capGb30d: 800, videoMaxKbps: 6000, palcoMaxSpeakers: 4, partyScreenEnabled: false, usageBytes30d: 800e9 } });
    expect(compose(teto, snap(), "ppa", "dono", 0).eu?.motivoTela).toBe("teto_de_trafego");
  });

  it("diz se a voz da pessoa está aberta no servidor (o navegador religa a que caiu)", () => {
    expect(compose(verdict(), snap(), "ppa", "dono", 0).eu?.vozAberta).toBe(true);
    expect(compose(verdict(), snap({ tracks: [] }), "ppa", "dono", 0).eu?.vozAberta).toBe(false);
  });
});

describe("compose nos canais do servidor", () => {
  it("voz livre: a pessoa fala e a voz dela chega aos outros, mesmo com a linha antiga da plateia", () => {
    const livre = { ...palco, voiceMode: "livre" as const, channelPosition: 20 };
    const s = snap({
      members: [{ u: "ppa", r: "dono", m: false, on: true }, { u: "eu", r: "ouvinte", m: false, on: true }, { u: "outro", r: "ouvinte", m: false, on: true }],
      tracks: [{ s: "s-outro", u: "outro", n: "voz-outro", k: "audio", t: "voz" }],
    });
    const e = compose(verdict({ room: livre, decision: { ok: true, role: "falante" } }), s, "eu", "falante", 0);
    expect(e.eu).toMatchObject({ papel: "falante", podeFalar: true, podeLevantarMao: false });
    expect(e.membros?.find((m) => m.userId === "outro")?.papel).toBe("falante");
    expect(e.faixas?.map((f) => f.trackName)).toEqual(["voz-outro"]);
    expect(e.sala).toMatchObject({ modo: "livre", canal: true });
  });

  it("canal de texto: escreve, sem voz, sem tela e sem mão", () => {
    const texto = { ...palco, kind: "texto" as const, title: "geral", maxMembers: 200, channelPosition: 10 };
    const e = compose(verdict({ room: texto }), snap({ tracks: [] }), "eu", "ouvinte", 0);
    expect(e.eu).toMatchObject({ podeEscrever: true, podeFalar: false, podeLevantarMao: false, podeCompartilharTela: false });
    expect(e.sala).toMatchObject({ tipo: "texto", modo: "palco", canal: true });
  });
});

describe("compose: o dono no canal de texto", () => {
  it("nem o dono abre voz num canal de texto", () => {
    const texto = { ...palco, kind: "texto" as const, title: "geral", maxMembers: 200, channelPosition: 10 };
    const e = compose(verdict({ room: texto, decision: { ok: true, role: "dono" }, userId: "ppa" }), snap({ tracks: [] }), "ppa", "dono", 0);
    expect(e.eu).toMatchObject({ papel: "dono", podeFalar: false, podeEscrever: true, podeCompartilharTela: false });
  });
});
