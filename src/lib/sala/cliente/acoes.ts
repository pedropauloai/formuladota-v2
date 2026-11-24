// Chamadas do navegador às rotas da sala (entrar, estado, nomes, rótulo, chat, moderação e sair).

import type { Estado } from "../estado";
import type { Pessoa } from "../pessoas";
import type { MemberRole, Quality, RoomKind, TrackLabel } from "../tipos";

export type Resposta<T> = { ok: true; data: T } | { ok: false; code: string };

export async function postJson<T>(url: string, body?: unknown): Promise<Resposta<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as T & { errorCode?: string };
    if (!res.ok) return { ok: false, code: data.errorCode ?? `http_${res.status}` };
    return { ok: true, data };
  } catch {
    return { ok: false, code: "sem_rede" };
  }
}

export interface Entrada {
  iceServers: RTCIceServer[];
  papel: MemberRole;
  tipo: RoomKind;
  videoMaxKbps: number;
  podeCompartilharTela: boolean;
}

export interface Batimento {
  muted: boolean;
  hand: boolean;
  metricas?: unknown;
}

export type AcaoDono = "falar" | "ouvir" | "mutar" | "liberar" | "expulsar" | "banir";
export type AlvoDenuncia = { userId: string } | { messageId: number };

export const api = (roomId: string) => {
  const base = `/api/sala/${roomId}`;
  return {
    entrar: () => postJson<Entrada>(`${base}/entrar`),
    estado: (body: { sessionId: string | null; chatAfter: number; beat?: Batimento }) => postJson<Estado>(`${base}/estado`, body),
    pessoas: (ids: string[]) => postJson<Record<string, Pessoa>>(`${base}/pessoas`, { ids }),
    rotular: (sessionId: string, trackName: string, tipo: TrackLabel, qualidade: Quality | null) =>
      postJson<{ ok: true }>(`${base}/faixas`, { sessionId, trackName, tipo, qualidade }),
    chat: (texto: string) => postJson<{ ok: true; id: number }>(`${base}/chat`, { texto }),
    apagarMensagem: (id: number) => postJson<{ ok: true }>(`${base}/chat/${id}/apagar`),
    abrirChat: (aberto: boolean) => postJson<{ ok: true }>(`${base}/chat/abrir`, { aberto }),
    membro: (userId: string, acao: AcaoDono, motivo = "") => postJson<{ ok: true }>(`${base}/membros/${userId}/${acao}`, { motivo }),
    bloquear: (userId: string) => postJson<{ ok: true }>(`${base}/bloqueios`, { userId }),
    denunciar: (alvo: AlvoDenuncia, motivo: string, detalhes: string) => postJson<{ ok: true }>(`${base}/denuncias`, { ...alvo, motivo, detalhes }),
    convite: (token: string) => postJson<{ ok: true }>(`${base}/convite`, { token }),
    /** Ao fechar a aba, o sendBeacon entrega mesmo com a página indo embora. */
    sairNoFechamento: () => {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) navigator.sendBeacon(`${base}/sair`);
    },
    sair: () => postJson<null>(`${base}/sair`),
  };
};
