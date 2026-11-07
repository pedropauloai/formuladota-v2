// Leitura dos textos do catálogo (markdown mínimo do banco): as linhas "- " viram itens.

/** Itens de lista ("- texto") de um markdown, na ordem. */
export function mdBullets(md: string): string[] {
  return md
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.match(/^\s*[-*]\s+(.*\S)\s*$/)?.[1])
    .filter((item): item is string => Boolean(item));
}
