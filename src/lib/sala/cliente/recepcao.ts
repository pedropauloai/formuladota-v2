// Faixas recebidas dos outros: a voz toca num elemento de áudio por pessoa, fora da página (continua
// ao navegar pelo site); a tela e o áudio da tela vão juntos para o vídeo do palco (som e imagem no
// mesmo relógio). A lista do estado manda: faixa nova é pedida, faixa que sumiu é solta. A tela vem na
// camada que a pessoa escolheu ("alta" ou "leve") e só enquanto a página da sala está aberta.

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
}

const keyOf = (f: { sessionId: string; trackName: string }) => `${f.sessionId}:${f.trackName}`;

export class Recepcao {
  private readonly recebidas = new Map<string, Recebida>();
  private volumeVoz = 1;
  private verTela = true;
  private ultimas: FaixaRemota[] = [];
  private soltando: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly conn: Connection,
    private layer: Layer,
    private readonly onTela: (stream: MediaStream | null, userId: string | null) => void,
    private readonly onVoz: (userId: string, track: MediaStreamTrack | null) => void,
    /** O navegador segurou o som (recarregar sem clique): a tela pede um clique para voltar a ouvir. */
    private readonly onBloqueio: (bloqueado: boolean) => void = () => undefined
  ) {}

  sync(faixas: FaixaRemota[]): void {
    this.ultimas = faixas;
    const wanted = new Map(faixas.filter((f) => this.verTela || f.tipo === "voz").map((f) => [keyOf(f), f]));
    for (const [key, r] of this.recebidas) if (!wanted.has(key)) this.drop(key, r);
    for (const [key, f] of wanted) if (!this.recebidas.has(key)) this.take(key, f);
  }

  private take(key: string, ref: FaixaRemota): void {
    const item: Recebida = { ref, rx: null, track: null, audio: null };
    this.recebidas.set(key, item);
    item.rx = this.conn.receive(
      ref,
      (track) => {
        item.track = track;
        if (ref.tipo === "voz") {
          item.audio = this.tocar(item.audio, track);
          this.onVoz(ref.userId, track);
        } else {
          this.publishScreen();
        }
      },
      ref.tipo === "tela" ? this.layer : undefined
    );
  }

  private drop(key: string, r: Recebida): void {
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

  /** "Alta" ou "leve": vale para a tela que chega agora e para as próximas. */
  setLayer(rid: Layer): void {
    this.layer = rid;
    for (const r of this.recebidas.values()) if (r.ref.tipo === "tela") r.rx?.setLayer(rid);
  }

  /** Fora da página da sala, só as vozes: a tela e o som dela param de chegar (sem custo de quem não
   *  está vendo) e voltam quando a página abre de novo. Soltar pode esperar `esperaMs`: a página que
   *  remonta na hora, ou a volta rápida, não pede a mesma tela duas vezes no mesmo pedido. */
  setVerTela(ver: boolean, esperaMs = 0): void {
    if (this.soltando !== null) clearTimeout(this.soltando);
    this.soltando = null;
    if (!ver && esperaMs > 0) {
      this.soltando = setTimeout(() => this.aplicarVerTela(false), esperaMs);
      return;
    }
    this.aplicarVerTela(ver);
  }

  private aplicarVerTela(ver: boolean): void {
    this.soltando = null;
    if (this.verTela === ver) return;
    this.verTela = ver;
    this.sync(this.ultimas);
  }

  /** Depois de um clique da pessoa: toca de novo as vozes que o navegador segurou. */
  retomarAudio(): void {
    for (const r of this.recebidas.values()) if (r.audio) void this.play(r.audio);
  }

  private tocar(current: HTMLAudioElement | null, track: MediaStreamTrack): HTMLAudioElement {
    const el = current ?? new Audio();
    el.autoplay = true;
    el.volume = this.volumeVoz;
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

  setVoiceVolume(volume: number): void {
    this.volumeVoz = volume;
    for (const r of this.recebidas.values()) if (r.audio) r.audio.volume = volume;
  }

  clear(): void {
    if (this.soltando !== null) clearTimeout(this.soltando);
    this.soltando = null;
    for (const [key, r] of this.recebidas) this.drop(key, r);
  }
}
