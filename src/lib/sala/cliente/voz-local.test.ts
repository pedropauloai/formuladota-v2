import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./midia", () => ({ getMicTrack: vi.fn() }));

import { configVoz } from "./config-voz";
import type { Connection } from "./conexao";
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
