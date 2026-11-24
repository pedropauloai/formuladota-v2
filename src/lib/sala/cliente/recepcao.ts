// Faixas recebidas dos outros: a voz toca num elemento de áudio por pessoa, fora da página (continua
// ao navegar pelo site); a tela e o áudio da tela vão juntos para o vídeo do palco (som e imagem no
// mesmo relógio). A lista do estado manda: faixa nova é pedida, faixa que sumiu é solta. A tela vem na
// camada que a pessoa escolheu ("alta" ou "leve"); fora da página da sala, na leve.

import type { Connection, Recebimento } from "./conexao";
import type { Layer, TrackLabel } from "../tipos";

export interface FaixaRemota {
  sessionId: string;
  trackName: string;
  tipo: TrackLabel;
  userId: string;
}

interface Recebida {
  ref: FaixaRemota;
  rx: Recebimento | null;
  track: MediaStreamTrack | null;
  audio: HTMLAudioElement | null;
  espera: ReturnType<typeof setTimeout> | null;
  tentativa: number;
}

// Faixa pedida que não chega nesse tempo (o servidor ou a Cloudflare falharam no meio): pede de novo.
const ESPERA_FAIXA_MS = 8_000;

const keyOf = (f: { sessionId: string; trackName: string }) => `${f.sessionId}:${f.trackName}`;

