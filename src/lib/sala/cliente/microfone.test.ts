import { describe, expect, it } from "vitest";
import { falhaDoMicrofone, falhou, type EstadoMicrofone } from "./microfone";

const erro = (name: string) => Object.assign(new Error(name), { name });

describe("falhaDoMicrofone: por que o microfone não abriu", () => {
  it("permissão negada pelo navegador ou pela pessoa", () => {
    expect(falhaDoMicrofone(erro("NotAllowedError"))).toBe("negado");
    expect(falhaDoMicrofone(erro("SecurityError"))).toBe("negado");
  });

  it("computador sem microfone", () => {
    expect(falhaDoMicrofone(erro("NotFoundError"))).toBe("sem_aparelho");
    expect(falhaDoMicrofone(erro("OverconstrainedError"))).toBe("sem_aparelho");
    expect(falhaDoMicrofone(new Error("sem microfone"))).toBe("sem_aparelho");
  });

  it("microfone preso em outro programa", () => {
    expect(falhaDoMicrofone(erro("NotReadableError"))).toBe("ocupado");
    expect(falhaDoMicrofone(erro("AbortError"))).toBe("ocupado");
  });

  it("o resto é falha genérica", () => {
    expect(falhaDoMicrofone(erro("TypeError"))).toBe("falhou");
    expect(falhaDoMicrofone(null)).toBe("falhou");
  });

  it("só as falhas esperam um clique para tentar de novo", () => {
    const falhas: EstadoMicrofone[] = ["negado", "sem_aparelho", "ocupado", "falhou"];
    const andando: EstadoMicrofone[] = ["ok", "abrindo", "pedindo"];
    expect(falhas.every(falhou)).toBe(true);
    expect(andando.some(falhou)).toBe(false);
  });
});
