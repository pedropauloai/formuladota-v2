// Porta de ruído da voz (R21): fora da voz, o que sai para a sala é silêncio. Abre só com voz seguida por
// 37 ms (o pior clique medido na ligação real deu 11 quadros, uns 29 ms), segura aberta entre uma palavra e outra e solta devagar. No
// automático, com o RNNoise ligado, quem diz o que é voz é a probabilidade de fala dele (o clique alto não
// passa); sem ela, e no manual, é o nível contra o limiar (o automático acompanha o ruído de fundo). O som
// sai atrasado 16 ms: somados aos uns 21 ms em que o RNNoise já sabe da fala antes do som chegar à porta, a
// primeira palavra depois do silêncio passa inteira. O filtro todo soma uns 37 ms à voz (medido no e2e). Roda no processador de áudio do
// navegador (AudioWorklet), que não desacelera com o Dota na frente; o arquivo público é gerado deste
// (pnpm sala:arquivos-voz), e este módulo não importa nada para o gerado ficar inteiro.

/** Amostras de cada quadro do processador de áudio (cerca de 2,7 ms a 48 kHz). */
export const QUADRO = 128;

const ATAQUE_MS = 37;
const OLHAR_MS = 16;
/** Probabilidade de fala do RNNoise a partir da qual o quadro conta como voz. */
const FALA_VAD = 0.5;
/** E o nível mínimo junto dela: no clique, o RNNoise diz "fala" só na cauda baixa (abaixo de -43 dB, medido na
 *  cadeia real), e a fala chega acima de -16 dB. */
const NIVEL_DA_FALA_DB = -50;
/** A probabilidade vale por dois quadros do RNNoise (10 ms cada): mais velha, o RNNoise saiu. */
const VAD_VALE_AMOSTRAS = 960;
const SEGURAR_MS = 250;
const HISTERESE_DB = 6;
const ABRIR_MS = 4;
const SOLTAR_MS = 100;
const MARGEM_DB = 12;
const AUTO_MIN_DB = -70;
const AUTO_MAX_DB = -30;
const FUNDO_INICIAL_DB = -60;
/** No silêncio o fundo volta rápido; durante a fala sobe devagar (3 dB por segundo). */
const QUEDA_DO_FUNDO = 0.1;
const SUBIDA_DO_FUNDO_DB = 0.0075;
const SILENCIO_DB = -100;
/** A régua manda o nível a cada 19 quadros (cerca de 50 ms). */
const MEDIDA_QUADROS = 19;

/** A régua da engrenagem, em dB: no mínimo a porta fica sempre aberta. */
export const SENSIBILIDADE = { min: -80, max: 0, padrao: -50 } as const;

export interface ParametrosPorta {
  /** Quadros de voz seguida para abrir. */
  ataque: number;
  /** Quadros que o som sai atrasado, para o começo da palavra passar. */
  olhar: number;
  /** Quadros abaixo do limiar de fechar que ela segura aberta. */
  segurar: number;
  /** Quanto abaixo do limiar de abrir ela fecha (dB). */
  histerese: number;
}

export interface EstadoPorta {
  aberta: boolean;
  acima: number;
  abaixo: number;
  fundo: number;
}

/** O que a tela manda ao processador. */
export interface MensagemPorta {
  auto?: boolean;
  limiarDb?: number;
  medir?: boolean;
  fechar?: boolean;
}

/** O que o processador manda à régua: nível (pico do intervalo), limiar em uso, a porta e a maior probabilidade
 *  de fala do RNNoise no intervalo (nula quando a porta decide pelo nível). */
export interface MedidaPorta {
  nivel: number;
  limiar: number;
  aberta: boolean;
  fala: number | null;
  /** A maior sequência seguida de quadros de voz no intervalo (o clique faz sequência curta). */
  corrida: number;
}

const quadrosEm = (ms: number, taxa: number) => Math.ceil((ms * taxa) / 1000 / QUADRO);

