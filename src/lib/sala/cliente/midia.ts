// Microfone e tela no navegador (spec, seção 12). A tela pede o áudio só da janela (Chrome 141+) e
// tira da captura o som que a própria sala toca (restrictOwnAudio), para ninguém ouvir eco de si.

import { captureConstraintsFor } from "../qualidade";
import type { Quality } from "../tipos";

type AudioCapture = MediaTrackConstraints & { restrictOwnAudio?: boolean };
type DisplayOptions = DisplayMediaStreamOptions & {
  audio: AudioCapture;
  systemAudio?: "include" | "exclude";
  windowAudio?: "exclude" | "system" | "window";
  selfBrowserSurface?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
};

export interface OpcoesMicrofone {
  /** deviceId do microfone escolhido; nulo é o padrão do sistema. */
  microfone: string | null;
  reducaoRuido: boolean;
}

async function abrirMicrofone(microfone: string | null, reducaoRuido: boolean): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { ...(microfone ? { deviceId: { exact: microfone } } : {}), echoCancellation: true, noiseSuppression: reducaoRuido, autoGainControl: true, channelCount: 1 },
    video: false,
  });
  const track = stream.getAudioTracks()[0];
  if (!track) throw new Error("sem microfone");
  return track;
}

/** Abre o microfone escolhido; se ele sumiu (desconectado), abre o padrão do sistema. */
export async function getMicTrack(o: OpcoesMicrofone = { microfone: null, reducaoRuido: true }): Promise<MediaStreamTrack> {
  if (!o.microfone) return abrirMicrofone(null, o.reducaoRuido);
  try {
    return await abrirMicrofone(o.microfone, o.reducaoRuido);
  } catch (e) {
    const nome = (e as { name?: string } | null)?.name;
    if (nome === "OverconstrainedError" || nome === "NotFoundError") return abrirMicrofone(null, o.reducaoRuido);
    throw e;
  }
}

type ComSaida = HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };

/** O navegador deixa escolher a saída de som (setSinkId: Chrome e Edge; o Safari e o Firefox, não). */
export function temEscolhaDeSaida(): boolean {
  return typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
}

/** Manda o som do elemento para a saída escolhida (nulo é a padrão); onde não há escolha, nada muda. */
export function aplicarSaida(el: HTMLMediaElement, saida: string | null): void {
  const comSaida = el as ComSaida;
  if (comSaida.setSinkId) comSaida.setSinkId(saida ?? "").catch(() => null);
}

export async function getScreenStream(quality: Quality): Promise<MediaStream> {
  const options: DisplayOptions = {
    video: captureConstraintsFor(quality),
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, restrictOwnAudio: true },
    systemAudio: "include",
    windowAudio: "window",
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
  };
  const stream = await navigator.mediaDevices.getDisplayMedia(options);
  const video = stream.getVideoTracks()[0];
  // Jogo em movimento: o "detail" (tela com texto) segurava a nitidez e derrubava a tela a 4 a 13 quadros.
  if (video) video.contentHint = "motion";
  return stream;
}

/** O que o navegador desta pessoa sabe fazer na captura, para a tela avisar quando faltar. */
export function captureSupport(): { restrictOwnAudio: boolean; screenShare: boolean } {
  const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (!media) return { restrictOwnAudio: false, screenShare: false };
  const supported = media.getSupportedConstraints() as Record<string, boolean | undefined>;
  return { restrictOwnAudio: supported.restrictOwnAudio === true, screenShare: typeof media.getDisplayMedia === "function" };
}
