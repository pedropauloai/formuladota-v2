import { describe, expect, it } from "vitest";
import { decidirMover, type MoverFatos } from "./mover-regra";

const fatos = (f: Partial<MoverFatos>): MoverFatos => ({
  atorPapel: "dono",
  origemId: "live",
  donoDaOrigem: "ppa",
  alvoId: "aluno",
  alvoPresente: true,
  destino: { id: "party1", kind: "palco", status: "aberta", ownerId: "ppa", canal: true },
  acessoDoAlvo: { ok: true, role: "falante" },
  ...f,
});

describe("decidirMover (o dono leva alguém para outro canal de voz)", () => {
  it("o dono move quem está na sala para outro canal de voz dele em que a pessoa pode entrar", () => {
    expect(decidirMover(fatos({}))).toEqual({ ok: true });
  });

  it("só o dono move", () => {
    expect(decidirMover(fatos({ atorPapel: "falante" }))).toEqual({ ok: false, code: "so_o_dono" });
  });

  it("o dono não é movido", () => {
    expect(decidirMover(fatos({ alvoId: "ppa" }))).toEqual({ ok: false, code: "fora_da_sala" });
  });

  it("quem não está na sala agora não é movido", () => {
    expect(decidirMover(fatos({ alvoPresente: false }))).toEqual({ ok: false, code: "fora_da_sala" });
  });

  it("o destino tem de ser outro canal de voz aberto, do mesmo dono", () => {
    const destino = fatos({}).destino as NonNullable<MoverFatos["destino"]>;
    expect(decidirMover(fatos({ destino: null }))).toEqual({ ok: false, code: "destino_invalido" });
    expect(decidirMover(fatos({ destino: { ...destino, id: "live" } }))).toEqual({ ok: false, code: "destino_invalido" });
    expect(decidirMover(fatos({ destino: { ...destino, kind: "texto" } }))).toEqual({ ok: false, code: "destino_invalido" });
    expect(decidirMover(fatos({ destino: { ...destino, kind: "mentoria", canal: false } }))).toEqual({ ok: false, code: "destino_invalido" });
    expect(decidirMover(fatos({ destino: { ...destino, canal: false } }))).toEqual({ ok: false, code: "destino_invalido" });
    expect(decidirMover(fatos({ destino: { ...destino, status: "encerrada" } }))).toEqual({ ok: false, code: "destino_invalido" });
    expect(decidirMover(fatos({ destino: { ...destino, ownerId: "outro" } }))).toEqual({ ok: false, code: "destino_invalido" });
  });

  it("a pessoa precisa poder entrar no destino: canal cheio ou privado recusa com o motivo", () => {
    expect(decidirMover(fatos({ acessoDoAlvo: { ok: false, code: "sala_lotada" } }))).toEqual({ ok: false, code: "sala_lotada" });
    expect(decidirMover(fatos({ acessoDoAlvo: { ok: false, code: "so_beneficio" } }))).toEqual({ ok: false, code: "so_beneficio" });
  });
});
