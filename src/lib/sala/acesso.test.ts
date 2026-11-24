import { describe, expect, it } from "vitest";
import { decideRoomAccess, type AccessInput } from "./acesso";
import type { RoomInfo } from "./tipos";

const now = new Date("2026-11-24T20:00:00Z");
const mentoria: RoomInfo = {
  id: "sala-1",
  kind: "mentoria",
  title: "Mentoria",
  status: "aberta",
  ownerId: "ppa",
  isTest: false,
  maxMembers: 2,
  screenPolicy: "dono",
  audience: "todos",
  chatOpen: true,
  closesAt: "2026-11-24T23:00:00Z",
};
const palco: RoomInfo = { ...mentoria, id: "sala-2", kind: "palco", title: "Sala da live", maxMembers: 30 };
const party: RoomInfo = { ...mentoria, id: "sala-3", kind: "party", title: "Party", maxMembers: 6 };

function input(over: Partial<AccessInput> = {}): AccessInput {
  return {
    flagOn: true,
    now,
    userId: "aluno",
    room: mentoria,
    member: { role: "membro", status: "ativo", forceMuted: false },
    identityOk: true,
    accountBlocked: false,
    ageConfirmed: true,
    bannedByOwner: false,
    inPartyNow: false,
    battlepass: false,
    onlineOthers: 1,
    ...over,
  };
}

describe("decideRoomAccess: os sins", () => {
  it("deixa entrar o membro da mentoria", () => {
    expect(decideRoomAccess(input())).toEqual({ ok: true, role: "membro" });
  });

  it("deixa entrar o dono, mesmo com a sala cheia", () => {
    expect(decideRoomAccess(input({ userId: "ppa", member: null, onlineOthers: 2 }))).toEqual({ ok: true, role: "dono" });
  });

  it("deixa entrar na party quem está na party agora, mesmo sem linha de membro ainda", () => {
    expect(decideRoomAccess(input({ room: party, member: null, inPartyNow: true }))).toEqual({ ok: true, role: "membro" });
  });

  it("na sala pública, quem chega entra como ouvinte", () => {
    expect(decideRoomAccess(input({ room: palco, member: null, onlineOthers: 10 }))).toEqual({ ok: true, role: "ouvinte" });
  });

  it("na sala pública, quem foi chamado ao palco volta como falante", () => {
    const falante = input({ room: palco, member: { role: "falante", status: "ativo", forceMuted: false } });
    expect(decideRoomAccess(falante)).toEqual({ ok: true, role: "falante" });
  });

  it("sala pública cheia: o Battlepass e quem está no palco entram mesmo assim", () => {
    const cheia = { room: palco, onlineOthers: 30 };
    expect(decideRoomAccess(input({ ...cheia, member: null, battlepass: true }))).toEqual({ ok: true, role: "ouvinte" });
    expect(decideRoomAccess(input({ ...cheia, member: { role: "falante", status: "ativo", forceMuted: false } }))).toEqual({ ok: true, role: "falante" });
  });

  it("sala pública só do benefício: entra quem tem Battlepass ou vaga na party", () => {
    const beneficio = { ...palco, audience: "beneficio" as const };
    expect(decideRoomAccess(input({ room: beneficio, member: null, battlepass: true }))).toEqual({ ok: true, role: "ouvinte" });
    expect(decideRoomAccess(input({ room: beneficio, member: null, inPartyNow: true }))).toEqual({ ok: true, role: "ouvinte" });
  });
});

describe("decideRoomAccess: cada não, na ordem da spec", () => {
  const casos: Array<[string, Partial<AccessInput>, string]> = [
    ["flag desligada", { flagOn: false }, "flag_desligada"],
    ["sem login", { userId: null }, "sem_login"],
    ["sala que não existe", { room: null }, "sala_inexistente"],
    ["fora da mentoria", { member: null }, "fora_da_sala"],
    ["expulso", { member: { role: "membro", status: "expulso", forceMuted: false } }, "expulso"],
    ["banido pelo dono", { bannedByOwner: true }, "banido"],
    ["sala encerrada", { room: { ...mentoria, status: "encerrada" } }, "sala_encerrada"],
    ["sala vencida", { room: { ...mentoria, closesAt: "2026-11-24T19:59:59Z" } }, "sala_encerrada"],
    ["conta só de e-mail, sem Discord nem Steam", { identityOk: false }, "conta_sem_identidade"],
    ["conta banida ou suspensa no site", { accountBlocked: true }, "conta_bloqueada"],
    ["sem a marcação de 18 anos", { ageConfirmed: false }, "sem_maioridade"],
    ["mentoria lotada", { onlineOthers: 2 }, "sala_lotada"],
  ];
  for (const [nome, over, code] of casos) {
    it(`recusa: ${nome}`, () => {
      expect(decideRoomAccess(input(over))).toEqual({ ok: false, code });
    });
  }

  it("sala pública lotada recusa quem chega sem Battlepass", () => {
    expect(decideRoomAccess(input({ room: palco, member: null, onlineOthers: 30 }))).toEqual({ ok: false, code: "sala_lotada" });
  });

  it("o Battlepass não fura a lotação da mentoria nem da party", () => {
    expect(decideRoomAccess(input({ onlineOthers: 2, battlepass: true }))).toEqual({ ok: false, code: "sala_lotada" });
    expect(decideRoomAccess(input({ room: party, inPartyNow: true, onlineOthers: 6, battlepass: true }))).toEqual({ ok: false, code: "sala_lotada" });
  });

  it("sala pública só do benefício recusa quem não tem", () => {
    const beneficio = { ...palco, audience: "beneficio" as const };
    expect(decideRoomAccess(input({ room: beneficio, member: null }))).toEqual({ ok: false, code: "so_beneficio" });
  });

  it("banido não entra nem na sala pública", () => {
    expect(decideRoomAccess(input({ room: palco, member: null, bannedByOwner: true }))).toEqual({ ok: false, code: "banido" });
  });

  it("expulso da sala pública não volta a ela", () => {
    const expulso = input({ room: palco, member: { role: "ouvinte", status: "expulso", forceMuted: false } });
    expect(decideRoomAccess(expulso)).toEqual({ ok: false, code: "expulso" });
  });

  it("na party, quem saiu da party perde o acesso mesmo com linha de membro", () => {
    expect(decideRoomAccess(input({ room: party, inPartyNow: false }))).toEqual({ ok: false, code: "fora_da_sala" });
  });

  it("quem está fora da mentoria não descobre se ela foi encerrada", () => {
    expect(decideRoomAccess(input({ member: null, room: { ...mentoria, status: "encerrada" } }))).toEqual({ ok: false, code: "fora_da_sala" });
  });

  it("sem login não descobre se a sala existe", () => {
    expect(decideRoomAccess(input({ userId: null, room: null }))).toEqual({ ok: false, code: "sem_login" });
  });

  it("a flag desligada vale também para o dono (flag autoritativa)", () => {
    expect(decideRoomAccess(input({ flagOn: false, userId: "ppa", member: null }))).toEqual({ ok: false, code: "flag_desligada" });
  });
});
