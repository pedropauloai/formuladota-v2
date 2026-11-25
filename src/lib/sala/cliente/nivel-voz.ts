// Indicador de fala: mede o volume de cada voz (a própria e as recebidas) no próprio navegador,
// sem passar nada pelo servidor. Cada medida olha o som inteiro desde a anterior, e não só o último
// instante (que pode cair entre duas sílabas); conta como fala só voz seguida, para um estalo de tecla
// não acender; e quem fala fica aceso um instante depois da voz cair, para o anel não piscar entre
// uma palavra e outra (como no Discord).

const LIMIAR = 0.02;
/** Quanto tempo o anel segue aceso depois da voz cair abaixo do limiar. */
export const SEGURA_FALA_MS = 400;
/** Som de cada medida: 16384 amostras (cerca de 340 ms) cobrem os 300 ms entre uma medida e a seguinte. */
const JANELA = 16_384;
/** Pedaço medido de cada vez (cerca de 11 ms). */
const BLOCO = 512;
/** Pedaços seguidos acima do limiar para contar como fala: cerca de 65 ms, menos que uma sílaba e mais que um estalo de tecla. */
const MIN_BLOCOS = 6;

interface Fonte {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  buffer: Float32Array<ArrayBuffer>;
}

/** Anota quem está acima do limiar agora e devolve quem falou nos últimos `seguraMs` (na ordem de entrada). */
export function segurarFala(ultima: Map<string, number>, acima: string[], agora: number, seguraMs: number): string[] {
  for (const id of acima) ultima.set(id, agora);
  const out: string[] = [];
  for (const [id, quando] of ultima) {
    if (agora - quando < seguraMs) out.push(id);
    else ultima.delete(id);
  }
  return out;
}

/** Volume médio (RMS) de um pedaço do som, de 0 a 1. */
function volume(pedaco: Float32Array): number {
  let soma = 0;
  for (const v of pedaco) soma += v * v;
  return Math.sqrt(soma / pedaco.length);
}

/** O som desde a última medida tem voz seguida acima do limiar, e não só estalos soltos. */
function temVoz(f: Fonte): boolean {
  f.analyser.getFloatTimeDomainData(f.buffer);
  let seguidos = 0;
  for (let i = 0; i + BLOCO <= f.buffer.length; i += BLOCO) {
    seguidos = volume(f.buffer.subarray(i, i + BLOCO)) > LIMIAR ? seguidos + 1 : 0;
    if (seguidos >= MIN_BLOCOS) return true;
  }
  return false;
}

export class NivelDeVoz {
  private readonly ctx: AudioContext | null;
  private readonly fontes = new Map<string, Fonte>();
  private readonly ultima = new Map<string, number>();

  constructor() {
    this.ctx = typeof AudioContext !== "undefined" ? new AudioContext() : null;
  }

  watch(id: string, track: MediaStreamTrack | null): void {
    this.unwatch(id);
    if (!track || !this.ctx) return;
    const source = this.ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = JANELA;
    source.connect(analyser);
    this.fontes.set(id, { source, analyser, buffer: new Float32Array(new ArrayBuffer(JANELA * 4)) });
  }

  private unwatch(id: string): void {
    const f = this.fontes.get(id);
    if (!f) return;
    f.source.disconnect();
    this.fontes.delete(id);
    this.ultima.delete(id);
  }

  /** Quem está falando agora (voz seguida desde a última medida, segurada um instante para não piscar). */
  speaking(agora = Date.now()): string[] {
    const acima = [...this.fontes].filter(([, f]) => temVoz(f)).map(([id]) => id);
    return segurarFala(this.ultima, acima, agora, SEGURA_FALA_MS);
  }

  close(): void {
    for (const id of [...this.fontes.keys()]) this.unwatch(id);
    this.ctx?.close().catch(() => null);
  }
}
