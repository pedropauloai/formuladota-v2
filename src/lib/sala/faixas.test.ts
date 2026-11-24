import { describe, expect, it } from "vitest";
import { canShareScreen, decideLabel, decidePublish, decideSubscribe, labelMatchesKind, visibleTracks, type PublishInput, type SubscribeInput } from "./faixas";

function publish(over: Partial<PublishInput> = {}): PublishInput {
  return {
    role: "membro",
    roomKind: "mentoria",
    screenPolicy: "dono",
    partyScreenEnabled: false,
    requested: ["audio"],
    mine: { audio: 0, video: 0 },
    videoActiveByOthers: false,
    capReached: false,
    ...over,
  };
}

describe("canShareScreen", () => {
  it("o dono compartilha na mentoria; na party só com a tela ligada na configuração", () => {
    expect(canShareScreen("dono", "mentoria", "dono", false)).toBe(true);
    expect(canShareScreen("dono", "party", "dono", false)).toBe(false);
    expect(canShareScreen("dono", "party", "dono", true)).toBe(true);
  });

  it("o membro só compartilha na mentoria com a política um_por_vez", () => {
    expect(canShareScreen("membro", "mentoria", "dono", false)).toBe(false);
    expect(canShareScreen("membro", "mentoria", "um_por_vez", false)).toBe(true);
    expect(canShareScreen("membro", "party", "um_por_vez", true)).toBe(false);
  });
});

describe("decidePublish", () => {
  it("o membro publica a própria voz", () => {
    expect(decidePublish(publish())).toEqual({ ok: true });
  });

  it("recusa a segunda faixa de áudio do membro", () => {
    expect(decidePublish(publish({ mine: { audio: 1, video: 0 } }))).toEqual({ ok: false, code: "faixa_demais" });
  });

  it("recusa duas faixas de áudio do membro no mesmo pedido", () => {
    expect(decidePublish(publish({ requested: ["audio", "audio"] }))).toEqual({ ok: false, code: "faixa_demais" });
  });

  it("recusa vídeo do membro quando só o dono compartilha", () => {
    expect(decidePublish(publish({ requested: ["video"] }))).toEqual({ ok: false, code: "tela_nao_permitida" });
  });

  it("o dono publica a tela e o áudio da tela junto da voz", () => {
    const owner = publish({ role: "dono", requested: ["video", "audio"], mine: { audio: 1, video: 0 } });
    expect(decidePublish(owner)).toEqual({ ok: true });
  });

  it("recusa segunda tela do dono", () => {
    const owner = publish({ role: "dono", requested: ["video"], mine: { audio: 2, video: 1 } });
    expect(decidePublish(owner)).toEqual({ ok: false, code: "faixa_demais" });
  });

  it("recusa a tela quando outra pessoa já compartilha na sala", () => {
    const owner = publish({ role: "dono", requested: ["video"], videoActiveByOthers: true });
    expect(decidePublish(owner)).toEqual({ ok: false, code: "tela_ocupada" });
  });

  it("recusa tela nova com o teto de tráfego atingido, mas deixa a voz", () => {
    expect(decidePublish(publish({ role: "dono", requested: ["video"], capReached: true }))).toEqual({ ok: false, code: "teto_de_trafego" });
    expect(decidePublish(publish({ role: "dono", requested: ["audio"], capReached: true }))).toEqual({ ok: true });
  });

  it("recusa a tela na party com a tela desligada na configuração", () => {
    const owner = publish({ role: "dono", roomKind: "party", requested: ["video"] });
    expect(decidePublish(owner)).toEqual({ ok: false, code: "tela_nao_permitida" });
  });

  it("recusa pedido vazio", () => {
    expect(decidePublish(publish({ requested: [] }))).toEqual({ ok: false, code: "faixa_demais" });
  });
});

