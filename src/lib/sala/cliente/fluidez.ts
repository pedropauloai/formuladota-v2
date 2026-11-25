// Proteção de quem assiste com conexão fraca: a tela vem na camada alta e, se congela de novo e de novo
// (a banda não dá), desce para a leve por um tempo e tenta a alta de novo depois, esperando mais a cada
// queda logo depois de voltar. Um congelamento sozinho não muda nada. Lida a cada medida da getStats (5 s).

import type { Layer } from "../tipos";

export interface Fluidez {
  camada: Layer;
  /** Desde quando está na camada de agora. */
  desde: number;
  /** Quanto fica na leve antes de tentar a alta de novo. */
  esperaMs: number;
  /** Horários das leituras recentes na alta que tiveram congelamento. */
  congelou: number[];
  /** Quando voltou da leve para a alta (para saber se caiu logo depois). */
  voltouEm: number | null;
}

export const ESPERA_INICIAL_MS = 60_000;
export const ESPERA_MAX_MS = 300_000;
const JANELA_MS = 20_000;
const ESTAVEL_MS = 120_000;

export function fluidezInicial(agora: number): Fluidez {
  return { camada: "f", desde: agora, esperaMs: ESPERA_INICIAL_MS, congelou: [], voltouEm: null };
}

export function proximaFluidez(f: Fluidez, congelouMs: number, agora: number): Fluidez {
  if (f.camada === "h") {
    if (agora - f.desde < f.esperaMs) return f;
    return { ...f, camada: "f", desde: agora, congelou: [], voltouEm: agora };
  }
  const congelou = [...f.congelou.filter((t) => agora - t < JANELA_MS), ...(congelouMs > 0 ? [agora] : [])];
  if (congelou.length < 2) return { ...f, congelou };
  const caiuLogo = f.voltouEm !== null && agora - f.voltouEm < ESTAVEL_MS;
  const esperaMs = caiuLogo ? Math.min(ESPERA_MAX_MS, f.esperaMs * 2) : ESPERA_INICIAL_MS;
  return { camada: "h", desde: agora, esperaMs, congelou: [], voltouEm: null };
}
