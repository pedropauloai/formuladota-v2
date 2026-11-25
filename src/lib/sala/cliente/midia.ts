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

export async function getMicTrack(): Promise<MediaStreamTrack> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    video: false,
  });
  const track = stream.getAudioTracks()[0];
  if (!track) throw new Error("sem microfone");
  return track;
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
