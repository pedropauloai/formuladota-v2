// Chamadas do navegador às rotas da sala (entrar, batimento, rótulo, sair e moderação).

import type { Estado } from "../estado";
import type { TrackLabel } from "../tipos";

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
  papel: "dono" | "membro";
  videoMaxKbps: number;
  podeCompartilharTela: boolean;
}

export const api = (roomId: string) => {
  const base = `/api/sala/${roomId}`;
  return {
    entrar: () => postJson<Entrada>(`${base}/entrar`),
    estado: (body: { muted: boolean; sessionId: string | null; metricas?: unknown }) => postJson<Estado>(`${base}/estado`, body),
    rotular: (sessionId: string, trackName: string, tipo: TrackLabel) => postJson<{ ok: true }>(`${base}/faixas`, { sessionId, trackName, tipo }),
    expulsar: (userId: string) => postJson<{ ok: true }>(`${base}/membros/${userId}/expulsar`),
    bloquear: (userId: string) => postJson<{ ok: true }>(`${base}/bloqueios`, { userId }),
    denunciar: (userId: string, motivo: string, detalhes: string) => postJson<{ ok: true }>(`${base}/denuncias`, { userId, motivo, detalhes }),
    convite: (token: string) => postJson<{ ok: true }>(`${base}/convite`, { token }),
    /** Ao fechar a aba, o sendBeacon entrega mesmo com a página indo embora. */
    sairNoFechamento: () => {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) navigator.sendBeacon(`${base}/sair`);
    },
    sair: () => postJson<null>(`${base}/sair`),
  };
};
