// A ligação da sala com o SFU: a conexão, o nível de voz, a voz local e a recepção, montadas juntas na
// entrada e desmontadas juntas na saída, ou quando a ligação trava e a sessão a refaz por baixo.

import type { Layer } from "../tipos";
import type { Entrada } from "./acoes";
import { createConnection, type Connection, type TrackRef } from "./conexao";
import { NivelDeVoz } from "./nivel-voz";
import { Recepcao } from "./recepcao";
import { VozLocal } from "./voz-local";

export interface Ligacao {
  conn: Connection;
  nivel: NivelDeVoz;
  voz: VozLocal;
  recepcao: Recepcao;
}

export function montarLigacao(o: {
  roomId: string;
  entrada: Entrada;
  camada: Layer;
  foraDaSala: boolean;
  /** Volume de cada pessoa guardado neste navegador. */
  volumes: Record<string, number>;
  /** Som desligado (ensurdecer), que vale também na ligação refeita. */
  surdo: boolean;
  rotularVoz: (ref: TrackRef) => void;
  onTela: (stream: MediaStream | null, userId: string | null) => void;
  onBloqueio: (bloqueado: boolean) => void;
  onTravou: () => void;
}): Ligacao {
  const nivel = new NivelDeVoz();
  const conn = createConnection({ roomId: o.roomId, iceServers: o.entrada.iceServers });
  const voz = new VozLocal(conn, nivel, o.rotularVoz);
  const recepcao = new Recepcao(conn, o.camada, o.onTela, (userId, track) => nivel.watch(userId, track), o.onBloqueio, o.onTravou);
  recepcao.setForaDaSala(o.foraDaSala);
  recepcao.setSurdo(o.surdo);
  for (const [userId, volume] of Object.entries(o.volumes)) recepcao.setVolumeDe(userId, volume);
  // Conexão que o navegador deu por perdida (a rede caiu e não voltou): a sessão refaz.
  conn.onState((estado) => {
    if (estado === "failed") o.onTravou();
  });
  return { conn, nivel, voz, recepcao };
}

/** Quem está falando agora pelo nível de voz ("eu" vira o id da pessoa; mudo não conta como fala). */
export function quemFala(l: Ligacao | null, eu: string | null, mutado: boolean): string[] {
  return (l?.nivel.speaking() ?? []).map((id) => (id === "eu" ? eu : id)).filter((id): id is string => !!id && !(mutado && id === eu));
}

export function desmontarLigacao(l: Ligacao): void {
  l.voz.desligar();
  l.recepcao.clear();
  l.conn.close();
  l.nivel.close();
}
