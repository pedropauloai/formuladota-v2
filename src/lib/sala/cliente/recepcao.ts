// Faixas recebidas dos outros: a voz toca num elemento de áudio por pessoa; a tela e o áudio da tela
// vão juntos para o vídeo do palco (som e imagem no mesmo relógio). A lista do batimento manda:
// faixa nova é pedida, faixa que sumiu é solta.

import type { Connection } from "./conexao";
import type { TrackLabel } from "../tipos";

export interface FaixaRemota {
  sessionId: string;
  trackName: string;
  tipo: TrackLabel;
  userId: string;
}

interface Recebida {
  ref: FaixaRemota;
  stop: () => void;
  track: MediaStreamTrack | null;
  audio: HTMLAudioElement | null;
}

const keyOf = (f: { sessionId: string; trackName: string }) => `${f.sessionId}:${f.trackName}`;

export class Recepcao {
  private readonly recebidas = new Map<string, Recebida>();
  private volumeVoz = 1;

  constructor(
    private readonly conn: Connection,
    private readonly onTela: (stream: MediaStream | null, userId: string | null) => void,
    private readonly onVoz: (userId: string, track: MediaStreamTrack | null) => void
  ) {}

  sync(faixas: FaixaRemota[]): void {
    const wanted = new Map(faixas.map((f) => [keyOf(f), f]));
    for (const [key, r] of this.recebidas) if (!wanted.has(key)) this.drop(key, r);
    for (const [key, f] of wanted) if (!this.recebidas.has(key)) this.take(key, f);
  }

  private take(key: string, ref: FaixaRemota): void {
    const item: Recebida = { ref, track: null, audio: null, stop: () => undefined };
    this.recebidas.set(key, item);
    item.stop = this.conn.receive(ref, (track) => {
      item.track = track;
      if (ref.tipo === "voz") {
        item.audio = playVoice(item.audio, track, this.volumeVoz);
        this.onVoz(ref.userId, track);
      } else {
        this.publishScreen();
      }
    });
  }

  private drop(key: string, r: Recebida): void {
    r.stop();
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

  setVoiceVolume(volume: number): void {
    this.volumeVoz = volume;
    for (const r of this.recebidas.values()) if (r.audio) r.audio.volume = volume;
  }

  clear(): void {
    for (const [key, r] of this.recebidas) this.drop(key, r);
  }
}

function playVoice(current: HTMLAudioElement | null, track: MediaStreamTrack, volume: number): HTMLAudioElement {
  const el = current ?? new Audio();
  el.autoplay = true;
  el.volume = volume;
  el.srcObject = new MediaStream([track]);
  el.play().catch(() => null);
  return el;
}