export function parametros(taxa: number): ParametrosPorta {
  return { ataque: quadrosEm(ATAQUE_MS, taxa), olhar: quadrosEm(OLHAR_MS, taxa), segurar: quadrosEm(SEGURAR_MS, taxa), histerese: HISTERESE_DB };
}

export function novaPorta(): EstadoPorta {
  return { aberta: false, acima: 0, abaixo: 0, fundo: FUNDO_INICIAL_DB };
}

/** Volume médio do quadro em dB (o silêncio é -100). */
export function nivelDb(amostras: Float32Array): number {
  let soma = 0;
  for (const v of amostras) soma += v * v;
  const rms = Math.sqrt(soma / Math.max(1, amostras.length));
  return rms <= 1e-5 ? SILENCIO_DB : Math.max(SILENCIO_DB, 20 * Math.log10(rms));
}

/** O que conta como voz no quadro: com a probabilidade de fala do RNNoise, ela decide junto de um nível mínimo;
 *  sem ela, o nível contra o limiar, e a porta aberta segue até o nível cair abaixo do limiar de fechar. */
export function vozNoQuadro(nivel: number, limiar: number, vad: number | null, histerese: number): { voz: boolean; segue: boolean } {
  if (vad !== null) {
    const fala = vad >= FALA_VAD && nivel > NIVEL_DA_FALA_DB;
    return { voz: fala, segue: fala };
  }
  return { voz: nivel > limiar, segue: nivel > limiar - histerese };
}

/** Um quadro na porta: conta a voz seguida para abrir (o que não é voz desconta, sem zerar) e segura aberta. */
export function passoDaPorta(e: EstadoPorta, voz: boolean, segue: boolean, p: ParametrosPorta): boolean {
  if (!e.aberta) {
    e.acima = voz ? e.acima + 1 : Math.max(0, e.acima - 1);
    if (e.acima >= p.ataque) {
      e.aberta = true;
      e.abaixo = 0;
    }
    return e.aberta;
  }
  e.abaixo = segue ? 0 : e.abaixo + 1;
  if (e.abaixo > p.segurar) {
    e.aberta = false;
    e.acima = 0;
    e.abaixo = 0;
  }
  return e.aberta;
}

/** O ruído de fundo medido: cai logo no silêncio e sobe devagar, para a fala não puxar o limiar para cima. */
export function seguirFundo(fundo: number, nivel: number): number {
  return nivel < fundo ? fundo + (nivel - fundo) * QUEDA_DO_FUNDO : fundo + SUBIDA_DO_FUNDO_DB;
}

export function limiarAutomatico(fundo: number): number {
  return Math.min(AUTO_MAX_DB, Math.max(AUTO_MIN_DB, fundo + MARGEM_DB));
}

export function portaSempreAberta(limiar: number): boolean {
  return limiar <= SENSIBILIDADE.min;
}

const limitar = (db: number) => Math.min(SENSIBILIDADE.max, Math.max(SENSIBILIDADE.min, db));

// Os nomes que o navegador dá ao código do processador de áudio (não existem na página nem no Node).
declare const AudioWorkletProcessor: (new () => { readonly port: MessagePort }) | undefined;
declare const registerProcessor: ((nome: string, classe: unknown) => void) | undefined;
declare const sampleRate: number;
declare const currentFrame: number;

/** A probabilidade de fala que o RNNoise da mesma ligação deixa a cada quadro dele (nula se não for recente). */
function falaDoRnnoise(): number | null {
  const g = globalThis as unknown as { __vozVad?: unknown; __vozVadEm?: unknown };
  if (typeof g.__vozVad !== "number" || typeof g.__vozVadEm !== "number") return null;
  return currentFrame - g.__vozVadEm <= VAD_VALE_AMOSTRAS ? g.__vozVad : null;
}

