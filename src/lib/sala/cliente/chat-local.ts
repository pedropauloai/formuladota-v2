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

/** Até onde o servidor já mandou o chat: anda só com o que veio dele. A mensagem que a pessoa acabou de
 *  mandar entra na lista na hora, mas não move o cursor, senão a de outra pessoa gravada um instante
 *  antes (e ainda não recebida) nunca mais chegaria. */
export function cursorDoChat(cursor: number, novas: MensagemEstado[]): number {
  return novas.reduce((max, m) => Math.max(max, m.id), cursor);
}
