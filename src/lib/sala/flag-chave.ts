// Qual linha da tabela de flags liga a sala. Produção lê sempre a sala_voz; só o servidor local de
// desenvolvimento (o do e2e) pode apontar outra linha por SALA_FLAG_KEY, para o teste não pôr a aba da
// sala na barra de todo mundo.

export const SALA_FLAG = "sala_voz";

export function salaFlagKey(env: { NODE_ENV?: string; SALA_FLAG_KEY?: string }): string {
  if (env.NODE_ENV !== "development") return SALA_FLAG;
  const key = env.SALA_FLAG_KEY?.trim() ?? "";
  return /^sala_voz_[a-z0-9_]{1,40}$/.test(key) ? key : SALA_FLAG;
}

/** Os canais de teste (`is_test`) só aparecem no servidor local do e2e, o mesmo que lê a linha de teste da flag. */
export function canaisDeTeste(env: { NODE_ENV?: string; SALA_FLAG_KEY?: string }): boolean {
  return salaFlagKey(env) !== SALA_FLAG;
}
