// Compartilhar a tela na qualidade escolhida: captura com a resolução e os quadros dela, sobe o vídeo
// em duas camadas (simulcast, limitadas pelo teto da configuração) e o áudio da janela junto.

import { encodingsFor } from "../qualidade";
import type { Quality, TrackLabel } from "../tipos";
import type { Connection, TrackRef } from "./conexao";
import { getScreenStream } from "./midia";

export interface TelaNoAr {
  stream: MediaStream;
  parar: () => void;
}

export async function compartilhar(opts: {
  conn: Connection;
  qualidade: Quality;
  videoMaxKbps: number;
  rotular: (ref: TrackRef, tipo: TrackLabel, qualidade: Quality | null) => void;
  onFim: () => void;
}): Promise<TelaNoAr | null> {
  let stream: MediaStream;
  try {
    stream = await getScreenStream(opts.qualidade);
  } catch {
    return null;
  }
  const [video] = stream.getVideoTracks();
  const [audio] = stream.getAudioTracks();
  if (!video) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }
  video.addEventListener("ended", opts.onFim);
  const teto = opts.videoMaxKbps * 1000;
  const camadas = encodingsFor(opts.qualidade).map((e) => ({ ...e, maxBitrate: Math.min(e.maxBitrate, teto) }));
  const stops = [opts.conn.publish(video, camadas, (ref) => opts.rotular(ref, "tela", opts.qualidade))];
  if (audio) stops.push(opts.conn.publish(audio, [{ maxBitrate: 128_000 }], (ref) => opts.rotular(ref, "tela_audio", null)));
  return {
    stream,
    parar: () => {
      stops.forEach((stop) => stop());
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
