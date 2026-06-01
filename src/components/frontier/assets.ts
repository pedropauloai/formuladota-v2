/**
 * Assets oficiais do Dota 2 (Steam CDN) — arte da Valve por hotlink.
 *
 * Regra do projeto (Pedro 2026-06-01): SEMPRE e SOMENTE usar artes oficiais
 * do Dota 2 (heróis, itens, backgrounds, ícones). Mesma estratégia que
 * DotaBackdrop já usa (greyfade.jpg).
 *
 * Os caminhos do CDN seguem convenções estáveis, então montamos por função
 * em vez de hardcodar URL por URL. Base descoberta via inspeção das páginas
 * oficiais dota2.com (dota_react app).
 */

const DOTA_IMG = "https://cdn.steamstatic.com/apps/dota2/images/dota_react";
const DOTA_VIDEO_IMG =
  "https://cdn.steamstatic.com/apps/dota2/videos/dota_react";

// ---------------------------------------------------------------------------
// Backgrounds atmosféricos (New Frontiers + páginas internas)
// ---------------------------------------------------------------------------
export const DOTA_BACKGROUNDS = {
  /** Teal/ciano frio — favorito do Pedro pra background principal. */
  featuredTeal: `${DOTA_IMG}/new_frontiers/backgrounds/featured_teal.jpg`,
  /** Roxo de destaque. */
  featuredPurple: `${DOTA_IMG}/new_frontiers/backgrounds/featured_purple.jpg`,
  /** Terreno do mapa, escuro. */
  mapDark: `${DOTA_IMG}/new_frontiers/backgrounds/map_bg30.jpg`,
  /** Banner key-art 2:1 do mapa. */
  mapBanner: `${DOTA_IMG}/new_frontiers/map-banner.jpg`,
  /** Textura greyfade usada nas páginas internas oficiais. */
  greyfade: `${DOTA_IMG}/backgrounds/greyfade.jpg`,
} as const;

// ---------------------------------------------------------------------------
// Renders e retratos de heróis — por slug oficial Valve (npc_dota_hero_<slug>
// vira só <slug> na URL). Ex: "muerta", "clinkz", "arc_warden", "ogre_magi".
// ---------------------------------------------------------------------------

/** Render full-body do herói (PNG transparente, ~vertical). Ideal pra blocos. */
export function heroRender(slug: string): string {
  return `${DOTA_VIDEO_IMG}/heroes/renders/${slug}.png`;
}

/** Retrato/crop do herói (mais quadrado). Fallback do render. */
export function heroPortrait(slug: string): string {
  return `${DOTA_IMG}/heroes/${slug}.png`;
}

// ---------------------------------------------------------------------------
// Ícones de atributo primário (força / agilidade / inteligência / universal)
// ---------------------------------------------------------------------------
export const ATTR_ICONS = {
  strength: `${DOTA_IMG}/icons/hero_strength.png`,
  agility: `${DOTA_IMG}/icons/hero_agility.png`,
  intelligence: `${DOTA_IMG}/icons/hero_intelligence.png`,
} as const;

// Slugs de heróis convenientes (oficiais Valve) pra usar nos blocos.
export const HERO_SLUGS = {
  muerta: "muerta",
  clinkz: "clinkz",
  arcWarden: "arc_warden",
  ogreMagi: "ogre_magi",
  medusa: "medusa",
} as const;

// ---------------------------------------------------------------------------
// Compat: alias antigo usado por frontier-hero/section antes desta refatoração.
// Mantido pra não quebrar imports existentes.
// ---------------------------------------------------------------------------
export const FRONTIER_ASSETS = {
  mapBanner: DOTA_BACKGROUNDS.mapBanner,
  mapBackground: DOTA_BACKGROUNDS.mapDark,
  featuredPurple: DOTA_BACKGROUNDS.featuredPurple,
  featuredTeal: DOTA_BACKGROUNDS.featuredTeal,
} as const;
