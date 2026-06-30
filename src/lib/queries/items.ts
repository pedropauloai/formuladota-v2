// Helper tipado de lookup do catálogo estático de itens Dota.
// Bundle JSON em src/data/dota-items.json — gerado via `pnpm gen:items`.
// Per mesma decisão dos heróis (D-23): sem fetch live, tudo resolvido em bundle time.

import itemsData from "@/data/dota-items.json";

const CDN = "https://cdn.cloudflare.steamstatic.com";

export interface ItemData {
  /** Nome de exibição (ex: "Blink Dagger"). */
  dname: string;
  /** Path relativo do ícone no CDN Valve. */
  img: string;
}

// Mapa id(string) → { dname, img }. id 0 (ou ausente) = slot vazio.
const ITEMS = itemsData as Record<string, ItemData>;

/**
 * Retorna o item pelo id numérico Valve, ou null pra slot vazio/desconhecido.
 */
export function getItemById(id: number | null | undefined): ItemData | null {
  if (!id || id <= 0) return null;
  return ITEMS[String(id)] ?? null;
}

/**
 * URL absoluta do ícone do item, ou null pra slot vazio/desconhecido.
 */
export function itemImageUrl(id: number | null | undefined): string | null {
  const item = getItemById(id);
  return item ? `${CDN}${item.img}` : null;
}
