import { describe, expect, it } from "vitest";
import { destinoInicial, montarLista, moverCanal, normalizarNome, proximaPosicao, semMimForaDaSala, type CanalOrdem } from "./canais";
import type { CanalBruto, PrivadaBruta } from "./contratos";

describe("normalizarNome", () => {
  it("canal de texto: minúsculo, com hífen no lugar do espaço, como no Discord", () => {
    expect(normalizarNome("  Dicas de   Mid ", "texto")).toEqual({ ok: true, nome: "dicas-de-mid" });
    expect(normalizarNome("Ação", "texto")).toEqual({ ok: true, nome: "ação" });
  });

  it("canal de voz: fica como foi escrito, só sem espaço sobrando", () => {
    expect(normalizarNome("  Live do   PPA ", "voz")).toEqual({ ok: true, nome: "Live do PPA" });
    expect(normalizarNome("Party (5 lugares)!", "voz")).toEqual({ ok: true, nome: "Party (5 lugares)!" });
  });

  it("recusa nome curto, longo ou com símbolo fora da lista", () => {
    expect(normalizarNome(" a ", "voz")).toEqual({ ok: false, erro: "nome_curto" });
    expect(normalizarNome("x".repeat(41), "voz")).toEqual({ ok: false, erro: "nome_longo" });
    expect(normalizarNome("<script>", "voz")).toEqual({ ok: false, erro: "nome_invalido" });
    expect(normalizarNome("geral!", "texto")).toEqual({ ok: false, erro: "nome_invalido" });
  });
});

const canais: CanalOrdem[] = [
  { id: "geral", categoria: "texto", posicao: 10 },
  { id: "avisos", categoria: "texto", posicao: 20 },
  { id: "live", categoria: "voz", posicao: 10 },
  { id: "livre", categoria: "voz", posicao: 20 },
  { id: "duo", categoria: "voz", posicao: 30 },
];

describe("moverCanal", () => {
  it("sobe trocando de lugar com o vizinho da mesma categoria", () => {
    expect(moverCanal(canais, "duo", "cima")).toEqual([
      { id: "duo", posicao: 20 },
      { id: "livre", posicao: 30 },
    ]);
  });

  it("na ponta não muda nada", () => {
    expect(moverCanal(canais, "geral", "cima")).toEqual([]);
    expect(moverCanal(canais, "duo", "baixo")).toEqual([]);
    expect(moverCanal(canais, "nao-existe", "baixo")).toEqual([]);
  });

  it("com posições empatadas, renumera a categoria e a troca acontece", () => {
    const empatados: CanalOrdem[] = [
      { id: "a", categoria: "voz", posicao: 0 },
      { id: "b", categoria: "voz", posicao: 0 },
    ];
    expect(moverCanal(empatados, "b", "cima")).toEqual([
      { id: "b", posicao: 10 },
      { id: "a", posicao: 20 },
    ]);
  });
});

describe("proximaPosicao", () => {
  it("canal novo vai para o fim da própria categoria", () => {
    expect(proximaPosicao(canais, "voz")).toBe(40);
    expect(proximaPosicao(canais, "texto")).toBe(30);
    expect(proximaPosicao([], "texto")).toBe(10);
  });
});

const ppa = "00000000-0000-4000-8000-000000000002";
const brutos: CanalBruto[] = [
  { id: "t1", k: "texto", t: "geral", p: 10, v: "palco", a: "todos", o: ppa, c: true, n: 0, x: 200 },
  {
    id: "v1", k: "palco", t: "Live do PPA", p: 10, v: "palco", a: "todos", o: ppa, c: true, n: 3, x: 30,
    m: [
      { u: ppa, r: "dono", mu: false, s: true, nm: "PeterPPA", sp: "persona", sa: "https://steam/a.jpg" },
      { u: "u2", r: "ouvinte", mu: true },
    ],
  },
  { id: "v2", k: "palco", t: "Party 1", p: 20, v: "livre", a: "beneficio", o: ppa, c: false, n: 0, x: 5 },
];
const privadas: PrivadaBruta[] = [{ id: "m1", k: "mentoria", t: "Mentoria: Jogador", o: ppa, n: 1 }];

