// Quando o cron renova cada parte do meta: depois do intervalo dela; com falha, tenta de novo a cada 10
// minutos (o refreshed_at só muda quando dá certo). Lógica pura, a mesma regra do /meta de hoje.

export type RefreshResult = "fresco" | "aguardando" | "renovado";

export const PUBLIC_EVERY_MS = 6 * 60 * 60 * 1000;
export const PRO_EVERY_MS = 60 * 60 * 1000;
const RETRY_EVERY_MINUTES = 10;

/** "fresco" ou "aguardando" quando ainda não é hora; null quando é para buscar agora. */
export function refreshDecision(refreshedAt: string | null, everyMs: number, now: Date): Exclude<RefreshResult, "renovado"> | null {
  if (refreshedAt === null) return null;
  if (now.getTime() - new Date(refreshedAt).getTime() < everyMs) return "fresco";
  if (now.getUTCMinutes() % RETRY_EVERY_MINUTES !== 0) return "aguardando";
  return null;
}
