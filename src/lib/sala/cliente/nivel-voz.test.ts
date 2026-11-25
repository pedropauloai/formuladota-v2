import { afterEach, describe, expect, it, vi } from "vitest";
import { NivelDeVoz, segurarFala } from "./nivel-voz";

describe("segurarFala (o anel de quem fala não pisca entre as sílabas)", () => {
  it("acende na hora em que a voz passa do limiar", () => {
    const ultima = new Map<string, number>();
    expect(segurarFala(ultima, ["a"], 1000, 400)).toEqual(["a"]);
  });

  it("fica aceso um instante depois da voz cair, e apaga passado esse tempo", () => {
    const ultima = new Map<string, number>();
    segurarFala(ultima, ["a"], 1000, 400);
    expect(segurarFala(ultima, [], 1300, 400)).toEqual(["a"]);
    expect(segurarFala(ultima, [], 1400, 400)).toEqual([]);
  });

  it("quem volta a falar antes de apagar continua aceso sem piscar", () => {
    const ultima = new Map<string, number>();
    segurarFala(ultima, ["a"], 1000, 400);
    segurarFala(ultima, [], 1200, 400);
    segurarFala(ultima, ["a"], 1350, 400);
    expect(segurarFala(ultima, [], 1700, 400)).toEqual(["a"]);
  });

  it("cada pessoa tem o próprio tempo", () => {
    const ultima = new Map<string, number>();
    segurarFala(ultima, ["a"], 1000, 400);
    segurarFala(ultima, ["b"], 1300, 400);
    expect(segurarFala(ultima, [], 1500, 400)).toEqual(["b"]);
  });
});

const TAXA = 48_000;
type Trecho = [ms: number, volume: number];

/** Som a 48 kHz, do mais antigo ao instante da medida: cada trecho é um seno de 200 Hz (volume 0 é silêncio). */
function som(...trechos: Trecho[]): Float32Array {
  const amostras: number[] = [];
  for (const [ms, volume] of trechos) {
    const n = Math.round((ms * TAXA) / 1000);
    for (let k = 0; k < n; k++) amostras.push(volume * Math.sin((2 * Math.PI * 200 * amostras.length) / TAXA));
  }
  return Float32Array.from(amostras);
}

/** O navegador de mentira: o analisador devolve, como o AnalyserNode, as últimas `fftSize` amostras do som. */
function navegadorCom(amostras: Float32Array): void {
  vi.stubGlobal("MediaStream", class {});
  vi.stubGlobal(
    "AudioContext",
    class {
      sampleRate = TAXA;
      createMediaStreamSource() {
        return { connect: () => undefined, disconnect: () => undefined };
      }
      createAnalyser() {
        return {
          fftSize: 2048,
          getFloatTimeDomainData(destino: Float32Array) {
            const janela = new Float32Array(this.fftSize);
            const ultimas = amostras.subarray(Math.max(0, amostras.length - this.fftSize));
            janela.set(ultimas, this.fftSize - ultimas.length);
            destino.set(janela.subarray(0, destino.length));
          },
        };
      }
      close() {
        return Promise.resolve();
      }
    }
  );
}

/** Quem a sala acha que está falando, medindo agora uma voz com aquele som. */
function quemFala(amostras: Float32Array): string[] {
  navegadorCom(amostras);
  const nivel = new NivelDeVoz();
  nivel.watch("a", {} as MediaStreamTrack);
  return nivel.speaking(1000);
}

describe("NivelDeVoz (a sala mede quem fala a cada 300 ms)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fala no instante da medida acende", () => {
    expect(quemFala(som([400, 0.3]))).toEqual(["a"]);
  });

  it("silêncio não acende", () => {
    expect(quemFala(som([400, 0]))).toEqual([]);
  });

  it("a sílaba que terminou entre duas medidas ainda acende, e a fala contínua não pisca", () => {
    // 150 ms de voz que acabaram 200 ms antes da medida, no meio de duas medidas de 300 ms.
    expect(quemFala(som([50, 0], [150, 0.3], [200, 0]))).toEqual(["a"]);
  });

  it("uma sílaba curta, de 120 ms, acende", () => {
    expect(quemFala(som([280, 0], [120, 0.3]))).toEqual(["a"]);
  });

  it("um estalo de tecla no instante da medida não acende", () => {
    expect(quemFala(som([392, 0], [8, 0.6]))).toEqual([]);
  });

  it("um estalo esticado pelo processamento do navegador (cerca de 70 ms acima do limiar) não acende", () => {
    // Medido em 24/11/2026: com eco, ruído e ganho automático ligados, o bipe de 20 ms do microfone falso do
    // Chrome sai com 5 a 7 pedaços de 11 ms seguidos acima do limiar.
    expect(quemFala(som([330, 0], [70, 0.3]))).toEqual([]);
  });

  it("teclas apertadas em sequência (o Dota em luta), com silêncio entre elas, não acendem", () => {
    const tecla: Trecho[] = [
      [42, 0],
      [8, 0.6],
    ];
    expect(quemFala(som([100, 0], ...tecla, ...tecla, ...tecla, ...tecla, ...tecla, ...tecla))).toEqual([]);
  });
});
