import { describe, expect, it, vi } from "vitest";
import { criarMedidor } from "./medidor-voz";
import type { MedidaPorta } from "./porta-voz";

function fonte() {
  let cb: ((m: MedidaPorta) => void) | null = null;
  return {
    medir: vi.fn((c: ((m: MedidaPorta) => void) | null) => {
      cb = c;
    }),
    mandar: (m: MedidaPorta) => cb?.(m),
  };
}

const medida: MedidaPorta = { nivel: -20, limiar: -50, aberta: true, fala: 0.9, corrida: 12 };

describe("medidor da voz no ar (a régua da engrenagem)", () => {
  it("só mede enquanto alguém olha a régua, e para quando a última régua fecha", () => {
    const m = criarMedidor();
    const f = fonte();
    m.definir(f, "rnnoise");
    expect(f.medir).toHaveBeenLastCalledWith(null);
    const recebidas: MedidaPorta[] = [];
    const soltar = m.medir((x) => recebidas.push(x));
    f.mandar(medida);
    expect(recebidas).toEqual([medida]);
    soltar();
    expect(f.medir).toHaveBeenLastCalledWith(null);
  });

  it("a voz que entra no ar depois de a régua abrir já começa a medir; a que sai para de medir", () => {
    const m = criarMedidor();
    const recebidas: MedidaPorta[] = [];
    m.medir((x) => recebidas.push(x));
    const f = fonte();
    m.definir(f, "porta");
    f.mandar(medida);
    expect(recebidas).toHaveLength(1);
    m.definir(null, null);
    expect(f.medir).toHaveBeenLastCalledWith(null);
    expect(m.temFonte()).toBe(false);
  });

  it("diz o que processa a voz agora e avisa quem escuta só quando muda", () => {
    const m = criarMedidor();
    let avisos = 0;
    m.subscribe(() => avisos++);
    const f = fonte();
    m.definir(f, "rnnoise");
    m.definir(f, "rnnoise");
    expect(m.estado()).toBe("rnnoise");
    expect(avisos).toBe(1);
    m.definir(f, "cru");
    expect(m.estado()).toBe("cru");
    expect(avisos).toBe(2);
  });
});
