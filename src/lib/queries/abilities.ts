// Helper tipado de lookup do catálogo estático de habilidades Dota.
// Bundle JSON em src/data/dota-abilities.json — gerado via `pnpm gen:abilities`.
// Usado pela aba Builds pra resolver os ids de ability_upgrades_arr em ícone/nome.

import abilitiesData from "@/data/dota-abilities.json";

const CDN = "https://cdn.cloudflare.steamstatic.com";

export interface AbilityData {
  name: string;
  dname: string;
  /** Path relativo do ícone no CDN; null em talentos (special_bonus_*). */
  img: string | null;
}

const ABILITIES = abilitiesData as Record<string, AbilityData>;

/** Retorna a habilidade pelo id Valve, ou null se desconhecida. */
export function getAbilityById(id: number | null | undefined): AbilityData | null {
  if (!id) return null;
  return ABILITIES[String(id)] ?? null;
}

/** URL absoluta do ícone da habilidade, ou null (talento sem ícone/desconhecida). */
export function abilityImageUrl(id: number | null | undefined): string | null {
  const a = getAbilityById(id);
  return a?.img ? `${CDN}${a.img}` : null;
}

/** É um talento (special_bonus_*)? Talentos não têm ícone próprio. */
export function isTalent(id: number | null | undefined): boolean {
  const a = getAbilityById(id);
  return a ? a.name.startsWith("special_bonus") : false;
}
