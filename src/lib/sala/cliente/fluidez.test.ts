import { describe, expect, it } from "vitest";
import { ESPERA_INICIAL_MS, ESPERA_MAX_MS, fluidezInicial, proximaFluidez, type Fluidez } from "./fluidez";

const S = 1_000;

/** Passa as leituras de 5 s em sequência: o congelamento (ms) de cada uma. */
function leituras(inicio: Fluidez, congelamentos: number[], t0: number): { f: Fluidez; t: number } {
  let f = inicio;
  let t = t0;
  for (const ms of congelamentos) {
    t += 5 * S;
    f = proximaFluidez(f, ms, t);
  }
  return { f, t };
}

describe("proximaFluidez: a tela de quem assiste com conexão fraca", () => {
  it("na alta, um congelamento sozinho não desce", () => {
    const { f } = leituras(fluidezInicial(0), [3_100, 0, 0, 0, 0], 0);
    expect(f.camada).toBe("f");
  });

  it("dois congelamentos em 20 s descem para a leve por 60 s", () => {
    const { f } = leituras(fluidezInicial(0), [3_100, 0, 3_100], 0);
    expect(f.camada).toBe("h");
    expect(f.esperaMs).toBe(ESPERA_INICIAL_MS);
  });

  it("dois congelamentos com mais de 20 s entre eles não descem", () => {
    const { f } = leituras(fluidezInicial(0), [3_100, 0, 0, 0, 0, 3_100], 0);
    expect(f.camada).toBe("f");
  });

  it("na leve, passada a espera, tenta a alta de novo", () => {
    const { f: leve, t } = leituras(fluidezInicial(0), [3_100, 3_100], 0);
    expect(proximaFluidez(leve, 0, t + ESPERA_INICIAL_MS - S).camada).toBe("h");
    expect(proximaFluidez(leve, 0, t + ESPERA_INICIAL_MS).camada).toBe("f");
  });

  it("caiu de novo logo depois de voltar para a alta: espera o dobro na leve, até 5 minutos", () => {
    let { f, t } = leituras(fluidezInicial(0), [3_100, 3_100], 0);
    const esperas: number[] = [];
    for (let i = 0; i < 5; i++) {
      t += f.esperaMs;
      f = proximaFluidez(f, 0, t);
      ({ f, t } = leituras(f, [3_100, 3_100], t));
      esperas.push(f.esperaMs);
    }
    expect(esperas).toEqual([2 * ESPERA_INICIAL_MS, 4 * ESPERA_INICIAL_MS, ESPERA_MAX_MS, ESPERA_MAX_MS, ESPERA_MAX_MS]);
  });

  it("estável na alta por 2 minutos depois de voltar: a próxima queda espera 60 s de novo", () => {
    let { f, t } = leituras(fluidezInicial(0), [3_100, 3_100], 0);
    t += f.esperaMs;
    f = proximaFluidez(f, 0, t);
    ({ f, t } = leituras(f, Array(24).fill(0), t));
    ({ f } = leituras(f, [3_100, 3_100], t));
    expect(f.camada).toBe("h");
    expect(f.esperaMs).toBe(ESPERA_INICIAL_MS);
  });
});
