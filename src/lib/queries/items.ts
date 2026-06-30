// Helper tipado de lookup do catálogo estático de itens Dota.
// Bundle JSON em src/data/dota-items.json — gerado via `pnpm gen:items`.
// Per mesma decisão dos heróis (D-23): sem fetch live, tudo resolvido em bundle time.

import itemsData from "@/data/dota-items.json";

const CDN = "https://cdn.cloudflare.steamstatic.com";

export interface ItemData {
  /** Chave interna do item (ex: "blink") — usada pelo purchase_log. */
  name: string;
  /** Nome de exibição (ex: "Blink Dagger"). */
  dname: string;
  /** Path relativo do ícone no CDN Valve. */
  img: string;
  /** Custo em ouro (0 = consumível/recipe sem custo direto). */
  cost: number;
}

// Botas conhecidas (categoria própria na build, igual STRATZ).
const BOOTS = new Set([
  "boots",
  "power_treads",
  "phase_boots",
  "arcane_boots",
  "tranquil_boots",
  "travel_boots",
  "travel_boots_2",
  "guardian_greaves",
  "boots_of_bearing",
  "force_boots",
]);

/** É um par de botas (qualquer tier)? */
export function isBoots(name: string | null | undefined): boolean {
  return name ? BOOTS.has(name) : false;
}

// Mapa id(string) → { name, dname, img }. id 0 (ou ausente) = slot vazio.
const ITEMS = itemsData as Record<string, ItemData>;

// Índice por nome interno — purchase_log referencia itens por nome, não por id.
const BY_NAME = new Map<string, ItemData>(
  Object.values(ITEMS).map((it) => [it.name, it])
);

/**
 * Retorna o item pelo id numérico Valve, ou null pra slot vazio/desconhecido.
 */
export function getItemById(id: number | null | undefined): ItemData | null {
  if (!id || id <= 0) return null;
  return ITEMS[String(id)] ?? null;
}

/**
 * Retorna o item pela chave interna (ex: "blink"), ou null se desconhecido.
 */
export function getItemByName(name: string | null | undefined): ItemData | null {
  if (!name) return null;
  return BY_NAME.get(name) ?? null;
}

/**
 * URL absoluta do ícone do item por id, ou null pra slot vazio/desconhecido.
 */
export function itemImageUrl(id: number | null | undefined): string | null {
  const item = getItemById(id);
  return item ? `${CDN}${item.img}` : null;
}

/**
 * URL absoluta do ícone do item por nome interno, ou null se desconhecido.
 */
export function itemImageByName(name: string | null | undefined): string | null {
  const item = getItemByName(name);
  return item ? `${CDN}${item.img}` : null;
}