function registrar(): void {
  if (typeof AudioWorkletProcessor === "undefined" || typeof registerProcessor === "undefined") return;
  const Base = AudioWorkletProcessor;

  class PortaDeVoz extends Base {
    private readonly p = parametros(sampleRate);
    private readonly estado = novaPorta();
    private readonly atraso: Float32Array;
    private readonly sobe = 1 / ((ABRIR_MS / 1000) * sampleRate);
    private readonly desce = 1 / ((SOLTAR_MS / 1000) * sampleRate);
    private pos = 0;
    private ganho = 0;
    private auto = true;
    private limiarManual: number = SENSIBILIDADE.padrao;
    private medir = false;
    private vivo = true;
    private quadros = 0;
    private picoDoIntervalo: number = SILENCIO_DB;
    private falaDoIntervalo: number | null = null;
    private corrida = 0;
    private maiorCorrida = 0;

    constructor() {
      super();
      this.atraso = new Float32Array(this.p.olhar * QUADRO);
      this.port.onmessage = (e: MessageEvent<MensagemPorta>) => this.configurar(e.data);
    }

    private configurar(m: MensagemPorta): void {
      if (typeof m.auto === "boolean") this.auto = m.auto;
      if (typeof m.limiarDb === "number" && Number.isFinite(m.limiarDb)) this.limiarManual = limitar(m.limiarDb);
      if (typeof m.medir === "boolean") this.medir = m.medir;
      if (m.fechar) this.vivo = false;
    }

    /** O som atrasado o tempo de olhar à frente, com o ganho subindo ou descendo devagar (sem estalo da porta). */
    private escrever(entrada: Float32Array | undefined, saida: Float32Array, aberta: boolean): void {
      const alvo = aberta ? 1 : 0;
      for (let i = 0; i < saida.length; i++) {
        const atrasada = this.atraso[this.pos] ?? 0;
        this.atraso[this.pos] = entrada?.[i] ?? 0;
        this.pos = (this.pos + 1) % this.atraso.length;
        this.ganho = alvo > this.ganho ? Math.min(alvo, this.ganho + this.sobe) : Math.max(alvo, this.ganho - this.desce);
        saida[i] = atrasada * this.ganho;
      }
    }

    private medirQuadro(nivel: number, limiar: number, aberta: boolean, fala: number | null, voz: boolean): void {
      this.corrida = voz ? this.corrida + 1 : 0;
      if (!this.medir) return;
      this.maiorCorrida = Math.max(this.maiorCorrida, this.corrida);
      this.picoDoIntervalo = Math.max(this.picoDoIntervalo, nivel);
      if (fala !== null) this.falaDoIntervalo = Math.max(this.falaDoIntervalo ?? 0, fala);
      if (++this.quadros < MEDIDA_QUADROS) return;
      const medida: MedidaPorta = { nivel: this.picoDoIntervalo, limiar, aberta, fala: this.falaDoIntervalo, corrida: this.maiorCorrida };
      this.port.postMessage(medida);
      this.quadros = 0;
      this.picoDoIntervalo = SILENCIO_DB;
      this.falaDoIntervalo = null;
      this.maiorCorrida = 0;
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
      const canais = outputs[0] ?? [];
      const saida = canais[0];
      if (!saida) return this.vivo;
      const entrada = inputs[0]?.[0];
      const nivel = entrada ? nivelDb(entrada) : SILENCIO_DB;
      if (this.auto) this.estado.fundo = seguirFundo(this.estado.fundo, nivel);
      const limiar = this.auto ? limiarAutomatico(this.estado.fundo) : this.limiarManual;
      const fala = this.auto ? falaDoRnnoise() : null;
      const { voz, segue } = vozNoQuadro(nivel, limiar, fala, this.p.histerese);
      const aberta = portaSempreAberta(limiar) || passoDaPorta(this.estado, voz, segue, this.p);
      this.escrever(entrada, saida, aberta);
      for (let c = 1; c < canais.length; c++) canais[c]?.set(saida);
      this.medirQuadro(nivel, limiar, aberta, fala, voz);
      return this.vivo;
    }
  }

  registerProcessor("porta-de-voz", PortaDeVoz);
}

registrar();
