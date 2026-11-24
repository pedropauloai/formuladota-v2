// Volume de cada pessoa da sala (0 a 1), guardado neste navegador, como no Discord: quem baixou o volume
// de alguém continua com ele baixo na próxima vez. Sem armazenamento (aba anônima), vale só nesta visita.

const CHAVE = "formuladota:volumes";

export function volumesGuardados(): Record<string, number> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? "{}");
    if (!v || typeof v !== "object") return {};
    return Object.fromEntries(Object.entries(v).filter(([, n]) => typeof n === "number" && n >= 0 && n <= 1)) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Guarda o volume da pessoa e devolve todos; o volume cheio (1) sai da lista. */
export function guardarVolume(userId: string, volume: number): Record<string, number> {
  const todos = { ...volumesGuardados() };
  const v = Math.min(1, Math.max(0, volume));
  if (v === 1) delete todos[userId];
  else todos[userId] = v;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(todos));
  } catch {
    // Sem armazenamento: o volume vale só nesta visita.
  }
  return todos;
}
