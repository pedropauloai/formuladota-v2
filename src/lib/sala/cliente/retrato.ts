// O retrato da sessão da sala que a tela lê (useSyncExternalStore): fase, estado do servidor, voz,
// mão, tela, chat, nomes e as medidas que o e2e confere.

import type { Estado, MensagemEstado } from "../estado";
import type { EstadoMicrofone } from "./microfone";
import type { StatsSummary } from "../metricas";
import type { Pessoa } from "../pessoas";
import type { Layer, MemberRole, Quality, RoomKind } from "../tipos";

export type Fase = "inicial" | "entrando" | "na_sala" | "saiu" | "erro";

export interface SessaoSnapshot {
  fase: Fase;
  motivo: string | null;
  estado: Estado | null;
  papel: MemberRole | null;
  tipo: RoomKind | null;
  mutado: boolean;
  mao: boolean;
  vozNoAr: boolean;
  /** Como está o microfone de quem pode falar (abrindo, pedindo a permissão, negado, sem aparelho). */
  microfone: EstadoMicrofone;
  compartilhando: boolean;
  qualidadeTela: Quality | null;
  camada: Layer;
  minhaTela: MediaStream | null;
  tela: MediaStream | null;
  telaDe: string | null;
  falando: string[];
  qualidade: StatsSummary | null;
  chat: MensagemEstado[];
  pessoas: Record<string, Pessoa>;
  medidas: { audioBytes: number; videoBytes: number; videoAltura: number | null };
  /** O navegador segurou o som (recarregar sem clique): falta um clique para voltar a ouvir. */
  audioBloqueado: boolean;
  /** A ligação travou e a sessão a refaz por baixo (2 ou 3 s). */
  reconectando: boolean;
  /** Volume de cada pessoa (0 a 1) escolhido neste navegador; quem não está aqui está em 100%. */
  volumes: Record<string, number>;
  /** Som desligado (ensurdecer): não ouve as vozes nem a tela, e o microfone fica mudo. */
  surdo: boolean;
}

export const SNAPSHOT_INICIAL: SessaoSnapshot = {
  fase: "inicial", motivo: null, estado: null, papel: null, tipo: null, mutado: false, mao: false, vozNoAr: false,
  microfone: "ok", compartilhando: false, qualidadeTela: null, camada: "f", minhaTela: null, tela: null, telaDe: null,
  falando: [], qualidade: null, chat: [], pessoas: {}, medidas: { audioBytes: 0, videoBytes: 0, videoAltura: null },
  audioBloqueado: false,
  reconectando: false,
  volumes: {},
  surdo: false,
};
