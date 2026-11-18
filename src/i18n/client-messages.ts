// Textos que nenhum componente do navegador usa: ficam fora do pacote que o layout manda em toda
// página. client-messages.test.ts falha se um useTranslations passar a pedir um deles.

export const SERVER_ONLY_NAMESPACES = [
  "admin",
  "compendium",
  "conduta",
  "manifesto",
  "metodologia",
  "pgMisc",
  "pgProfile",
] as const;

const serverOnly = new Set<string>(SERVER_ONLY_NAMESPACES);

/** As mensagens do idioma sem os grupos que só o servidor lê. */
export function clientMessages<T extends Record<string, unknown>>(messages: T): Partial<T> {
  return Object.fromEntries(Object.entries(messages).filter(([namespace]) => !serverOnly.has(namespace))) as Partial<T>;
}
