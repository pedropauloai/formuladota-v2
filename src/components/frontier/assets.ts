/**
 * Assets visuais estilo "New Frontiers" (Dota 2 oficial).
 *
 * Hotlink direto do Steam CDN — mesma estratégia que `DotaBackdrop` já usa
 * (greyfade.jpg). São arte da Valve; servem como base atmosférica enquanto
 * não geramos key-art própria. Centralizados aqui pra trocar de uma vez só
 * (ou migrar pra /public self-hosted) sem caçar URL espalhada nos componentes.
 *
 * Fonte: cdn.steamstatic.com/apps/dota2/images/dota_react/new_frontiers/
 */

const NF_BASE =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/new_frontiers";

export const FRONTIER_ASSETS = {
  /** Banner hero 2:1 — key-art do mapa. Forte e dominante no topo. */
  mapBanner: `${NF_BASE}/map-banner.jpg`,
  /** Fundo atmosférico escuro de seção (terreno do mapa). */
  mapBackground: `${NF_BASE}/backgrounds/map_bg30.jpg`,
  /** Fundo de destaque com tom roxo — bom pra seção de ênfase. */
  featuredPurple: `${NF_BASE}/backgrounds/featured_purple.jpg`,
  /** Fundo de destaque com tom teal/ciano — contraste frio. */
  featuredTeal: `${NF_BASE}/backgrounds/featured_teal.jpg`,
} as const;
