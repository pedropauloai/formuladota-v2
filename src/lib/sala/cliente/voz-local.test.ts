import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./midia", () => ({ getMicTrack: vi.fn() }));

import type { Connection } from "./conexao";
import { getMicTrack } from "./midia";
import { VozLocal } from "./voz-local";

interface Faixa {
  enabled: boolean;
  label: string;
  stop: ReturnType<typeof vi.fn>;
}

const faixa = (): Faixa => ({ enabled: true, label: "Mic", stop: vi.fn() });

/** O navegador abrindo o microfone: só responde quando o teste manda. */
function microfoneLento() {
  const pendentes: Array<{ ok: (f: Faixa) => void; falha: (e: unknown) => void }> = [];
  vi.mocked(getMicTrack).mockImplementation(
    () => new Promise<MediaStreamTrack>((ok, falha) => pendentes.push({ ok: (f) => ok(f as unknown as MediaStreamTrack), falha }))
  );
  return { abrir: (f: Faixa) => pendentes.shift()?.ok(f), negar: (e: unknown) => pendentes.shift()?.falha(e) };
}

function montar() {
  const parar = vi.fn();
  const conn = { publish: vi.fn(() => parar) } as unknown as Connection;
  return { voz: new VozLocal(conn, null, () => undefined), conn };
}

describe("VozLocal: o microfone de quem pode falar", () => {
  beforeEach(() => {
    vi.mocked(getMicTrack).mockReset();
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
    expect(conn.publish).toHaveBeenCalledTimes(1);
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
    expect(conn.publish).not.toHaveBeenCalled();
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
    expect(conn.publish).not.toHaveBeenCalled();
    expect(voz.noAr).toBe(false);
  });
});
