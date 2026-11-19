import { describe, expect, it } from "vitest";
import {
  META_LIGA,
  aplicarVoto,
  chaveDoVoto,
  estadoParaQuemVe,
  isResposta,
  lerIdDoAparelho,
  progressoDaMeta,
  votoDeQuemVe,
  type EnqueteEstado,
} from "./liga";

const USER = "6b0f4e8a-1d2c-4b3a-9e8f-0a1b2c3d4e5f";
const APARELHO = "0f9e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f";
// Mesmo padrão do check de voter_key na migration 180.
const CHECK_DA_MIGRATION = /^[ud]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("progressoDaMeta", () => {
  it("arredonda para baixo: nunca mostra mais do que tem", () => {
    expect(progressoDaMeta(1)).toBe(2);
    expect(progressoDaMeta(49)).toBe(98);
    expect(progressoDaMeta(1, 3)).toBe(33);
    expect(progressoDaMeta(2, 3)).toBe(66);
  });

  it("vai de 0 a 100 e para na meta", () => {
    expect(progressoDaMeta(0)).toBe(0);
    expect(progressoDaMeta(META_LIGA)).toBe(100);
    expect(progressoDaMeta(73)).toBe(100);
    expect(progressoDaMeta(-4)).toBe(0);
    expect(progressoDaMeta(10, 0)).toBe(0);
  });

  it("a meta é 50", () => {
    expect(META_LIGA).toBe(50);
  });
});

describe("aplicarVoto", () => {
  const admin: EnqueteEstado = { minha: null, sim: 10, talvez: 4, nao: 2 };
  const jogador: EnqueteEstado = { minha: null, sim: 10, talvez: null, nao: null };

  it("primeiro voto soma na resposta escolhida", () => {
    expect(aplicarVoto(admin, "sim")).toEqual({ minha: "sim", sim: 11, talvez: 4, nao: 2 });
    expect(aplicarVoto(admin, "nao")).toEqual({ minha: "nao", sim: 10, talvez: 4, nao: 3 });
  });

  it("trocar a resposta tira de uma e põe na outra", () => {
    const votou = aplicarVoto(admin, "sim");
    expect(aplicarVoto(votou, "talvez")).toEqual({ minha: "talvez", sim: 10, talvez: 5, nao: 2 });
  });

  it("repetir a mesma resposta não conta de novo", () => {
    const votou = aplicarVoto(jogador, "sim");
    expect(aplicarVoto(votou, "sim")).toBe(votou);
  });

  it("quem não é admin continua sem Talvez e Não", () => {
    expect(aplicarVoto(jogador, "talvez")).toEqual({ minha: "talvez", sim: 10, talvez: null, nao: null });
    expect(aplicarVoto({ ...jogador, minha: "sim", sim: 11 }, "nao")).toEqual({ minha: "nao", sim: 10, talvez: null, nao: null });
  });

  it("nunca fica negativo", () => {
    expect(aplicarVoto({ minha: "sim", sim: 0, talvez: 0, nao: 0 }, "nao")).toEqual({ minha: "nao", sim: 0, talvez: 0, nao: 1 });
  });
});

describe("estadoParaQuemVe", () => {
  const contagem = { sim: 12, talvez: 5, nao: 3 };

  it("o admin vê os três totais", () => {
    expect(estadoParaQuemVe(contagem, "sim", true)).toEqual({ minha: "sim", sim: 12, talvez: 5, nao: 3 });
  });

  it("os demais veem só o Sim", () => {
    expect(estadoParaQuemVe(contagem, null, false)).toEqual({ minha: null, sim: 12, talvez: null, nao: null });
  });
});

describe("chave do voto e aparelho", () => {
  it("conta e aparelho têm prefixos diferentes e passam no check do banco", () => {
    expect(chaveDoVoto({ userId: USER })).toBe(`u:${USER}`);
    expect(chaveDoVoto({ aparelhoId: APARELHO })).toBe(`d:${APARELHO}`);
    expect(chaveDoVoto({ userId: USER })).toMatch(CHECK_DA_MIGRATION);
    expect(chaveDoVoto({ aparelhoId: APARELHO })).toMatch(CHECK_DA_MIGRATION);
  });

  it("aceita só id de aparelho no formato certo", () => {
    expect(lerIdDoAparelho(APARELHO)).toBe(APARELHO);
    expect(lerIdDoAparelho(undefined)).toBeNull();
    expect(lerIdDoAparelho("")).toBeNull();
    expect(lerIdDoAparelho("abc")).toBeNull();
    expect(lerIdDoAparelho(APARELHO.toUpperCase())).toBeNull();
    expect(lerIdDoAparelho(`${APARELHO}' or 1=1`)).toBeNull();
  });

  it("um id criado pelo navegador passa no formato", () => {
    expect(lerIdDoAparelho(crypto.randomUUID())).not.toBeNull();
  });
});

describe("votoDeQuemVe", () => {
  const conta = chaveDoVoto({ userId: USER });
  const aparelho = chaveDoVoto({ aparelhoId: APARELHO });

  it("o voto da conta vale mais que o do aparelho", () => {
    const linhas = [
      { voter_key: aparelho, answer: "nao" },
      { voter_key: conta, answer: "sim" },
    ];
    expect(votoDeQuemVe(linhas, conta, aparelho)).toBe("sim");
  });

  it("sem voto da conta, vale o que o aparelho deu antes de entrar", () => {
    expect(votoDeQuemVe([{ voter_key: aparelho, answer: "talvez" }], conta, aparelho)).toBe("talvez");
  });

  it("sem voto nenhum, ou com resposta estranha, fica sem voto", () => {
    expect(votoDeQuemVe([], conta, aparelho)).toBeNull();
    expect(votoDeQuemVe([{ voter_key: conta, answer: "talvez sim" }], conta, null)).toBeNull();
    expect(votoDeQuemVe([{ voter_key: aparelho, answer: "sim" }], null, null)).toBeNull();
  });

  it("reconhece só as três respostas", () => {
    expect(["sim", "talvez", "nao"].every(isResposta)).toBe(true);
    expect(isResposta("não")).toBe(false);
    expect(isResposta(1)).toBe(false);
  });
});
