import { describe, expect, it } from "vitest";
import { canChat, canPublishVoice, canRaiseHand, canShareScreen, decideChat, decideStageAction, effectiveRole, type StageActionInput } from "./papeis";

describe("o que cada papel faz", () => {
  it("publica voz: dono, membro da mentoria e da party, e quem foi chamado ao palco", () => {
    expect(canPublishVoice("dono")).toBe(true);
    expect(canPublishVoice("membro")).toBe(true);
    expect(canPublishVoice("falante")).toBe(true);
    expect(canPublishVoice("ouvinte")).toBe(false);
  });

  it("tela: o dono na mentoria e na sala pública; na party só com a tela ligada na configuração", () => {
    expect(canShareScreen("dono", "mentoria", "dono", false)).toBe(true);
    expect(canShareScreen("dono", "palco", "dono", false)).toBe(true);
    expect(canShareScreen("dono", "party", "dono", false)).toBe(false);
    expect(canShareScreen("dono", "party", "dono", true)).toBe(true);
  });

  it("tela de quem não é dono: só o aluno da mentoria com a política um_por_vez", () => {
    expect(canShareScreen("membro", "mentoria", "dono", false)).toBe(false);
    expect(canShareScreen("membro", "mentoria", "um_por_vez", false)).toBe(true);
    expect(canShareScreen("membro", "party", "um_por_vez", true)).toBe(false);
    expect(canShareScreen("falante", "palco", "um_por_vez", true)).toBe(false);
    expect(canShareScreen("ouvinte", "palco", "um_por_vez", true)).toBe(false);
  });

  it("mão levantada só para quem está na plateia da sala pública", () => {
    expect(canRaiseHand("ouvinte", "palco")).toBe(true);
    expect(canRaiseHand("falante", "palco")).toBe(false);
    expect(canRaiseHand("membro", "mentoria")).toBe(false);
  });

  it("chat só na sala pública; fechado, só o dono escreve", () => {
    expect(canChat("ouvinte", "palco", true)).toBe(true);
    expect(canChat("ouvinte", "palco", false)).toBe(false);
    expect(canChat("dono", "palco", false)).toBe(true);
    expect(canChat("membro", "mentoria", true)).toBe(false);
  });
});

function action(over: Partial<StageActionInput> = {}): StageActionInput {
  return {
    action: "falar",
    actorRole: "dono",
    roomKind: "palco",
    voiceMode: "palco",
    targetIsOwner: false,
    target: { role: "ouvinte", status: "ativo" },
    speakers: 0,
    maxSpeakers: 4,
    ...over,
  };
}

describe("decideStageAction (o dono modera)", () => {
  it("chama quem está na plateia para o palco", () => {
    expect(decideStageAction(action())).toEqual({ ok: true, role: "falante" });
  });

  it("devolve quem fala para a plateia", () => {
    expect(decideStageAction(action({ action: "ouvir", target: { role: "falante", status: "ativo" }, speakers: 1 }))).toEqual({ ok: true, role: "ouvinte" });
  });

  it("chamar de novo quem já fala não muda nada e não conta o lugar duas vezes", () => {
    expect(decideStageAction(action({ target: { role: "falante", status: "ativo" }, speakers: 4 }))).toEqual({ ok: true, role: "falante" });
  });

  it("muta, expulsa e bane quem está na sala", () => {
    expect(decideStageAction(action({ action: "mutar", target: { role: "falante", status: "ativo" } }))).toEqual({ ok: true });
    expect(decideStageAction(action({ action: "expulsar" }))).toEqual({ ok: true });
    expect(decideStageAction(action({ action: "banir" }))).toEqual({ ok: true });
  });

  it("bane também quem nunca entrou na sala (sem linha de membro)", () => {
    expect(decideStageAction(action({ action: "banir", target: null }))).toEqual({ ok: true });
  });

  it("bane também quem já foi expulso", () => {
    expect(decideStageAction(action({ action: "banir", target: { role: "ouvinte", status: "expulso" } }))).toEqual({ ok: true });
  });

  it("muta e expulsa também na mentoria e na party", () => {
    expect(decideStageAction(action({ action: "mutar", roomKind: "mentoria", target: { role: "membro", status: "ativo" } }))).toEqual({ ok: true });
    expect(decideStageAction(action({ action: "expulsar", roomKind: "party", target: { role: "membro", status: "ativo" } }))).toEqual({ ok: true });
  });

  const casos: Array<[string, Partial<StageActionInput>, string]> = [
    ["quem não é dono", { actorRole: "falante" }, "so_o_dono"],
    ["mexer no próprio dono", { targetIsOwner: true }, "dono_nao_sai"],
    ["alvo fora da sala", { target: null }, "fora_da_sala"],
    ["chamar alvo já expulso", { target: { role: "ouvinte", status: "expulso" } }, "fora_da_sala"],
    ["palco cheio", { speakers: 4 }, "palco_cheio"],
    ["chamar ao palco fora da sala pública", { roomKind: "mentoria", target: { role: "membro", status: "ativo" } }, "so_na_sala_publica"],
    ["devolver à plateia fora da sala pública", { action: "ouvir", roomKind: "party", target: { role: "membro", status: "ativo" } }, "so_na_sala_publica"],
  ];
  for (const [nome, over, code] of casos) {
    it(`recusa: ${nome}`, () => {
      expect(decideStageAction(action(over))).toEqual({ ok: false, code });
    });
  }
});

