// Compartilhar a tela na qualidade escolhida: captura com a resolução e os quadros dela, sobe o vídeo
// em duas camadas (simulcast, limitadas pelo teto da configuração) e o áudio da janela junto. Trocar a
// janela põe a captura nova na mesma publicação: a plateia segue recebendo a mesma faixa, sem renegociar
// (pedir faixa nova no meio da conexão às vezes derruba a sessão de quem assiste no SFU).

import { encodingsFor } from "../qualidade";
import type { Quality, TrackLabel } from "../tipos";
import type { Connection, Publicacao, TrackRef } from "./conexao";
import { getScreenStream } from "./midia";

export interface TelaNoAr {
  stream: MediaStream;
  parar: () => void;
  /** Escolhe outra janela e põe na mesma publicação; false se a pessoa cancelou a escolha. */
  trocar: () => Promise<boolean>;
}

interface Captura {
  stream: MediaStream;
  video: MediaStreamTrack;
  audio: MediaStreamTrack | null;
}

async function capturar(qualidade: Quality): Promise<Captura | null> {
  let stream: MediaStream;
  try {
    stream = await getScreenStream(qualidade);
  } catch {
    return null;
  }
  const [video] = stream.getVideoTracks();
  if (!video) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }
  return { stream, video, audio: stream.getAudioTracks()[0] ?? null };
}

export async function compartilhar(opts: {
  conn: Connection;
  qualidade: Quality;
  videoMaxKbps: number;
  rotular: (ref: TrackRef, tipo: TrackLabel, qualidade: Quality | null) => void;
  onFim: () => void;
}): Promise<TelaNoAr | null> {
  const primeira = await capturar(opts.qualidade);
  if (!primeira) return null;
  let atual = primeira;
  atual.video.addEventListener("ended", opts.onFim);
  const teto = opts.videoMaxKbps * 1000;
  const camadas = encodingsFor(opts.qualidade).map((e) => ({ ...e, maxBitrate: Math.min(e.maxBitrate, teto) }));
  const publicarSom = (audio: MediaStreamTrack) => opts.conn.publishTrocavel(audio, [{ maxBitrate: 128_000 }], (ref) => opts.rotular(ref, "tela_audio", null));
  const video = opts.conn.publishTrocavel(atual.video, camadas, (ref) => opts.rotular(ref, "tela", opts.qualidade));
  let som: Publicacao | null = atual.audio ? publicarSom(atual.audio) : null;
  const tela: TelaNoAr = {
    stream: atual.stream,
    parar: () => {
      video.parar();
      som?.parar();
      atual.stream.getTracks().forEach((t) => t.stop());
    },
    trocar: async () => {
      const nova = await capturar(opts.qualidade);
      if (!nova) return false;
      atual.video.removeEventListener("ended", opts.onFim);
      nova.video.addEventListener("ended", opts.onFim);
      video.trocar(nova.video);
      if (nova.audio && som) som.trocar(nova.audio);
      else if (nova.audio) som = publicarSom(nova.audio);
      else if (som) {
        som.parar();
        som = null;
      }
      atual.stream.getTracks().forEach((t) => t.stop());
      atual = nova;
      tela.stream = nova.stream;
      return true;
    },
  };
  return tela;
}
