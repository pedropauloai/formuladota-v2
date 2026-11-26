import { afterEach, describe, expect, it, vi } from "vitest";
import { limiarAutomatico, nivelDb, novaPorta, parametros, passoDaPorta, portaSempreAberta, QUADRO, seguirFundo, SENSIBILIDADE, vozNoQuadro } from "./porta-voz";

const p = parametros(48_000);

/** Passa uma sequência de níveis (dB por quadro) pela porta, sem a probabilidade de fala, e diz se ela abriu em cada quadro. */
function rodar(niveis: number[], limiar = -50, estado = novaPorta()): boolean[] {
  return niveis.map((n) => {
    const { voz, segue } = vozNoQuadro(n, limiar, null, p.histerese);
    return passoDaPorta(estado, voz, segue, p);
  });
}

/** O mesmo, com a probabilidade de fala do RNNoise em cada quadro (o nível é alto o tempo todo). */
function rodarComFala(probabilidades: number[], estado = novaPorta()): boolean[] {
  return probabilidades.map((v) => {
    const { voz, segue } = vozNoQuadro(-10, -50, v, p.histerese);
    return passoDaPorta(estado, voz, segue, p);
  });
}

const vezes = (n: number, x: number) => Array<number>(n).fill(x);

describe("porta de ruído: o que passa para a sala", () => {
  it("a 48 kHz, abre com 37 ms de voz seguida, atrasa o som 16 ms e segura 250 ms", () => {
    // O pior clique medido na ligação real deu 11 quadros seguidos de "fala" no RNNoise; a fala, uns 90.
    expect(p.ataque).toBe(14);
    expect(p.olhar).toBe(6);
    expect(p.segurar).toBe(94);
  });

  it("voz acima do limiar abre a porta depois do ataque, e não antes", () => {
    const aberta = rodar(vezes(p.ataque + 2, -25));
    expect(aberta.slice(0, p.ataque - 1).some(Boolean)).toBe(false);
    expect(aberta[p.ataque - 1]).toBe(true);
  });

  it("um clique curto (poucos milissegundos) não abre a porta", () => {
    expect(rodar([...vezes(3, -10), ...vezes(60, -90)]).some(Boolean)).toBe(false);
  });

  it("a tecla (20 ms, 8 quadros) também não abre", () => {
    expect(rodar([...vezes(8, -12), ...vezes(60, -90)]).some(Boolean)).toBe(false);
  });

  it("cliques seguidos, como os da rodinha e do teclado, também não abrem", () => {
    const trem = Array.from({ length: 30 }, () => [...vezes(4, -12), ...vezes(4, -90)]).flat();
    expect(rodar(trem).some(Boolean)).toBe(false);
  });

  it("segura aberta no silêncio entre as palavras e fecha depois do tempo de segurar", () => {
    const voz = p.ataque + 2;
    const aberta = rodar([...vezes(voz, -25), ...vezes(p.segurar, -90), -90]);
    expect(aberta[voz + p.segurar - 1]).toBe(true);
    expect(aberta[voz + p.segurar]).toBe(false);
  });

  it("queda curta abaixo do limiar, mas acima do de fechar, não fecha no meio da palavra", () => {
    const aberta = rodar([...vezes(p.ataque + 2, -25), ...vezes(200, -53)]);
    expect(aberta.slice(p.ataque + 2).every(Boolean)).toBe(true);
  });

  it("com a probabilidade de fala do RNNoise, ela decide: clique alto com probabilidade baixa não abre", () => {
    // O que o RNNoise deu para o clique de mouse e a tecla na ligação real: no máximo 11 quadros seguidos acima de 50%.
    const cliques = Array.from({ length: 6 }, () => [...vezes(12, 0.9), ...vezes(60, 0.05)]).flat();
    expect(rodarComFala(cliques).some(Boolean)).toBe(false);
  });

  it("com a probabilidade de fala, a voz abre e segura entre as sílabas", () => {
    // Sílabas de 90 quadros com 34 de pausa, como a fala medida.
    const fala = Array.from({ length: 3 }, () => [...vezes(90, 0.95), ...vezes(34, 0.1)]).flat();
    const aberta = rodarComFala(fala);
    expect(aberta[p.ataque - 1]).toBe(true);
    expect(aberta.slice(p.ataque - 1).every(Boolean)).toBe(true);
  });

  it("sem a probabilidade de fala (RNNoise desligado), o nível contra o limiar decide", () => {
    expect(vozNoQuadro(-20, -50, null, 6)).toEqual({ voz: true, segue: true });
    expect(vozNoQuadro(-53, -50, null, 6)).toEqual({ voz: false, segue: true });
    expect(vozNoQuadro(-60, -50, null, 6)).toEqual({ voz: false, segue: false });
    expect(vozNoQuadro(-20, -50, 0.9, 6)).toEqual({ voz: true, segue: true });
  });

  it("probabilidade de fala alta com nível baixo (a cauda do clique, medida na cadeia real) não conta como voz", () => {
    // Na cadeia real, o RNNoise diz \"fala\" no clique só na cauda, abaixo de -43 dB; a fala vem acima de -16 dB.
    expect(vozNoQuadro(-55, -70, 0.9, 6)).toEqual({ voz: false, segue: false });
    const cauda = Array.from({ length: 6 }, () => [...Array<number>(30).fill(-55), ...Array<number>(40).fill(-90)]).flat();
    const estado = novaPorta();
    expect(cauda.map((n) => { const v = vozNoQuadro(n, -70, 0.95, p.histerese); return passoDaPorta(estado, v.voz, v.segue, p); }).some(Boolean)).toBe(false);
  });

  it("sensibilidade no mínimo deixa tudo passar; acima dela, a porta decide", () => {
    expect(portaSempreAberta(SENSIBILIDADE.min)).toBe(true);
    expect(portaSempreAberta(SENSIBILIDADE.min + 1)).toBe(false);
  });

  it("o limiar automático acompanha o ruído de fundo: o ruído não abre, a voz abre", () => {
    let fundo: number = SENSIBILIDADE.padrao;
    for (let i = 0; i < 750; i++) fundo = seguirFundo(fundo, -60);
    expect(fundo).toBeGreaterThan(-61);
    expect(fundo).toBeLessThan(-59);
    const limiar = limiarAutomatico(fundo);
    expect(rodar(vezes(200, -60), limiar).some(Boolean)).toBe(false);
    expect(rodar(vezes(20, -30), limiar).at(-1)).toBe(true);
  });

  it("durante a fala o fundo sobe devagar, e no silêncio volta logo", () => {
    let fundo = -70;
    for (let i = 0; i < 750; i++) fundo = seguirFundo(fundo, -25);
    expect(fundo).toBeLessThan(-64);
    for (let i = 0; i < 40; i++) fundo = seguirFundo(fundo, -70);
    expect(fundo).toBeLessThan(-69);
  });

  it("o limiar automático fica entre -70 e -30 dB", () => {
    expect(limiarAutomatico(-120)).toBe(-70);
    expect(limiarAutomatico(-10)).toBe(-30);
  });

  it("nível do quadro em dB: silêncio é -100 e um seno cheio fica perto de -3", () => {
    expect(nivelDb(new Float32Array(QUADRO))).toBe(-100);
    const seno = Float32Array.from({ length: QUADRO }, (_, i) => Math.sin((2 * Math.PI * 4 * i) / QUADRO));
    expect(nivelDb(seno)).toBeCloseTo(-3.01, 1);
  });
});