describe("decideChat", () => {
  const now = new Date("2026-11-24T20:00:00Z");
  const base = { roomKind: "palco" as const, role: "ouvinte" as const, chatOpen: true, presente: true, lastSentAt: null, now };

  it("só escreve quem está na sala (entrou e segue dando batimento)", () => {
    expect(decideChat({ ...base, presente: false, body: "oi" })).toEqual({ ok: false, code: "fora_da_sala" });
  });

  it("aceita a mensagem e tira os espaços das pontas", () => {
    expect(decideChat({ ...base, body: "  boa, PPA!  " })).toEqual({ ok: true, body: "boa, PPA!" });
  });

  it("junta quebras de linha e espaços repetidos num espaço só", () => {
    expect(decideChat({ ...base, body: "linha\n\n\nsegunda   parte" })).toEqual({ ok: true, body: "linha segunda parte" });
  });

  it("aceita até 300 caracteres", () => {
    expect(decideChat({ ...base, body: "a".repeat(300) })).toEqual({ ok: true, body: "a".repeat(300) });
  });

  const casos: Array<[string, Partial<Parameters<typeof decideChat>[0]>, string]> = [
    ["mensagem vazia", { body: "   " }, "mensagem_invalida"],
    ["mensagem longa demais", { body: "a".repeat(301) }, "mensagem_invalida"],
    ["chat fora da sala pública", { roomKind: "mentoria", body: "oi" }, "chat_indisponivel"],
    ["chat fechado pelo dono", { chatOpen: false, body: "oi" }, "chat_fechado"],
    ["mais de uma mensagem a cada 2 s", { lastSentAt: new Date("2026-11-24T19:59:58.500Z"), body: "oi" }, "devagar"],
  ];
  for (const [nome, over, code] of casos) {
    it(`recusa: ${nome}`, () => {
      expect(decideChat({ ...base, body: "oi", ...over })).toEqual({ ok: false, code });
    });
  }

  it("2 s depois da última, aceita de novo", () => {
    expect(decideChat({ ...base, lastSentAt: new Date("2026-11-24T19:59:58Z"), body: "oi" })).toEqual({ ok: true, body: "oi" });
  });
});

describe("canais do servidor", () => {
  it("canal de texto não tem tela nem mão, e o chat segue a regra de aberto ou fechado", () => {
    expect(canShareScreen("dono", "texto", "dono", true)).toBe(false);
    expect(canShareScreen("dono", "texto", "um_por_vez", true)).toBe(false);
    expect(canRaiseHand("ouvinte", "texto")).toBe(false);
    expect(canChat("ouvinte", "texto", true)).toBe(true);
    expect(canChat("ouvinte", "texto", false)).toBe(false);
    expect(canChat("dono", "texto", false)).toBe(true);
  });

  it("no canal de texto a mensagem passa pela mesma regra do chat da sala", () => {
    const base = { roomKind: "texto" as const, role: "ouvinte" as const, chatOpen: true, presente: true, lastSentAt: null, now: new Date("2026-11-24T20:00:00Z") };
    expect(decideChat({ ...base, body: "  bora   jogar  " })).toEqual({ ok: true, body: "bora jogar" });
    expect(decideChat({ ...base, presente: false, body: "oi" })).toEqual({ ok: false, code: "fora_da_sala" });
    expect(decideChat({ ...base, chatOpen: false, body: "oi" })).toEqual({ ok: false, code: "chat_fechado" });
  });

  it("chamar ao palco e devolver à plateia só no canal de voz em modo palco", () => {
    const base: StageActionInput = { action: "falar", actorRole: "dono", roomKind: "palco", voiceMode: "palco", targetIsOwner: false, target: { role: "ouvinte", status: "ativo" }, speakers: 0, maxSpeakers: 4 };
    expect(decideStageAction(base)).toEqual({ ok: true, role: "falante" });
    expect(decideStageAction({ ...base, voiceMode: "livre" })).toEqual({ ok: false, code: "so_na_sala_publica" });
    expect(decideStageAction({ ...base, action: "ouvir", voiceMode: "livre" })).toEqual({ ok: false, code: "so_na_sala_publica" });
    expect(decideStageAction({ ...base, roomKind: "texto" })).toEqual({ ok: false, code: "so_na_sala_publica" });
  });

  it("no canal de texto e no de voz livre o dono expulsa e bane", () => {
    const base: StageActionInput = { action: "expulsar", actorRole: "dono", roomKind: "texto", voiceMode: "palco", targetIsOwner: false, target: { role: "ouvinte", status: "ativo" }, speakers: 0, maxSpeakers: 4 };
    expect(decideStageAction(base)).toEqual({ ok: true });
    expect(decideStageAction({ ...base, action: "banir", target: null })).toEqual({ ok: true });
    expect(decideStageAction({ ...base, roomKind: "palco", voiceMode: "livre", target: { role: "falante", status: "ativo" } })).toEqual({ ok: true });
  });
});

describe("effectiveRole", () => {
  it("na voz livre a linha antiga da plateia vale como quem fala; no resto, o papel da linha", () => {
    expect(effectiveRole("ouvinte", "palco", "livre")).toBe("falante");
    expect(effectiveRole("dono", "palco", "livre")).toBe("dono");
    expect(effectiveRole("ouvinte", "palco", "palco")).toBe("ouvinte");
    expect(effectiveRole("ouvinte", "texto", "livre")).toBe("ouvinte");
  });
});
