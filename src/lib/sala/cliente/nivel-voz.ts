// Indicador de fala: mede o volume de cada voz (a própria e as recebidas) no próprio navegador,
// sem passar nada pelo servidor. Quem fala fica aceso um instante depois da voz cair, para o anel
// não piscar entre uma sílaba e outra (como no Discord).

const LIMIAR = 0.02;
/** Quanto tempo o anel segue aceso depois da voz cair abaixo do limiar. */
export const SEGURA_FALA_MS = 400;

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

/** Volume médio (RMS) da janela de áudio, de 0 a 1. */
function nivel(f: Fonte): number {
  f.analyser.getFloatTimeDomainData(f.buffer);
  let sum = 0;
  for (const v of f.buffer) sum += v * v;
  return Math.sqrt(sum / f.buffer.length);
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
    analyser.fftSize = 512;
    source.connect(analyser);
    this.fontes.set(id, { source, analyser, buffer: new Float32Array(new ArrayBuffer(analyser.fftSize * 4)) });
  }

  private unwatch(id: string): void {
    const f = this.fontes.get(id);
    if (!f) return;
    f.source.disconnect();
    this.fontes.delete(id);
    this.ultima.delete(id);
  }

  /** Quem está falando agora (volume acima do limiar, segurado um instante para não piscar). */
  speaking(agora = Date.now()): string[] {
    const acima = [...this.fontes].filter(([, f]) => nivel(f) > LIMIAR).map(([id]) => id);
    return segurarFala(this.ultima, acima, agora, SEGURA_FALA_MS);
  }

  /** Volume da própria voz (0 a 1), para o medidor do teste do microfone. */
  nivelDe(id: string): number {
    const f = this.fontes.get(id);
    return f ? nivel(f) : 0;
  }

  close(): void {
    for (const id of [...this.fontes.keys()]) this.unwatch(id);
    this.ctx?.close().catch(() => null);
  }
}
