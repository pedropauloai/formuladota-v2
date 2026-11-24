// A live abre e fecha sozinha (pedido do PPA: "Não é necessário eu iniciar a live no site"): abre no
// primeiro chamado para a party e fecha 3 horas depois da última atividade dela. Regra pura, testada
// sem banco; quem fecha é o cron do site.

/** Sem abertura, chamada ou partida registrada por 3 horas, a live terminou. */
export const IDLE_CLOSE_MS = 3 * 60 * 60 * 1000;

/** A última atividade da live (abertura, chamada ou partida) passou de 3 horas. Sem marcas, não fecha. */
export function liveIsIdle(activityIso: readonly (string | null | undefined)[], nowMs: number): boolean {
  const marks = activityIso.flatMap((t) => {
    const ms = t ? Date.parse(t) : Number.NaN;
    return Number.isFinite(ms) ? [ms] : [];
  });
  if (marks.length === 0) return false;
  return nowMs - Math.max(...marks) > IDLE_CLOSE_MS;
}
