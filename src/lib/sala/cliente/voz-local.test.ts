import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./midia", () => ({ getMicTrack: vi.fn() }));

import { CONFIG_PADRAO, configVoz } from "./config-voz";
import type { Connection } from "./conexao";
import type { Filtro } from "./filtro-voz";
import { getMicTrack } from "./midia";
import { VozLocal } from "./voz-local";

interface Faixa {
  enabled: boolean;
  label: string;
  stop: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
}

const faixa = (label = "Mic"): Faixa => ({ enabled: true, label, stop: vi.fn(), addEventListener: vi.fn() });

/** O navegador abrindo o microfone: só responde quando o teste manda. */
function microfoneLento() {
  const pendentes: Array<{ ok: (f: Faixa) => void; falha: (e: unknown) => void }> = [];
  vi.mocked(getMicTrack).mockImplementation(
    () => new Promise<MediaStreamTrack>((ok, falha) => pendentes.push({ ok: (f) => ok(f as unknown as MediaStreamTrack), falha }))
  );
  return { abrir: (f: Faixa) => pendentes.shift()?.ok(f), negar: (e: unknown) => pendentes.shift()?.falha(e), abrindo: () => pendentes.length };
}

function montar() {
  const pub = { trocar: vi.fn(), parar: vi.fn() };
  const conn = { publishTrocavel: vi.fn(() => pub) } as unknown as Connection;
  return { voz: new VozLocal(conn, null, () => undefined), pub, conn };
}

async function noAr(voz: VozLocal, mic: ReturnType<typeof microfoneLento>, primeiro: Faixa) {
  const ligando = voz.ajustar(true, false);
  mic.abrir(primeiro);
  await ligando;
}

const vez = () => new Promise((r) => setTimeout(r, 0));