interface Processador {
  port: { onmessage: ((e: { data: unknown }) => void) | null; postMessage: (m: unknown) => void };
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}

type Globais = { currentFrame: number; __vozVad?: number; __vozVadEm?: number };
const globais = () => globalThis as unknown as Globais;

/** O processador de áudio de verdade, com os globais que o navegador dá a ele. */
async function processador(): Promise<{ proc: Processador; enviadas: unknown[] }> {
  const enviadas: unknown[] = [];
  let classe: (new () => Processador) | null = null;
  vi.stubGlobal("sampleRate", 48_000);
  vi.stubGlobal("currentFrame", 0);
  vi.stubGlobal("AudioWorkletProcessor", class {
    port = { onmessage: null, postMessage: (m: unknown) => enviadas.push(m) };
  });
  vi.stubGlobal("registerProcessor", (_nome: string, c: new () => Processador) => {
    classe = c;
  });
  vi.resetModules();
  await import("./porta-voz");
  if (!classe) throw new Error("o processador não se registrou");
  return { proc: new (classe as new () => Processador)(), enviadas };
}

/** Roda quadros de entrada pelo processador e devolve a saída emendada; `fala` simula o RNNoise ao lado. */
function processar(proc: Processador, quadros: Float32Array[], fala?: number): Float32Array {
  const saida = new Float32Array(quadros.length * QUADRO);
  quadros.forEach((q, i) => {
    const g = globais();
    if (fala !== undefined) {
      g.__vozVad = fala;
      g.__vozVadEm = g.currentFrame;
    }
    const out = new Float32Array(QUADRO);
    proc.process([[q]], [[out]]);
    saida.set(out, i * QUADRO);
    g.currentFrame += QUADRO;
  });
  return saida;
}

