// Helpers de formatação do painel admin de PROs — funções puras, client-safe.
// nowMs vem de um relógio compartilhado (state com tick) pra evitar
// Date.now() impuro em contexto de render.

/** Minutos inteiros desde um ISO timestamp. */
export function minutesSince(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000));
}

/** Idade compacta pra listas densas: "32min" | "1h05" | "2d". */
export function formatAge(iso: string, nowMs: number): string {
  const min = minutesSince(iso, nowMs);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d`;
}

/** Cronômetro "M:SS" ou "H:MM:SS" desde startedAt (mesmo formato do cockpit). */
export function formatElapsed(startedAt: string, nowMs: number): string {
  const total = Math.max(
    0,
    Math.floor((nowMs - new Date(startedAt).getTime()) / 1000)
  );
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "R$ 76,50" sem o prefixo (caller decide onde colocar o "R$"). */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

/** Data curta "11/06 21:45" pro histórico denso. */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