export class Recepcao {
  private readonly recebidas = new Map<string, Recebida>();
  private volumeVoz = 1;
  private readonly volumes = new Map<string, number>();
  private fora = false;
  /** Som desligado (ensurdecer): as vozes seguem chegando, caladas. */
  private surdo = false;
  private saindo: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly conn: Connection,
    private layer: Layer,
    private readonly onTela: (stream: MediaStream | null, userId: string | null) => void,
    private readonly onVoz: (userId: string, track: MediaStreamTrack | null) => void,
    /** O navegador segurou o som (recarregar sem clique): a tela pede um clique para voltar a ouvir. */
    private readonly onBloqueio: (bloqueado: boolean) => void = () => undefined,
    /** Faixa que não chegou nem na segunda tentativa: a ligação com o SFU travou e a sessão a refaz. */
    private readonly onTravou: () => void = () => undefined
  ) {}

  sync(faixas: FaixaRemota[]): void {
    const wanted = new Map(faixas.map((f) => [keyOf(f), f]));
    for (const [key, r] of this.recebidas) if (!wanted.has(key)) this.drop(key, r);
    for (const [key, f] of wanted) if (!this.recebidas.has(key)) this.take(key, f);
  }

  private take(key: string, ref: FaixaRemota, tentativa = 0): void {
    const item: Recebida = { ref, rx: null, track: null, audio: null, espera: null, tentativa };
    this.recebidas.set(key, item);
    item.rx = this.conn.receive(
      ref,
      (track) => {
        if (item.espera !== null) clearTimeout(item.espera);
        item.espera = null;
        item.track = track;
        if (ref.tipo === "voz") {
          item.audio = this.tocar(item.audio, track, ref.userId);
          this.onVoz(ref.userId, track);
        } else {
          this.publishScreen();
        }
      },
      ref.tipo === "tela" ? this.camada() : undefined
    );
    item.espera = setTimeout(() => this.repetir(key, item), ESPERA_FAIXA_MS);
  }

  /** A faixa não chegou: solta o pedido e pede de novo (sem avisar a tela, que nunca a teve). */
  private repetir(key: string, item: Recebida): void {
    item.espera = null;
    if (this.recebidas.get(key) !== item || item.track) return;
    if (item.tentativa >= 1) return this.onTravou();
    item.rx?.stop();
    this.recebidas.delete(key);
    this.take(key, item.ref, item.tentativa + 1);
  }

  private drop(key: string, r: Recebida): void {
    if (r.espera !== null) clearTimeout(r.espera);
    r.espera = null;
    r.rx?.stop();
    if (r.audio) {
      r.audio.pause();
      r.audio.srcObject = null;
    }
    this.recebidas.delete(key);
    if (r.ref.tipo === "voz") this.onVoz(r.ref.userId, null);
    else this.publishScreen();
  }

  private publishScreen(): void {
    const tela = [...this.recebidas.values()].filter((r) => r.ref.tipo !== "voz" && r.track);
    const video = tela.find((r) => r.ref.tipo === "tela");
    if (!video?.track) return this.onTela(null, null);
    const tracks = tela.filter((r) => r.ref.userId === video.ref.userId).map((r) => r.track as MediaStreamTrack);
    this.onTela(new MediaStream(tracks), video.ref.userId);
  }

  /** A camada que vale agora: fora da página da sala, a leve; na página, a que a pessoa escolheu. */
  private camada(): Layer {
    return this.fora ? "h" : this.layer;
  }

  private aplicarCamada(): void {
    const rid = this.camada();
    for (const r of this.recebidas.values()) if (r.ref.tipo === "tela") r.rx?.setLayer(rid);
  }

  /** "Alta" ou "leve": vale para a tela que chega agora e para as próximas (fora da sala, ao voltar). */
  setLayer(rid: Layer): void {
    this.layer = rid;
    this.aplicarCamada();
  }

  /** Fora da página da sala ninguém vê a tela: ela segue chegando, na camada leve (custo menor), e volta
   *  à escolhida ao abrir a sala. Não solta nem pede a faixa de novo: criar faixa no meio da conexão às
   *  vezes quebra a renegociação no Chrome. Sair pode esperar `esperaMs` (a página que remonta na hora,
   *  ou a volta rápida, não troca a camada à toa). */
  setForaDaSala(fora: boolean, esperaMs = 0): void {
    if (this.saindo !== null) clearTimeout(this.saindo);
    this.saindo = null;
    if (fora && esperaMs > 0) {
      this.saindo = setTimeout(() => this.aplicarFora(true), esperaMs);
      return;
    }
    this.aplicarFora(fora);
  }

  private aplicarFora(fora: boolean): void {
    this.saindo = null;
    if (this.fora === fora) return;
    this.fora = fora;
    this.aplicarCamada();
  }

  /** Depois de um clique da pessoa: toca de novo as vozes que o navegador segurou. */
  retomarAudio(): void {
    for (const r of this.recebidas.values()) if (r.audio) void this.play(r.audio);
  }

  private tocar(current: HTMLAudioElement | null, track: MediaStreamTrack, userId: string): HTMLAudioElement {
    const el = current ?? new Audio();
    el.autoplay = true;
    el.volume = this.volumeDe(userId);
    el.muted = this.surdo;
    el.srcObject = new MediaStream([track]);
    void this.play(el);
    return el;
  }

  private async play(el: HTMLAudioElement): Promise<void> {
    try {
      await el.play();
      this.onBloqueio(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotAllowedError") this.onBloqueio(true);
    }
  }

  setSurdo(surdo: boolean): void {
    this.surdo = surdo;
    for (const r of this.recebidas.values()) if (r.audio) r.audio.muted = surdo;
  }

  setVoiceVolume(volume: number): void {
    this.volumeVoz = volume;
    for (const r of this.recebidas.values()) if (r.audio) r.audio.volume = this.volumeDe(r.ref.userId);
  }

  /** Volume de uma pessoa (0 a 1), por cima do volume geral das vozes; vale também para a voz que ainda vai chegar. */
  setVolumeDe(userId: string, volume: number): void {
    this.volumes.set(userId, volume);
    for (const r of this.recebidas.values()) if (r.audio && r.ref.userId === userId) r.audio.volume = this.volumeDe(userId);
  }

  private volumeDe(userId: string): number {
    return this.volumeVoz * (this.volumes.get(userId) ?? 1);
  }

  clear(): void {
    if (this.saindo !== null) clearTimeout(this.saindo);
    this.saindo = null;
    for (const [key, r] of this.recebidas) this.drop(key, r);
  }
}
