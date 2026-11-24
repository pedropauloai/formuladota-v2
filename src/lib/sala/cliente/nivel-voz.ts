// Indicador de fala: mede o volume de cada voz (a própria e as recebidas) no próprio navegador,
// sem passar nada pelo servidor.

const LIMIAR = 0.02;

interface Fonte {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  buffer: Float32Array<ArrayBuffer>;
}

export class NivelDeVoz {
  private readonly ctx: AudioContext | null;
  private readonly fontes = new Map<string, Fonte>();

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
  }

  /** Quem está falando agora (volume médio acima do limiar). */
  speaking(): string[] {
    const out: string[] = [];
    for (const [id, f] of this.fontes) {
      f.analyser.getFloatTimeDomainData(f.buffer);
      let sum = 0;
      for (const v of f.buffer) sum += v * v;
      if (Math.sqrt(sum / f.buffer.length) > LIMIAR) out.push(id);
    }
    return out;
  }

  close(): void {
    for (const id of [...this.fontes.keys()]) this.unwatch(id);
    this.ctx?.close().catch(() => null);
  }
}