describe("montarLista", () => {
  const lista = montarLista(brutos, privadas);

  it("separa texto, voz e salas privadas, na ordem do servidor", () => {
    expect(lista.texto.map((c) => c.id)).toEqual(["t1"]);
    expect(lista.voz.map((c) => c.id)).toEqual(["v1", "v2"]);
    expect(lista.privadas.map((c) => c.id)).toEqual(["m1"]);
  });

  it("quem está no canal de voz, com o nome do Discord, o avatar da Steam, microfone e tela", () => {
    const [dono, ouvinte] = lista.voz[0]?.pessoas ?? [];
    expect(dono).toEqual({ userId: ppa, nome: "PeterPPA", avatarUrl: "https://steam/a.jpg", papel: "dono", mutado: false, tela: true });
    expect(ouvinte).toMatchObject({ userId: "u2", papel: "ouvinte", mutado: true, tela: false });
    expect(lista.voz[0]).toMatchObject({ online: 3, lugares: 30, cheio: false, aoVivo: true, modo: "palco" });
  });

  it("marca o benefício, o modo livre e o chat fechado", () => {
    expect(lista.voz[1]).toMatchObject({ beneficio: true, modo: "livre", chatAberto: false, aoVivo: false, online: 0, lugares: 5, cheio: false });
    expect(lista.texto[0]).toMatchObject({ beneficio: false, chatAberto: true });
  });
});

describe("semMimForaDaSala (quem trocou de canal aparece só no canal em que está)", () => {
  const lista = montarLista(brutos, privadas);

  it("na tela da própria pessoa, ela sai dos outros canais na hora, com a contagem e o lotado certos", () => {
    const nova = semMimForaDaSala(lista, "u2", "v2");
    expect(nova.voz[0]?.pessoas.map((p) => p.userId)).toEqual([ppa]);
    expect(nova.voz[0]).toMatchObject({ online: 2, cheio: false });
  });

  it("no canal em que ela está, nada muda", () => {
    expect(semMimForaDaSala(lista, "u2", "v1").voz[0]?.pessoas.map((p) => p.userId)).toEqual([ppa, "u2"]);
  });

  it("fora de qualquer sala, a lista fica como veio", () => {
    expect(semMimForaDaSala(lista, null, null)).toBe(lista);
    expect(semMimForaDaSala(lista, "u2", null)).toBe(lista);
  });
});

describe("destinoInicial", () => {
  it("vai para o canal de voz em modo palco onde o dono está (a live)", () => {
    expect(destinoInicial(montarLista(brutos, []))).toBe("v1");
  });

  it("sem o dono num palco, vai para o primeiro canal de texto", () => {
    const semDono = brutos.map((c) => ({ ...c, m: undefined, n: 0 }));
    expect(destinoInicial(montarLista(semDono, []))).toBe("t1");
  });

  it("sem canal de texto, o primeiro de voz; sem canal, nenhum", () => {
    expect(destinoInicial(montarLista(brutos.slice(2), []))).toBe("v2");
    expect(destinoInicial(montarLista([], privadas))).toBeNull();
  });
});

describe("limite do canal de voz", () => {
  it("canal cheio (3 de 3) aparece cheio; a sala privada não mostra limite", () => {
    const party = { id: "p1", k: "palco" as const, t: "Party 1", p: 30, v: "livre" as const, a: "todos" as const, o: ppa, c: true, n: 3, x: 3 };
    const lista = montarLista([party], privadas);
    expect(lista.voz[0]).toMatchObject({ online: 3, lugares: 3, cheio: true });
    expect(lista.privadas[0]).toMatchObject({ lugares: null, cheio: false });
  });
});
