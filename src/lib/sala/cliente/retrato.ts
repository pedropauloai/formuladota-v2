// O retrato da sessão da sala que a tela lê (useSyncExternalStore): fase, estado do servidor, voz,
// mão, tela, chat, nomes e as medidas que o e2e confere.

import type { Estado, MensagemEstado } from "../estado";
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
  semMicrofone: boolean;
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
}

export const SNAPSHOT_INICIAL: SessaoSnapshot = {
  fase: "inicial", motivo: null, estado: null, papel: null, tipo: null, mutado: false, mao: false, vozNoAr: false,
  semMicrofone: false, compartilhando: false, qualidadeTela: null, camada: "f", minhaTela: null, tela: null, telaDe: null,
  falando: [], qualidade: null, chat: [], pessoas: {}, medidas: { audioBytes: 0, videoBytes: 0, videoAltura: null },
};
