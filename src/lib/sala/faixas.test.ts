import { describe, expect, it } from "vitest";
import { checkLayerUpdate, decideLabel, decideLayer, decidePublish, decideSubscribe, labelMatchesKind, visibleTracks, type PublishInput, type SubscribeInput, type TrackView } from "./faixas";
import type { MemberRole } from "./tipos";

function publish(over: Partial<PublishInput> = {}): PublishInput {
  return {
    role: "membro",
    roomKind: "mentoria",
    screenPolicy: "dono",
    partyScreenEnabled: false,
    forceMuted: false,
    requested: ["audio"],
    mine: { audio: 0, video: 0 },
    videoActiveByOthers: false,
    capReached: false,
    ...over,
  };
}

describe("decidePublish", () => {
  it("o membro publica a própria voz", () => {
    expect(decidePublish(publish())).toEqual({ ok: true });
  });

  it("na sala pública, quem foi chamado ao palco publica a voz; a plateia não", () => {
    expect(decidePublish(publish({ role: "falante", roomKind: "palco" }))).toEqual({ ok: true });
    expect(decidePublish(publish({ role: "ouvinte", roomKind: "palco" }))).toEqual({ ok: false, code: "voz_nao_permitida" });
  });

  it("quem foi mutado pelo dono não volta a publicar a voz", () => {
    expect(decidePublish(publish({ role: "falante", roomKind: "palco", forceMuted: true }))).toEqual({ ok: false, code: "mutado_pelo_dono" });
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

  it("recusa vídeo de quem fala no palco", () => {
    expect(decidePublish(publish({ role: "falante", roomKind: "palco", requested: ["video"] }))).toEqual({ ok: false, code: "tela_nao_permitida" });
  });

  it("o dono da sala pública publica a tela e o áudio da tela junto da voz", () => {
    const owner = publish({ role: "dono", roomKind: "palco", requested: ["video", "audio"], mine: { audio: 1, video: 0 } });
    expect(decidePublish(owner)).toEqual({ ok: true });
  });

  it("recusa segunda tela do dono", () => {
    expect(decidePublish(publish({ role: "dono", requested: ["video"], mine: { audio: 2, video: 1 } }))).toEqual({ ok: false, code: "faixa_demais" });
  });

  it("recusa a tela quando outra pessoa já compartilha na sala", () => {
    expect(decidePublish(publish({ role: "dono", requested: ["video"], videoActiveByOthers: true }))).toEqual({ ok: false, code: "tela_ocupada" });
  });

  it("recusa tela nova com o teto de tráfego atingido, mas deixa a voz", () => {
    expect(decidePublish(publish({ role: "dono", requested: ["video"], capReached: true }))).toEqual({ ok: false, code: "teto_de_trafego" });
    expect(decidePublish(publish({ role: "dono", requested: ["audio"], capReached: true }))).toEqual({ ok: true });
  });

  it("recusa a tela na party com a tela desligada na configuração", () => {
    expect(decidePublish(publish({ role: "dono", roomKind: "party", requested: ["video"] }))).toEqual({ ok: false, code: "tela_nao_permitida" });
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
    ["faixa de quem saiu, foi expulso ou voltou à plateia", { target: { roomId: "sala-1", userId: "ppa", closed: false, tipo: "voz", publisherActive: false } }, "membro_inativo"],
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

  const base = { canShare: true, canVoice: true, quality: null };
  it("áudio da tela só para quem pode compartilhar a tela", () => {
    expect(decideLabel({ ...base, tipo: "tela_audio", kind: "audio", canShare: false })).toEqual({ ok: false, code: "tela_nao_permitida" });
    expect(decideLabel({ ...base, tipo: "tela_audio", kind: "audio" })).toEqual({ ok: true });
    expect(decideLabel({ ...base, tipo: "voz", kind: "video" })).toEqual({ ok: false, code: "rotulo_invalido" });
  });

  it("voz só para quem pode falar", () => {
    expect(decideLabel({ ...base, tipo: "voz", kind: "audio", canVoice: false })).toEqual({ ok: false, code: "voz_nao_permitida" });
  });

  it("a tela leva a qualidade escolhida; voz e áudio da tela não", () => {
    expect(decideLabel({ ...base, tipo: "tela", kind: "video", quality: "padrao" })).toEqual({ ok: true });
    expect(decideLabel({ ...base, tipo: "tela", kind: "video" })).toEqual({ ok: false, code: "qualidade_invalida" });
    expect(decideLabel({ ...base, tipo: "voz", kind: "audio", quality: "alta" })).toEqual({ ok: false, code: "qualidade_invalida" });
  });
});

describe("visibleTracks (o que cada pessoa pode receber agora)", () => {
  const faixa = (userId: string, tipo: TrackView["tipo"]): TrackView => ({ sessionId: `s-${userId}`, userId, trackName: `t-${userId}-${tipo}`, tipo });
  const membro = (role: MemberRole, online = true) => ({ role, online });

  it("faixa rotulada de quem está online e pode publicar aquilo, sem bloqueio, nunca a própria", () => {
    const tracks = [
      faixa("ppa", "voz"), faixa("ppa", "tela"), faixa("ppa", "tela_audio"),
      faixa("eu", "voz"), faixa("ausente", "voz"), faixa("bloqueado", "voz"), faixa("novo", null), faixa("plateia", "voz"),
    ];
    const members = new Map([
      ["ppa", membro("dono")], ["eu", membro("falante")], ["ausente", membro("falante", false)],
      ["bloqueado", membro("falante")], ["novo", membro("falante")], ["plateia", membro("ouvinte")],
    ]);
    const v = visibleTracks(tracks, "eu", members, new Set(["bloqueado"])).map((t) => t.trackName);
    expect(v).toEqual(["t-ppa-voz", "t-ppa-tela", "t-ppa-tela_audio"]);
  });

  it("a tela do aluno da mentoria aparece para o dono", () => {
    const members = new Map([["aluno", membro("membro")], ["ppa", membro("dono")]]);
    expect(visibleTracks([faixa("aluno", "tela")], "ppa", members, new Set()).length).toBe(1);
  });
});

describe("checkLayerUpdate (o update só troca a camada de uma recepção que já existe)", () => {
  const sub = { publisherSessionId: "pub-1", trackName: "tela-1", kind: "video" as const };
  const pedido = { location: "remote", sessionId: "pub-1", trackName: "tela-1" };

  it("deixa trocar a camada da mesma faixa", () => {
    expect(checkLayerUpdate({ requested: pedido, sub })).toEqual({ ok: true });
  });

  const casos: Array<[string, Parameters<typeof checkLayerUpdate>[0], string]> = [
    ["recepção que não existe nesta sessão", { requested: pedido, sub: null }, "faixa_inexistente"],
    ["puxar outra faixa pelo mesmo receptor", { requested: { ...pedido, trackName: "voz-de-outro" }, sub }, "troca_invalida"],
    ["puxar a faixa de outra sessão", { requested: { ...pedido, sessionId: "pub-2" }, sub }, "troca_invalida"],
    ["trocar a própria publicação", { requested: { ...pedido, location: "local" }, sub }, "troca_invalida"],
    ["camada em faixa de áudio", { requested: pedido, sub: { ...sub, kind: "audio" } }, "troca_invalida"],
  ];
  for (const [nome, input, code] of casos) {
    it(`recusa: ${nome}`, () => {
      expect(checkLayerUpdate(input)).toEqual({ ok: false, code });
    });
  }
});

describe("decideLayer (camada da tela de cada pessoa)", () => {
  const cap = 800_000_000_000;
  it("mentoria e party: a camada que a pessoa pediu, a alta por padrão", () => {
    expect(decideLayer({ roomKind: "mentoria", requested: null, usageBytes: 0, capBytes: cap })).toBe("f");
    expect(decideLayer({ roomKind: "mentoria", requested: "h", usageBytes: 0, capBytes: cap })).toBe("h");
    expect(decideLayer({ roomKind: "party", requested: "f", usageBytes: cap, capBytes: cap })).toBe("f");
  });

  it("sala pública: a leve por padrão", () => {
    expect(decideLayer({ roomKind: "palco", requested: null, usageBytes: 0, capBytes: cap })).toBe("h");
  });

  it("sala pública: a alta para quem pede, enquanto o consumo está abaixo de metade do teto", () => {
    expect(decideLayer({ roomKind: "palco", requested: "f", usageBytes: cap * 0.49, capBytes: cap })).toBe("f");
    expect(decideLayer({ roomKind: "palco", requested: "f", usageBytes: cap * 0.5, capBytes: cap })).toBe("h");
  });
});
