import { describe, expect, it } from "vitest";
import { decideRoomAccess, type AccessInput } from "./acesso";
import type { RoomInfo } from "./tipos";

const now = new Date("2026-11-24T20:00:00Z");
const room: RoomInfo = {
  id: "sala-1",
  kind: "mentoria",
  status: "aberta",
  ownerId: "ppa",
  isTest: false,
  maxMembers: 2,
  screenPolicy: "dono",
  closesAt: "2026-11-24T23:00:00Z",
};

function input(over: Partial<AccessInput> = {}): AccessInput {
  return {
    flagOn: true,
    now,
    room,
    userId: "aluno",
    identityOk: true,
    blocked: false,
    birthDate: "1995-03-10",
    member: { userId: "aluno", role: "membro", status: "ativo" },
    inPartyNow: false,
    onlineOthers: 1,
    alreadyOnline: false,
    ...over,
  };
}

describe("decideRoomAccess: os sins", () => {
  it("deixa entrar o membro da mentoria", () => {
    expect(decideRoomAccess(input())).toEqual({ ok: true, role: "membro" });
  });

  it("deixa entrar o dono, mesmo com a sala cheia", () => {
    const owner = input({ userId: "ppa", member: { userId: "ppa", role: "dono", status: "ativo" }, onlineOthers: 2 });
    expect(decideRoomAccess(owner)).toEqual({ ok: true, role: "dono" });
  });

  it("deixa entrar na party quem está na party agora, mesmo sem linha de membro ainda", () => {
    const party = input({ room: { ...room, kind: "party", maxMembers: 6 }, member: null, inPartyNow: true });
    expect(decideRoomAccess(party)).toEqual({ ok: true, role: "membro" });
  });

  it("quem já está online não conta duas vezes na lotação", () => {
    expect(decideRoomAccess(input({ onlineOthers: 1, alreadyOnline: true }))).toEqual({ ok: true, role: "membro" });
  });
});

describe("decideRoomAccess: cada não, na ordem da spec", () => {
  const casos: Array<[string, Partial<AccessInput>, string]> = [
    ["flag desligada", { flagOn: false }, "flag_desligada"],
    ["sala que não existe", { room: null }, "sala_inexistente"],
    ["sala encerrada", { room: { ...room, status: "encerrada" } }, "sala_encerrada"],
    ["sala vencida", { room: { ...room, closesAt: "2026-11-24T19:59:59Z" } }, "sala_encerrada"],
    ["sem login", { userId: null }, "sem_login"],
    ["conta só de e-mail, sem Discord nem Steam", { identityOk: false }, "conta_sem_identidade"],
    ["conta banida ou suspensa", { blocked: true }, "conta_bloqueada"],
    ["sem data de nascimento", { birthDate: null }, "sem_data_de_nascimento"],
    ["menor de 18", { birthDate: "2009-01-01" }, "menor_de_idade"],
    ["fora da sala", { member: null }, "fora_da_sala"],
    ["expulso", { member: { userId: "aluno", role: "membro", status: "expulso" } }, "expulso"],
    ["sala lotada", { onlineOthers: 2 }, "sala_lotada"],
  ];
  for (const [nome, over, code] of casos) {
    it(`recusa: ${nome}`, () => {
      expect(decideRoomAccess(input(over))).toEqual({ ok: false, code });
    });
  }

  it("na party, quem saiu da party perde o acesso mesmo com linha de membro", () => {
    const party = input({ room: { ...room, kind: "party", maxMembers: 6 }, inPartyNow: false });
    expect(decideRoomAccess(party)).toEqual({ ok: false, code: "fora_da_sala" });
  });

  it("quem está fora não descobre se a sala foi encerrada", () => {
    expect(decideRoomAccess(input({ member: null, room: { ...room, status: "encerrada" } }))).toEqual({ ok: false, code: "fora_da_sala" });
  });

  it("sem login não descobre se a sala existe", () => {
    expect(decideRoomAccess(input({ userId: null, room: null }))).toEqual({ ok: false, code: "sem_login" });
  });

  it("a flag desligada vale também para o dono (flag autoritativa)", () => {
    const owner = input({ flagOn: false, userId: "ppa", member: { userId: "ppa", role: "dono", status: "ativo" } });
    expect(decideRoomAccess(owner)).toEqual({ ok: false, code: "flag_desligada" });
  });
});
