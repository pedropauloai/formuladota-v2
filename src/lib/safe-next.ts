// Destino de volta (?next=) seguro: só caminho interno do site, nunca outro domínio. Usado na volta
// da vinculação da Steam (a fila da party manda a pessoa vincular e quer ela de volta na fila).

const INTERNAL_PATH = /^\/(?![/\\])[A-Za-z0-9\-._~/?=&%]*$/;

export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 200) return null;
  return INTERNAL_PATH.test(value) ? value : null;
}
