import { describe, expect, it } from "vitest";
import { acoesDaMensagem, acoesDaPessoa, acoesDoCanal, type CanalDoMenu, type PessoaDoMenu } from "./menus";

const pessoa = (p: Partial<PessoaDoMenu>): PessoaDoMenu => ({
  propria: false, souDono: false, palco: false, papel: "falante", mutadoPeloDono: false, bloqueado: false, ...p,
});

describe("acoesDaPessoa (botão direito numa pessoa da sala)", () => {
  it("na própria linha, a sala não tem ação (ficam as do perfil)", () => {
    expect(acoesDaPessoa(pessoa({ propria: true, souDono: true }))).toEqual([]);
  });

  it("quem não é dono ajusta o volume, bloqueia e denuncia, e não modera", () => {
    expect(acoesDaPessoa(pessoa({}))).toEqual(["volume", "bloquear", "denunciar"]);
  });

  it("quem já foi bloqueado não aparece com bloquear de novo", () => {
    expect(acoesDaPessoa(pessoa({ bloqueado: true }))).toEqual(["volume", "denunciar"]);
  });

  it("no palco, o dono chama quem está na plateia, expulsa e bane (sem mutar quem não fala)", () => {
    expect(acoesDaPessoa(pessoa({ souDono: true, palco: true, papel: "ouvinte" }))).toEqual(["volume", "chamar", "expulsar", "banir", "bloquear", "denunciar"]);
  });

  it("no palco, o dono devolve à plateia e muta quem fala", () => {
    expect(acoesDaPessoa(pessoa({ souDono: true, palco: true, papel: "falante" }))).toEqual(["volume", "devolver", "mutar", "expulsar", "banir", "bloquear", "denunciar"]);
  });

  it("na voz livre e na mentoria, o dono muta ou libera, sem chamar nem devolver", () => {
    expect(acoesDaPessoa(pessoa({ souDono: true, papel: "falante", mutadoPeloDono: true }))).toEqual(["volume", "liberar", "expulsar", "banir", "bloquear", "denunciar"]);
    expect(acoesDaPessoa(pessoa({ souDono: true, papel: "membro" }))).toEqual(["volume", "mutar", "expulsar", "banir", "bloquear", "denunciar"]);
  });

  it("o dono não modera outro dono", () => {
    expect(acoesDaPessoa(pessoa({ souDono: true, papel: "dono" }))).toEqual(["volume", "bloquear", "denunciar"]);
  });
});

const canal = (c: Partial<CanalDoMenu>): CanalDoMenu => ({
  tipo: "palco", souDono: false, naSala: false, listado: true, primeiro: false, ultimo: false, ...c,
});

describe("acoesDoCanal (botão direito num canal da árvore)", () => {
  it("quem não é dono entra e copia o link", () => {
    expect(acoesDoCanal(canal({}))).toEqual(["entrar", "copiarLink"]);
  });

  it("no canal de voz em que já está, não aparece entrar", () => {
    expect(acoesDoCanal(canal({ naSala: true }))).toEqual(["copiarLink"]);
  });

  it("o dono edita, muda o modo, o público e a ordem, e apaga", () => {
    expect(acoesDoCanal(canal({ souDono: true }))).toEqual(["entrar", "copiarLink", "editar", "modo", "beneficio", "subir", "descer", "apagar"]);
  });

  it("canal de texto não tem modo de voz", () => {
    expect(acoesDoCanal(canal({ souDono: true, tipo: "texto" }))).toEqual(["entrar", "copiarLink", "editar", "beneficio", "subir", "descer", "apagar"]);
  });

  it("o primeiro não sobe e o último não desce", () => {
    expect(acoesDoCanal(canal({ souDono: true, primeiro: true, ultimo: true }))).toEqual(["entrar", "copiarLink", "editar", "modo", "beneficio", "apagar"]);
  });

  it("sala privada (mentoria, party) não é canal: o dono só entra e copia o link", () => {
    expect(acoesDoCanal(canal({ souDono: true, tipo: "mentoria", listado: false }))).toEqual(["entrar", "copiarLink"]);
  });
});

describe("acoesDaMensagem (botão direito numa mensagem)", () => {
  it("de outra pessoa: copia, vê o perfil e denuncia", () => {
    expect(acoesDaMensagem({ souDono: false, eu: "eu", autor: "outro", donoId: "dono" })).toEqual(["copiar", "perfil", "denunciar"]);
  });

  it("a própria mensagem não se denuncia", () => {
    expect(acoesDaMensagem({ souDono: false, eu: "eu", autor: "eu", donoId: "dono" })).toEqual(["copiar", "perfil"]);
  });

  it("o dono apaga e bane o autor, e não bane a si mesmo", () => {
    expect(acoesDaMensagem({ souDono: true, eu: "dono", autor: "outro", donoId: "dono" })).toEqual(["copiar", "perfil", "apagar", "banirAutor", "denunciar"]);
    expect(acoesDaMensagem({ souDono: true, eu: "dono", autor: "dono", donoId: "dono" })).toEqual(["copiar", "perfil", "apagar"]);
  });

  it("mensagem de conta apagada: copia e, para o dono, apaga", () => {
    expect(acoesDaMensagem({ souDono: true, eu: "dono", autor: null, donoId: "dono" })).toEqual(["copiar", "apagar"]);
  });
});
