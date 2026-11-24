// O chat guardado no navegador: cada consulta traz só as mensagens novas e as apagadas pelo dono.

import type { MensagemEstado } from "../estado";

/** Junta as novas, tira as apagadas e guarda as últimas `keep`; sem novidade, devolve a mesma lista.
 *  Com `resync` (depois de um tempo sem conexão), recomeça do que o servidor mandou. */
export function juntarChat(base: MensagemEstado[], novas: MensagemEstado[], apagadas: number[], resync: boolean, keep: number): MensagemEstado[] {
  const gone = new Set(apagadas);
  const atual = resync ? [] : base;
  if (!resync && novas.length === 0 && !atual.some((m) => gone.has(m.id))) return base;
  const byId = new Map(atual.map((m) => [m.id, m]));
  for (const m of novas) byId.set(m.id, m);
  return [...byId.values()].filter((m) => !gone.has(m.id)).sort((x, y) => x.id - y.id).slice(-keep);
}
