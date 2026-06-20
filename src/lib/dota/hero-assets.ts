// URLs de assets OFICIAIS do Dota 2 (CDN Valve). Centralizado aqui pra reusar em
// qualquer tela (meta, lobbies, perfil, draft…) — "deixar no jeito quando precisar".
// Todas as URLs foram validadas (HTTP 200) em 2026-06-19.

const CDN = "https://cdn.cloudflare.steamstatic.com";

// Aceita o path relativo que o OpenDota devolve (img/icon começam com "/") OU o
// nome interno do herói (ex "antimage"). Assim serve tanto pro fluxo do /heroStats
// quanto pra quem só tem o nome.
function resolve(pathOrName: string, kind: "portrait" | "face"): string {
  if (pathOrName.startsWith("/")) return `${CDN}${pathOrName}`;
  const dir = kind === "face" ? "heroes/icons" : "heroes";
  return `${CDN}/apps/dota2/images/dota_react/${dir}/${pathOrName}.png`;
}

/** Retrato retangular 16:9 (splash) do herói. */
export function heroPortraitUrl(imgOrName: string): string {
  return resolve(imgOrName, "portrait");
}

/** Face quadrada (estilo minimapa) do herói. */
export function heroFaceUrl(iconOrName: string): string {
  return resolve(iconOrName, "face");
}

/** Ícones oficiais de atributo (Força / Agilidade / Inteligência / Universal). */
export const ATTR_ICON_URL: Record<"str" | "agi" | "int" | "uni", string> = {
  str: `${CDN}/apps/dota2/images/dota_react/icons/hero_strength.png`,
  agi: `${CDN}/apps/dota2/images/dota_react/icons/hero_agility.png`,
  int: `${CDN}/apps/dota2/images/dota_react/icons/hero_intelligence.png`,
  uni: `${CDN}/apps/dota2/images/dota_react/icons/hero_universal.png`,
};

// Ícones oficiais de POSIÇÃO (pos 1-5) do Dota 2. A Valve não publica esses no
// CDN web (vivem no panorama do jogo), então auto-hospedamos em /public — igual
// fazem dota2protracker e similares. Baixados/validados em 2026-06-19.
export const POSITION_ICON: Record<"1" | "2" | "3" | "4" | "5", string> = {
  "1": "/dota/positions/pos-1.png",
  "2": "/dota/positions/pos-2.png",
  "3": "/dota/positions/pos-3.png",
  "4": "/dota/positions/pos-4.png",
  "5": "/dota/positions/pos-5.png",
};
