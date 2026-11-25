import { describe, expect, it, vi } from "vitest";
import type { Fase } from "./retrato";
import { criarRegistro, type Armazem, type SalaMeta } from "./registro";

class Falsa {
  fase: Fase = "inicial";
  motivo: string | null = null;
  entradas = 0;
  saidas = 0;
  fechamentos = 0;
  /** Quando a saída chega ao servidor (o teste segura para ver a troca esperar). */
  saidaNoServidor: Promise<void> = Promise.resolve();
  private readonly ouvintes = new Set<() => void>();
  constructor(readonly roomId: string) {}
  async entrar(): Promise<void> {
    this.entradas += 1;
    this.mudar("na_sala");
  }
  sair(): Promise<void> {
    this.saidas += 1;
    this.mudar("saiu", "saiu");
    return this.saidaNoServidor;
  }
  sairNoFechamento(): void {
    this.fechamentos += 1;
  }
  getSnapshot = () => ({ fase: this.fase, motivo: this.motivo });
  subscribe = (l: () => void) => {
    this.ouvintes.add(l);
    return () => this.ouvintes.delete(l);
  };
  mudar(fase: Fase, motivo: string | null = null): void {
    this.fase = fase;
    this.motivo = motivo;
    this.ouvintes.forEach((l) => l());
  }
}

function memoria(): Armazem & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v), removeItem: (k) => void dados.delete(k) };
}

const A: SalaMeta = { roomId: "sala-a", titulo: "Live do PPA", tipo: "palco" };
const B: SalaMeta = { roomId: "sala-b", titulo: "Mentoria", tipo: "mentoria" };

function montar(armazem: Armazem | null = memoria(), esperar: (ms: number) => Promise<void> = async () => undefined) {
  const criadas: Falsa[] = [];
  const reg = criarRegistro<Falsa>({
    armazem: () => armazem,
    nova: (roomId) => {
      const s = new Falsa(roomId);
      criadas.push(s);
      return s;
    },
    esperar,
  });
  return { reg, criadas, armazem };
}

describe("registro da sala ativa", () => {
  it("a página da sala usa a mesma sessão antes e depois de entrar", async () => {
    const { reg } = montar();
    const s = reg.daPagina(A.roomId);
    expect(reg.daPagina(A.roomId)).toBe(s);
    await reg.entrar(s, A);
    expect(reg.daPagina(A.roomId)).toBe(s);
    expect(reg.atual()?.meta).toEqual(A);
  });

  it("entrar anota a sala na aba e avisa quem assina", async () => {
    const { reg, armazem } = montar();
    const ouvinte = vi.fn();
    reg.assinar(ouvinte);
    await reg.entrar(reg.daPagina(A.roomId), A);
    expect(JSON.parse(armazem?.getItem("formuladota:sala") ?? "null")).toEqual(A);
    expect(ouvinte).toHaveBeenCalled();
  });

  it("entrar em outra sala sai da anterior", async () => {
    const { reg } = montar();
    const a = reg.daPagina(A.roomId);
    await reg.entrar(a, A);
    await reg.entrar(reg.daPagina(B.roomId), B);
    expect(a.saidas).toBe(1);
    expect(reg.atual()?.meta).toEqual(B);
  });

  it("trocar de sala: a entrada na nova espera a saída da anterior chegar ao servidor (senão a pessoa aparecia nas duas)", async () => {
    let chegou: () => void = () => undefined;
    const { reg } = montar(memoria(), () => new Promise<void>(() => undefined));
    const a = reg.daPagina(A.roomId);
    await reg.entrar(a, A);
    a.saidaNoServidor = new Promise<void>((ok) => (chegou = ok));
    const b = reg.daPagina(B.roomId);
    const entrando = reg.entrar(b, B);
    await Promise.resolve();
    expect(b.entradas).toBe(0);
    chegou();
    await entrando;
    expect(b.entradas).toBe(1);
  });

  it("com a rede lenta, a entrada na nova não espera mais que 1,5 s pela saída", async () => {
    const esperas: number[] = [];
    const { reg } = montar(memoria(), async (ms) => void esperas.push(ms));
    const a = reg.daPagina(A.roomId);
    await reg.entrar(a, A);
    a.saidaNoServidor = new Promise<void>(() => undefined);
    const b = reg.daPagina(B.roomId);
    await reg.entrar(b, B);
    expect(b.entradas).toBe(1);
    expect(esperas).toContain(1500);
  });

  it("sair pelo botão tira a sala do painel e da aba", async () => {
    const { reg, armazem } = montar();
    const a = reg.daPagina(A.roomId);
    await reg.entrar(a, A);
    a.sair();
    expect(reg.atual()).toBeNull();
    expect(armazem?.getItem("formuladota:sala")).toBeNull();
  });

  it("quem é tirado da sala vê o motivo no painel até dispensar, e a aba esquece a sala", async () => {
    const { reg, armazem } = montar();
    const a = reg.daPagina(A.roomId);
    await reg.entrar(a, A);
    a.mudar("saiu", "expulso");
    expect(reg.atual()?.sessao).toBe(a);
    expect(armazem?.getItem("formuladota:sala")).toBeNull();
    reg.dispensar();
    expect(reg.atual()).toBeNull();
  });

  it("dispensar não tira quem ainda está na sala", async () => {
    const { reg } = montar();
    await reg.entrar(reg.daPagina(A.roomId), A);
    reg.dispensar();
    expect(reg.atual()?.meta).toEqual(A);
  });

  it("recarregar a página volta para a sala anotada, uma vez só", async () => {
    const armazem = memoria();
    armazem.setItem("formuladota:sala", JSON.stringify(A));
    const { reg, criadas } = montar(armazem);
    await reg.retomar();
    await reg.retomar();
    expect(criadas).toHaveLength(1);
    expect(criadas[0]?.entradas).toBe(1);
    expect(reg.atual()?.meta).toEqual(A);
  });

  it("recarregar na própria página da sala usa a sessão que a página já pegou", async () => {
    const armazem = memoria();
    armazem.setItem("formuladota:sala", JSON.stringify(A));
    const { reg, criadas } = montar(armazem);
    const daPagina = reg.daPagina(A.roomId);
    await reg.retomar();
    expect(criadas).toHaveLength(1);
    expect(daPagina.entradas).toBe(1);
  });

  it("sem sala anotada, ou com anotação estragada, recarregar não entra em nada", async () => {
    const armazem = memoria();
    armazem.setItem("formuladota:sala", "{quebrado");
    const { reg, criadas } = montar(armazem);
    await reg.retomar();
    expect(criadas).toHaveLength(0);
    expect(reg.atual()).toBeNull();
  });

  it("sem armazém (aba anônima ou bloqueada), entrar continua funcionando", async () => {
    const quebrado: Armazem = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    const { reg } = montar(quebrado);
    const a = reg.daPagina(A.roomId);
    await reg.entrar(a, A);
    expect(a.fase).toBe("na_sala");
    await reg.retomar();
  });

  it("fechar a aba avisa a saída da sala em que a pessoa está", async () => {
    const { reg } = montar();
    const a = reg.daPagina(A.roomId);
    await reg.entrar(a, A);
    reg.fecharAba();
    expect(a.fechamentos).toBe(1);
  });
});
