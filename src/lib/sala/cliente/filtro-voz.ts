// Filtro do microfone (R21): microfone → RNNoise (redução de ruído por modelo, quando ligada) → porta de
// ruído → a faixa que vai para a sala. A faixa de saída é sempre a mesma: trocar o microfone ou o ajuste
// só religa os nós por dentro, sem derrubar a voz. Os processadores e o RNNoise vêm do próprio site
// (/voz, gerados por pnpm sala:arquivos-voz). Sem processador de áudio no navegador, ou se ele não
// carregar, não há filtro e a sala segue com o microfone cru, como antes.

import type { MedidaPorta, MensagemPorta } from "./porta-voz";

/** Pasta do RNNoise com a versão instalada no nome (o pnpm sala:arquivos-voz confere). */
const RNNOISE = "/voz/rnnoise-0.4.2";
const PORTA = "/voz/porta-voz.js";

export interface OpcoesFiltro {
  reducao: boolean;
  auto: boolean;
  limiarDb: number;
}

interface NoDeRnnoise extends AudioWorkletNode {
  destroy(): void;
}

type CriarRnnoise = (ctx: AudioContext) => NoDeRnnoise;

/** O RNNoise baixado e compilado uma vez por página; nulo se o navegador (ou a regra do site) não deixar. */
let rnnoise: Promise<{ wasm: ArrayBuffer; classe: new (ctx: AudioContext, o: { maxChannels: number; wasmBinary: ArrayBuffer }) => NoDeRnnoise } | null> | null = null;

function carregarRnnoise() {
  rnnoise ??= (async () => {
    try {
      const lib = await import("@sapphi-red/web-noise-suppressor");
      const wasm = await lib.loadRnnoise({ url: `${RNNOISE}/rnnoise.wasm`, simdUrl: `${RNNOISE}/rnnoise_simd.wasm` });
      // Compila aqui primeiro: se a regra de conteúdo do site barrar o WebAssembly, o filtro segue só com a porta.
      await WebAssembly.compile(wasm);
      return { wasm, classe: lib.RnnoiseWorkletNode };
    } catch {
      return null;
    }
  })();
  return rnnoise;
}

async function prepararRnnoise(ctx: AudioContext): Promise<CriarRnnoise | null> {
  const r = await carregarRnnoise();
  if (!r) return null;
  try {
    await ctx.audioWorklet.addModule(`${RNNOISE}/workletProcessor.js`);
    return (c) => new r.classe(c, { maxChannels: 1, wasmBinary: r.wasm });
  } catch {
    return null;
  }
}

export class FiltroDeVoz {
  readonly saida: MediaStreamTrack;
  private fonte: MediaStreamAudioSourceNode | null = null;
  private ruido: NoDeRnnoise | null = null;
  private reducao = false;
  /** O RNNoise falhou dentro do processador de áudio: não volta mais nesta sala. */
  private quebrado = false;
  private readonly ouvintes = new Set<() => void>();
  private soltarGesto: (() => void) | null = null;

  constructor(
    private readonly ctx: AudioContext,
    private readonly porta: AudioWorkletNode,
    private readonly destino: MediaStreamAudioDestinationNode,
    private readonly criarRnnoise: CriarRnnoise | null,
    o: OpcoesFiltro
  ) {
    const saida = destino.stream.getAudioTracks()[0];
    if (!saida) throw new Error("filtro sem saída");
    this.saida = saida;
    porta.connect(destino);
    ctx.addEventListener("statechange", () => this.avisar());
    this.ajustar(o);
    this.acordarNoGesto();
  }

  /** O RNNoise carregou (a caixa de redução de ruído usa ele, e não a do navegador). */
  get rnnoiseDisponivel(): boolean {
    return this.criarRnnoise !== null && !this.quebrado;
  }

  /** O som está passando pelo filtro agora (o navegador pode segurar o áudio parado até um clique). */
  get ativo(): boolean {
    return this.ctx.state === "running";
  }

  get tipo(): "rnnoise" | "porta" {
    return this.ruido ? "rnnoise" : "porta";
  }

  /** Avisa quando o áudio passa a correr ou para, e quando o RNNoise falha. */
  onEstado(l: () => void): void {
    this.ouvintes.add(l);
  }