describe("VozLocal: o microfone de quem pode falar", () => {
  beforeEach(() => {
    vi.mocked(getMicTrack).mockReset();
    configVoz.setEmUso(null);
  });

  it("abre e publica: ok, no ar e com o mudo pedido", async () => {
    const mic = microfoneLento();
    const { voz, conn } = montar();
    const ligando = voz.ajustar(true, true);
    const f = faixa();
    mic.abrir(f);
    expect(await ligando).toBe("ok");
    expect(voz.noAr).toBe(true);
    expect(f.enabled).toBe(false);
    expect(conn.publishTrocavel).toHaveBeenCalledTimes(1);
  });

  it("mutar enquanto o microfone abre: ele entra no ar mudo", async () => {
    const mic = microfoneLento();
    const { voz } = montar();
    const ligando = voz.ajustar(true, false);
    voz.setMutado(true);
    const f = faixa();
    mic.abrir(f);
    await ligando;
    expect(f.enabled).toBe(false);
  });

  it("chamada de novo enquanto o microfone abre: diz que está abrindo, sem pedir outro", async () => {
    const mic = microfoneLento();
    const { voz } = montar();
    const ligando = voz.ajustar(true, false);
    expect(voz.abrindoDesde).not.toBeNull();
    expect(await voz.ajustar(true, false)).toBe("abrindo");
    expect(getMicTrack).toHaveBeenCalledTimes(1);
    mic.abrir(faixa());
    await ligando;
    expect(voz.abrindoDesde).toBeNull();
  });

  it("o navegador nega: diz negado e a voz não fica no ar", async () => {
    const mic = microfoneLento();
    const { voz, conn } = montar();
    const ligando = voz.ajustar(true, false);
    mic.negar(Object.assign(new Error("negado"), { name: "NotAllowedError" }));
    expect(await ligando).toBe("negado");
    expect(voz.noAr).toBe(false);
    expect(conn.publishTrocavel).not.toHaveBeenCalled();
  });

  it("sair da sala enquanto o microfone abre: nada vai ao ar e o microfone fecha", async () => {
    const mic = microfoneLento();
    const { voz, conn } = montar();
    const ligando = voz.ajustar(true, false);
    voz.desligar();
    const f = faixa();
    mic.abrir(f);
    await ligando;
    expect(f.stop).toHaveBeenCalled();
    expect(conn.publishTrocavel).not.toHaveBeenCalled();
    expect(voz.noAr).toBe(false);
  });

  it("a troca põe o microfone novo na mesma publicação e fecha o antigo", async () => {
    const mic = microfoneLento();
    const { voz, pub, conn } = montar();
    const m1 = faixa("Mic 1");
    await noAr(voz, mic, m1);
    const trocando = voz.trocarMicrofone();
    const m2 = faixa("Mic 2");
    mic.abrir(m2);
    await trocando;
    expect(conn.publishTrocavel).toHaveBeenCalledTimes(1);
    expect(pub.trocar).toHaveBeenCalledWith(m2);
    expect(m1.stop).toHaveBeenCalled();
    expect(configVoz.emUso()).toBe("Mic 2");
  });

  it("mutar durante a troca: o microfone novo entra mudo", async () => {
    const mic = microfoneLento();
    const { voz, pub } = montar();
    await noAr(voz, mic, faixa("Mic 1"));
    const trocando = voz.trocarMicrofone();
    voz.setMutado(true);
    const novo = faixa("Mic 2");
    mic.abrir(novo);
    await trocando;
    expect(pub.trocar).toHaveBeenCalledWith(novo);
    expect(novo.enabled).toBe(false);
  });

  it("sair da sala durante a troca: o microfone novo fecha e não entra no ar", async () => {
    const mic = microfoneLento();
    const { voz, pub } = montar();
    await noAr(voz, mic, faixa("Mic 1"));
    const trocando = voz.trocarMicrofone();
    voz.desligar();
    const novo = faixa("Mic 2");
    mic.abrir(novo);
    await trocando;
    expect(novo.stop).toHaveBeenCalled();
    expect(pub.trocar).not.toHaveBeenCalled();
    expect(configVoz.emUso()).toBeNull();
  });

  it("duas trocas seguidas: a segunda roda depois da primeira, e o último microfone fica", async () => {
    const mic = microfoneLento();
    const { voz, pub } = montar();
    await noAr(voz, mic, faixa("Mic 1"));
    const primeira = voz.trocarMicrofone();
    void voz.trocarMicrofone();
    const m2 = faixa("Mic 2");
    mic.abrir(m2);
    await primeira;
    expect(mic.abrindo()).toBe(1);
    const m3 = faixa("Mic 3");
    mic.abrir(m3);
    await vez();
    expect(pub.trocar).toHaveBeenLastCalledWith(m3);
    expect(m2.stop).toHaveBeenCalled();
    expect(configVoz.emUso()).toBe("Mic 3");
  });
});

/** O filtro do microfone sem o navegador: anota o que recebeu. */
function filtroFalso(o: { ativo?: boolean; rnnoise?: boolean } = {}) {
  const f = {
    saida: faixa("Saída do filtro"),
    rnnoiseDisponivel: o.rnnoise ?? true,
    ativo: o.ativo ?? true,
    tipo: "rnnoise" as const,
    entradas: [] as Faixa[],
    ajustes: [] as unknown[],
    fechado: false,
    ouvinte: null as (() => void) | null,
    onEstado(l: () => void) {
      f.ouvinte = l;
    },
    entrada(t: Faixa) {
      f.entradas.push(t);
    },
    ajustar(x: unknown) {
      f.ajustes.push(x);
    },
    medir: vi.fn(),
    fechar() {
      f.fechado = true;
    },
  };
  return f;
}

function montarComFiltro(filtro: ReturnType<typeof filtroFalso>) {
  const pub = { trocar: vi.fn(), parar: vi.fn() };
  const conn = { publishTrocavel: vi.fn(() => pub) } as unknown as Connection;
  const voz = new VozLocal(conn, null, () => undefined, async () => filtro as unknown as Filtro);
  return { voz, pub, conn };
}

