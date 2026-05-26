// Helpers tipados de lookup/busca do catálogo estático de heróis Dota.
// Bundle JSON em src/data/dota-heroes.json — gerado via `pnpm gen:heroes` (D-25).
// Per decisão D-23, sem fetch API live — tudo estático e resolvido em bundle time.

import heroesData from "@/data/dota-heroes.json";

export interface HeroData {
  id: number;
  slug: string;
  name_pt: string;
  name_en: string;
  roles: string[];
  primary_attr: "str" | "agi" | "int" | "uni";
  complexity: number; // 1|2|3 — dificuldade Valve (D-24 mandatório). 1=fácil, 3=difícil
  image_full: string;
  image_icon: string;
  portrait_url: string;
}

// Type-cast do import JSON (TS infere tipos primitivos mas primary_attr precisa do union)
const HEROES = heroesData as HeroData[];

// Índices para lookup O(1) por slug e por id — construídos uma vez no module load
const BY_SLUG = new Map<string, HeroData>(HEROES.map((h) => [h.slug, h]));
const BY_ID = new Map<number, HeroData>(HEROES.map((h) => [h.id, h]));

/**
 * Retorna herói pelo slug (ex: "antimage") ou null se não encontrado.
 * Usado por ProfileIdentity para renderizar hero portrait do profiles.hero_portrait_slug (D-09).
 */
export function getHeroBySlug(slug: string): HeroData | null {
  return BY_SLUG.get(slug) ?? null;
}

/**
 * Retorna herói pelo id numérico Valve ou null se não encontrado.
 */
export function getHeroById(id: number): HeroData | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Retorna todos os 127 heróis do catálogo.
 * Usado por HeroPicker (plan 09-08) para exibir grid completo.
 */
export function getAllHeroes(): HeroData[] {
  return HEROES;
}

/**
 * Busca substring case-insensitive em name_pt, name_en ou slug.
 * Usado pelo HeroPicker no modal de edição (Phase 9) — 127 itens, busca linear sub-1ms.
 */
export function searchHeroes(query: string, limit = 24): HeroData[] {
  const q = query.trim().toLowerCase();
  if (!q) return HEROES.slice(0, limit);
  return HEROES.filter(
    (h) =>
      h.name_pt.toLowerCase().includes(q) ||
      h.name_en.toLowerCase().includes(q) ||
      h.slug.toLowerCase().includes(q)
  ).slice(0, limit);
}

/**
 * Valida que slug existe no catálogo — usado em Server Actions
 * (updateHeroPortrait, updateFavoriteHeroes) pra rejeitar slugs inválidos (D-22).
 */
export function isValidHeroSlug(slug: string): boolean {
  return BY_SLUG.has(slug);
}