  private avisar(): void {
    this.ouvintes.forEach((l) => l());
  }

  /** O microfone novo entra no lugar do antigo, na mesma faixa de saída. */
  entrada(track: MediaStreamTrack): void {
    this.fonte?.disconnect();
    this.fonte = this.ctx.createMediaStreamSource(new MediaStream([track]));
    this.fonte.connect(this.ruido ?? this.porta);
  }

  ajustar(o: OpcoesFiltro): void {
    const mensagem: MensagemPorta = { auto: o.auto, limiarDb: o.limiarDb };
    this.porta.port.postMessage(mensagem);
    const querRnnoise = o.reducao && this.rnnoiseDisponivel;
    if (querRnnoise === this.reducao) return;
    this.reducao = querRnnoise;
    this.fonte?.disconnect();
    this.ruido?.disconnect();
    this.ruido?.destroy();
    this.ruido = querRnnoise && this.criarRnnoise ? this.criarRnnoise(this.ctx) : null;
    // Se o RNNoise falhar no processador de áudio, ele sai e a porta segue sozinha.
    if (this.ruido) {
      this.ruido.connect(this.porta);
      this.ruido.onprocessorerror = () => {
        this.quebrado = true;
        this.ajustar(o);
        this.avisar();
      };
    }
    this.fonte?.connect(this.ruido ?? this.porta);
  }

  /** O nível ao vivo para a régua da engrenagem; nulo para de medir. */
  medir(cb: ((m: MedidaPorta) => void) | null): void {
    this.porta.port.onmessage = cb ? (e: MessageEvent<MedidaPorta>) => cb(e.data) : null;
    const mensagem: MensagemPorta = { medir: cb !== null };
    this.porta.port.postMessage(mensagem);
  }

  /** Página aberta sem clique (recarregada): o navegador segura o áudio até a pessoa mexer na página. */
  private acordarNoGesto(): void {
    if (this.ativo || typeof document === "undefined") return;
    const acordar = () => void this.ctx.resume().catch(() => null);
    document.addEventListener("pointerdown", acordar, { once: true });
    document.addEventListener("keydown", acordar, { once: true });
    this.soltarGesto = () => {
      document.removeEventListener("pointerdown", acordar);
      document.removeEventListener("keydown", acordar);
    };
  }

  fechar(): void {
    this.ouvintes.clear();
    this.soltarGesto?.();
    const mensagem: MensagemPorta = { fechar: true };
    this.porta.port.postMessage(mensagem);
    this.porta.port.onmessage = null;
    this.fonte?.disconnect();
    this.ruido?.disconnect();
    this.ruido?.destroy();
    this.porta.disconnect();
    this.saida.stop();
    void this.ctx.close().catch(() => null);
  }
}

/** O navegador tem processador de áudio: o filtro pode existir (e o RNNoise substitui a redução dele). */
export function filtroPossivel(): boolean {
  return typeof AudioWorkletNode !== "undefined";
}

/** O que a voz da sala usa do filtro. */
export type Filtro = Pick<FiltroDeVoz, "saida" | "rnnoiseDisponivel" | "ativo" | "tipo" | "onEstado" | "entrada" | "ajustar" | "medir" | "fechar">;

/** Monta o filtro; nulo quando o navegador não tem processador de áudio ou a porta não carregou. */
export async function criarFiltro(o: OpcoesFiltro): Promise<FiltroDeVoz | null> {
  if (typeof AudioContext === "undefined" || !filtroPossivel()) return null;
  let ctx: AudioContext | null = null;
  try {
    // 48 kHz: a taxa do RNNoise e a do Opus da sala.
    ctx = new AudioContext({ sampleRate: 48_000, latencyHint: "interactive" });
    await ctx.audioWorklet.addModule(PORTA);
    const criarRnnoise = await prepararRnnoise(ctx);
    const porta = new AudioWorkletNode(ctx, "porta-de-voz", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    const destino = ctx.createMediaStreamDestination();
    destino.channelCount = 1;
    void ctx.resume().catch(() => null);
    return new FiltroDeVoz(ctx, porta, destino, criarRnnoise, o);
  } catch {
    void ctx?.close().catch(() => null);
    return null;
  }
}