function subscribe(over: Partial<SubscribeInput> = {}): SubscribeInput {
  return {
    subscriberUserId: "aluno",
    roomId: "sala-1",
    target: { roomId: "sala-1", userId: "ppa", closed: false, tipo: "voz", publisherActive: true },
    blockedPair: false,
    alreadySubscribed: false,
    ...over,
  };
}

describe("decideSubscribe", () => {
  it("recebe a faixa rotulada de outro membro ativo", () => {
    expect(decideSubscribe(subscribe())).toEqual({ ok: true });
  });

  const casos: Array<[string, Partial<SubscribeInput>, string]> = [
    ["faixa que não existe", { target: null }, "faixa_inexistente"],
    ["faixa de outra sala", { target: { roomId: "sala-2", userId: "ppa", closed: false, tipo: "voz", publisherActive: true } }, "faixa_inexistente"],
    ["faixa fechada", { target: { roomId: "sala-1", userId: "ppa", closed: true, tipo: "voz", publisherActive: true } }, "faixa_inexistente"],
    ["a própria faixa", { target: { roomId: "sala-1", userId: "aluno", closed: false, tipo: "voz", publisherActive: true } }, "faixa_propria"],
    ["faixa sem rótulo", { target: { roomId: "sala-1", userId: "ppa", closed: false, tipo: null, publisherActive: true } }, "faixa_sem_rotulo"],
    ["faixa de quem foi expulso ou saiu", { target: { roomId: "sala-1", userId: "ppa", closed: false, tipo: "voz", publisherActive: false } }, "membro_inativo"],
    ["bloqueio entre os dois", { blockedPair: true }, "bloqueado"],
    ["mesma faixa de novo", { alreadySubscribed: true }, "ja_recebendo"],
  ];
  for (const [nome, over, code] of casos) {
    it(`recusa: ${nome}`, () => {
      expect(decideSubscribe(subscribe(over))).toEqual({ ok: false, code });
    });
  }
});

describe("rótulo da faixa", () => {
  it("tela é vídeo; voz e áudio da tela são áudio", () => {
    expect(labelMatchesKind("tela", "video")).toBe(true);
    expect(labelMatchesKind("tela", "audio")).toBe(false);
    expect(labelMatchesKind("voz", "audio")).toBe(true);
    expect(labelMatchesKind("tela_audio", "audio")).toBe(true);
    expect(labelMatchesKind("voz", "video")).toBe(false);
  });

  it("áudio da tela só para quem pode compartilhar a tela", () => {
    expect(decideLabel({ tipo: "tela_audio", kind: "audio", canShare: false })).toEqual({ ok: false, code: "tela_nao_permitida" });
    expect(decideLabel({ tipo: "tela_audio", kind: "audio", canShare: true })).toEqual({ ok: true });
    expect(decideLabel({ tipo: "voz", kind: "video", canShare: true })).toEqual({ ok: false, code: "rotulo_invalido" });
  });
});

describe("visibleTracks (o que o batimento lista para cada pessoa)", () => {
  const faixa = (userId: string, tipo: "voz" | "tela" | null, sessionId = `s-${userId}`) => ({ sessionId, userId, roomId: "sala-1", trackName: `t-${userId}-${tipo}`, mid: "0", kind: (tipo === "tela" ? "video" : "audio") as "audio" | "video", tipo });

  it("lista a faixa rotulada de quem está online, sem bloqueio, e nunca a própria", () => {
    const tracks = [faixa("ppa", "voz"), faixa("ppa", "tela"), faixa("eu", "voz"), faixa("ausente", "voz"), faixa("bloqueado", "voz"), faixa("novo", null)];
    const online = new Set(["ppa", "eu", "bloqueado", "novo"]);
    const blocked = (a: string, b: string) => [a, b].sort().join(":") === ["bloqueado", "eu"].sort().join(":");
    const v = visibleTracks(tracks, "eu", online, blocked).map((t) => t.trackName);
    expect(v).toEqual(["t-ppa-voz", "t-ppa-tela"]);
  });
});