const silencio = () => new Float32Array(QUADRO);
const tom = (amplitude: number) => Float32Array.from({ length: QUADRO }, (_, i) => amplitude * Math.sin((2 * Math.PI * 6 * i) / QUADRO));
const pico = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const quadros = (n: number, f: () => Float32Array) => Array.from({ length: n }, f);

describe("processador da porta no áudio", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("o clique não chega à saída; a voz chega logo depois do ataque", async () => {
    const { proc } = await processador();
    expect(pico(processar(proc, [tom(0.9), tom(0.9), ...quadros(80, silencio)]))).toBe(0);
    const voz = processar(proc, [...quadros(40, () => tom(0.3)), ...quadros(8, silencio)]);
    expect(pico(voz.subarray(p.ataque * QUADRO, (p.ataque + 2) * QUADRO))).toBeGreaterThan(0.05);
    expect(pico(voz.subarray(20 * QUADRO, 40 * QUADRO))).toBeGreaterThan(0.28);
  });

  it("com o RNNoise dizendo que não é fala, nem um som alto e comprido abre a porta", async () => {
    const { proc } = await processador();
    expect(pico(processar(proc, quadros(60, () => tom(0.9)), 0.05))).toBe(0);
  });

  it("com o RNNoise dizendo que é fala, a voz passa desde o começo da palavra", async () => {
    const { proc } = await processador();
    processar(proc, quadros(20, silencio), 0.05);
    const voz = processar(proc, quadros(30, () => tom(0.3)), 0.95);
    // Logo que a porta abre, sai o som de `olhar` quadros antes: o começo da palavra (menos uns milissegundos).
    expect(pico(voz.subarray((p.ataque - 1) * QUADRO, (p.ataque + 1) * QUADRO))).toBeGreaterThan(0.05);
  });

  it("probabilidade de fala velha (o RNNoise saiu) não vale: volta o limiar de nível", async () => {
    const { proc } = await processador();
    const g = globais();
    g.__vozVad = 0.05;
    g.__vozVadEm = -10_000;
    expect(pico(processar(proc, quadros(30, () => tom(0.3))).subarray(20 * QUADRO))).toBeGreaterThan(0.2);
  });

  it("no manual, quem decide é a régua, mesmo com o RNNoise dizendo que não é fala", async () => {
    const { proc } = await processador();
    proc.port.onmessage?.({ data: { auto: false, limiarDb: -40 } });
    expect(pico(processar(proc, quadros(40, () => tom(0.3)), 0.05).subarray(30 * QUADRO))).toBeGreaterThan(0.2);
  });

  it("o som sai atrasado 6 quadros (16 ms): cada quadro da saída é o de 6 antes na entrada", async () => {
    const { proc } = await processador();
    // Fala que cresce a cada quadro: o volume da saída diz de qual quadro da entrada ela veio.
    const voz = processar(proc, Array.from({ length: 30 }, (_, k) => tom(0.01 * (k + 1))), 0.95);
    expect(pico(voz.subarray(25 * QUADRO, 26 * QUADRO))).toBeCloseTo(0.01 * (25 - p.olhar + 1), 2);
  });

  it("com a sensibilidade no mínimo, até o clique passa (a porta fica sempre aberta)", async () => {
    const { proc } = await processador();
    proc.port.onmessage?.({ data: { auto: false, limiarDb: SENSIBILIDADE.min } });
    expect(pico(processar(proc, [tom(0.9), ...quadros(20, silencio)]))).toBeGreaterThan(0.5);
  });

  it("mede o nível para a régua só quando a tela pede", async () => {
    const { proc, enviadas } = await processador();
    processar(proc, quadros(40, () => tom(0.3)));
    expect(enviadas).toHaveLength(0);
    proc.port.onmessage?.({ data: { medir: true } });
    processar(proc, quadros(40, () => tom(0.3)));
    const ultima = enviadas.at(-1) as { nivel: number; limiar: number; aberta: boolean } | undefined;
    expect(ultima?.aberta).toBe(true);
    expect(ultima?.nivel).toBeGreaterThan(-15);
    expect(ultima?.limiar).toBeLessThan(-29);
  });
});
