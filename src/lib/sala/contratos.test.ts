import { describe, expect, it } from "vitest";
import real from "./__fixtures__/funcoes-do-banco.json";
import { Facts, Identidades, SnapshotSchema } from "./contratos";

// A captura é a saída real das funções da migration 196 (banco de produção, transação desfeita):
// se o banco mudar o formato, regrave a captura e este teste diz o que o servidor deixou de entender.
describe("contrato entre as funções do banco e o servidor", () => {
  it("voice_room_access: a sala, a configuração e o vínculo da pessoa", () => {
    const f = Facts.parse(real.access);
    expect(f.room).toMatchObject({ kind: "palco", status: "aberta", audience: "todos", chat_open: true, max_members: 30 });
    expect(f.settings).toMatchObject({ cap_gb_30d: 800, palco_max_speakers: 4 });
    expect(f.member).toMatchObject({ role: "ouvinte", status: "ativo", force_muted: true });
    expect(f.online_others).toBe(1);
  });

  it("voice_room_tick: o mesmo contexto, com os bloqueios", () => {
    const f = Facts.parse(real.tick);
    expect(f.blocked).toEqual([]);
    expect(f.member?.role).toBe("ouvinte");
  });

  it("sala inexistente: só a sala nula, e a conta fecha por padrão (falha fechada)", () => {
    const f = Facts.parse(real.missing);
    expect(f.room).toBeNull();
    expect(f.account_blocked).toBe(true);
    expect(f.age_confirmed).toBe(false);
  });

  it("voice_room_snapshot: membros, faixas com a qualidade da tela e o chat", () => {
    const s = SnapshotSchema.parse(real.snapshot);
    expect(s.members[0]).toMatchObject({ r: "dono", on: true });
    expect(s.tracks.find((t) => t.t === "tela")?.q).toBe("padrao");
    expect(s.tracks.find((t) => t.t === "voz")?.q).toBeUndefined();
    expect(s.chat[0]).toMatchObject({ i: 1, b: "oi" });
  });

  it("voice_room_identities: nome e avatar por pessoa, sem as chaves vazias", () => {
    const ids = Identidades.parse(real.identities);
    expect(Object.keys(ids)).toHaveLength(2);
    expect(Object.values(ids).every((p) => typeof p.username === "string")).toBe(true);
  });
});

describe("estado comum com o dono fora da sala", () => {
  it("a linha do dono sem batimento (sem a chave on) vale como fora, sem derrubar o estado de todos", () => {
    const s = SnapshotSchema.parse({ ...real.snapshot, members: [{ u: "00000000-0000-4000-8000-000000000002", r: "dono", m: false }] });
    expect(s.members[0]).toMatchObject({ r: "dono", on: false });
  });
});
