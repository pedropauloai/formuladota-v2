import { describe, expect, it } from "vitest";
import { FUNCIONANDO_INICIAL, falhaDoMicrofone, falhou, passoDaEntrada, seguirFuncionando, type EstadoMicrofone } from "./microfone";

const erro = (name: string, message = name) => Object.assign(new Error(message), { name });

describe("falhaDoMicrofone: por que o microfone não abriu, com o estado da permissão no navegador", () => {
  it("a pessoa bloqueou o site no navegador: negado", () => {
    expect(falhaDoMicrofone(erro("NotAllowedError"), "denied")).toBe("negado");
    expect(falhaDoMicrofone(erro("SecurityError"), "denied")).toBe("negado");
    // Sem saber a permissão (navegador sem a consulta), negado é o caminho mais provável.
    expect(falhaDoMicrofone(erro("NotAllowedError"), null)).toBe("negado");
  });

  it("o navegador liberou, mas o Windows ou o macOS barram: sistema", () => {
    expect(falhaDoMicrofone(erro("NotAllowedError", "Permission denied by system"), "granted")).toBe("sistema");
    expect(falhaDoMicrofone(erro("NotAllowedError", "Permission denied by system"), null)).toBe("sistema");
    expect(falhaDoMicrofone(erro("NotAllowedError"), "granted")).toBe("sistema");
    expect(falhaDoMicrofone(erro("NotReadableError"), "granted")).toBe("sistema");
    expect(falhaDoMicrofone(erro("AbortError"), null)).toBe("sistema");
  });

  it("a pessoa fechou o aviso do navegador sem escolher: volta a pergunta", () => {
    expect(falhaDoMicrofone(erro("NotAllowedError", "Permission dismissed"), "prompt")).toBe("pergunta");
  });

  it("computador sem microfone", () => {
    expect(falhaDoMicrofone(erro("NotFoundError"), "granted")).toBe("sem_aparelho");
    expect(falhaDoMicrofone(erro("OverconstrainedError"), null)).toBe("sem_aparelho");
    expect(falhaDoMicrofone(new Error("sem microfone"), null)).toBe("sem_aparelho");
  });

  it("o resto é falha genérica", () => {
    expect(falhaDoMicrofone(erro("TypeError"), null)).toBe("falhou");
    expect(falhaDoMicrofone(null, null)).toBe("falhou");
  });

  it("só as falhas esperam um clique para tentar de novo", () => {
    const falhas: EstadoMicrofone[] = ["pergunta", "negado", "sistema", "sem_aparelho", "falhou"];
    const andando: EstadoMicrofone[] = ["ok", "abrindo", "pedindo"];
    expect(falhas.every(falhou)).toBe(true);
    expect(andando.some(falhou)).toBe(false);
  });
});

describe("passoDaEntrada: o que o cartão do microfone mostra na entrada da sala", () => {
  const base = { permissao: "prompt" as const, ligado: false, aberto: false, falha: null };

  it("antes de saber a permissão, nada pisca: carregando", () => {
    expect(passoDaEntrada({ ...base, permissao: "carregando" })).toBe("carregando");
  });

  it("sem resposta no navegador: o botão de ativar; clicado, o guia do aviso do navegador", () => {
    expect(passoDaEntrada(base)).toBe("pergunta");
    expect(passoDaEntrada({ ...base, ligado: true })).toBe("pedindo");
  });

  it("liberado antes: abre sozinho e mostra a checagem quando o microfone abre", () => {
    expect(passoDaEntrada({ ...base, permissao: "granted" })).toBe("abrindo");
    expect(passoDaEntrada({ ...base, permissao: "granted", ligado: true })).toBe("abrindo");
    expect(passoDaEntrada({ ...base, permissao: "granted", ligado: true, aberto: true })).toBe("ok");
  });

  it("bloqueado mostra o guia; e a falha ao abrir vence o resto", () => {
    expect(passoDaEntrada({ ...base, permissao: "denied" })).toBe("negado");
    expect(passoDaEntrada({ ...base, permissao: "granted", ligado: true, falha: "sistema" })).toBe("sistema");
    expect(passoDaEntrada({ ...base, permissao: null, ligado: true, falha: "negado" })).toBe("negado");
  });

  it("navegador sem a consulta da permissão: o botão de ativar, e o clique abre sem o guia do aviso", () => {
    expect(passoDaEntrada({ ...base, permissao: null })).toBe("pergunta");
    expect(passoDaEntrada({ ...base, permissao: null, ligado: true })).toBe("abrindo");
  });
});

describe("seguirFuncionando: o sinal de microfone funcionando", () => {
  const passar = (abertas: boolean[]) => abertas.reduce(seguirFuncionando, FUNCIONANDO_INICIAL);

  it("acende com a porta aberta por 300 ms seguidos (6 medidas de 50 ms)", () => {
    expect(passar([true, true, true, true, true]).ok).toBe(false);
    expect(passar([true, true, true, true, true, true]).ok).toBe(true);
  });

  it("um clique solto não conta: a sequência recomeça quando a porta fecha", () => {
    expect(passar([true, true, true, false, true, true, true]).ok).toBe(false);
  });

  it("aceso, fica aceso (a prova já foi dada)", () => {
    expect(passar([true, true, true, true, true, true, false, false]).ok).toBe(true);
  });
});