describe("VozLocal com o filtro do microfone (RNNoise e porta de ruído)", () => {
  beforeEach(() => {
    vi.mocked(getMicTrack).mockReset();
    configVoz.set(CONFIG_PADRAO);
    // O navegador tem processador de áudio: o microfone abre sem a redução dele, que o RNNoise substitui.
    vi.stubGlobal("AudioWorkletNode", class {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    configVoz.set(CONFIG_PADRAO);
  });

  it("a sala recebe a saída do filtro, o microfone entra nele e abre sem a redução do navegador", async () => {
    const mic = microfoneLento();
    const filtro = filtroFalso();
    const { voz, conn } = montarComFiltro(filtro);
    const f = faixa();
    await noAr(voz, mic, f);
    expect(conn.publishTrocavel).toHaveBeenCalledWith(filtro.saida, expect.anything(), expect.anything());
    expect(filtro.entradas).toEqual([f]);
    expect(vi.mocked(getMicTrack)).toHaveBeenCalledWith(expect.objectContaining({ reducaoRuido: false }));
  });

  it("trocar o microfone troca só a entrada do filtro: a sala segue com a mesma faixa", async () => {
    const mic = microfoneLento();
    const filtro = filtroFalso();
    const { voz, pub } = montarComFiltro(filtro);
    const m1 = faixa("Mic 1");
    await noAr(voz, mic, m1);
    const trocando = voz.trocarMicrofone();
    const m2 = faixa("Mic 2");
    mic.abrir(m2);
    await trocando;
    expect(filtro.entradas).toEqual([m1, m2]);
    expect(pub.trocar).not.toHaveBeenCalled();
    expect(m1.stop).toHaveBeenCalled();
  });

  it("filtro parado (o navegador segura o áudio até um clique): vai o microfone cru, e a saída do filtro entra quando ele corre", async () => {
    const mic = microfoneLento();
    const filtro = filtroFalso({ ativo: false });
    const { voz, pub, conn } = montarComFiltro(filtro);
    const f = faixa();
    await noAr(voz, mic, f);
    expect(conn.publishTrocavel).toHaveBeenCalledWith(f, expect.anything(), expect.anything());
    filtro.ativo = true;
    filtro.ouvinte?.();
    expect(pub.trocar).toHaveBeenLastCalledWith(filtro.saida);
  });

  it("sem o RNNoise, a caixa de redução de ruído volta a usar a do navegador: o microfone reabre com ela", async () => {
    const mic = microfoneLento();
    const filtro = filtroFalso({ rnnoise: false });
    const { voz } = montarComFiltro(filtro);
    await noAr(voz, mic, faixa("Mic 1"));
    await vez();
    expect(vi.mocked(getMicTrack)).toHaveBeenLastCalledWith(expect.objectContaining({ reducaoRuido: true }));
    mic.abrir(faixa("Mic 1 com a redução do navegador"));
    await vez();
    expect(filtro.entradas).toHaveLength(2);
  });

  it("mudar a sensibilidade ou a redução ajusta o filtro na hora, sem reabrir o microfone", async () => {
    const mic = microfoneLento();
    const filtro = filtroFalso();
    const { voz } = montarComFiltro(filtro);
    await noAr(voz, mic, faixa());
    configVoz.set({ sensibilidadeAuto: false, sensibilidadeDb: -40, reducaoRuido: false });
    voz.ajustarFiltro();
    expect(filtro.ajustes.at(-1)).toEqual({ reducao: false, auto: false, limiarDb: -40 });
    expect(vi.mocked(getMicTrack)).toHaveBeenCalledTimes(1);
  });

  it("sair da sala fecha o filtro", async () => {
    const mic = microfoneLento();
    const filtro = filtroFalso();
    const { voz } = montarComFiltro(filtro);
    await noAr(voz, mic, faixa());
    voz.desligar();
    expect(filtro.fechado).toBe(true);
  });
});
