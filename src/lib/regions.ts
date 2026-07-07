// Regiões de JOGO (BR / LATAM / EU) — Pedro 2026-07-04.
//
// Região de jogo é INDEPENDENTE do idioma da UI (um peruano pode usar a UI em
// inglês e jogar na fila LATAM). BR NÃO é LATAM: filas e comunidades nunca se
// misturam (servidores Dota separados). Fonte da verdade = profiles.region
// (escolha única no onboarding; mudança só via admin — migration 121).

export const GAME_REGIONS = ["BR", "LATAM", "EU"] as const;
export type GameRegion = (typeof GAME_REGIONS)[number];

export const DEFAULT_REGION: GameRegion = "BR";

// Rótulos exibidos (nome próprio de região — não traduz).
export const REGION_LABELS: Record<GameRegion, string> = {
  BR: "Brasil",
  LATAM: "LATAM",
  EU: "Europa",
};

// Servidor Dota onde o bot cria a sala (enum ServerRegion do dota2-user):
// Brazil=10 · Peru=15 (LATAM; Chile=14 como alternativa) · Europe=3 (EU West;
// Austria=9/Stockholm=8 como alternativas EU East). Espelhado no bot-steam.
export const REGION_TO_DOTA_SERVER: Record<GameRegion, number> = {
  BR: 10,
  LATAM: 15,
  EU: 3,
};

// Alternativas do enum ServerRegion (Valve) para o TEATRO EUROPEU. Hoje a fila EU
// usa Europe=3 (uma fila única — NÃO fragmentar por servidor, senão perde liquidez).
// Documentado aqui pra afinar por ping no futuro (ex.: EU East → Stockholm/Austria),
// SEM criar filas separadas. Trocar o valor em REGION_TO_DOTA_SERVER.EU se necessário.
export const EUROPEAN_DOTA_SERVERS = {
  Europe: 3, // EU West (padrão da fila EU)
  Stockholm: 8, // EU North
  Austria: 9, // EU East
} as const;

export function isGameRegion(value: string | null | undefined): value is GameRegion {
  return !!value && (GAME_REGIONS as readonly string[]).includes(value);
}

// --- Sugestão de REGIÃO por país (IP) --------------------------------------
// x-vercel-ip-country → GameRegion. IP apenas SUGERE o default no onboarding; o
// usuário confirma (e pode trocar). Eixo INDEPENDENTE do idioma da UI.

// LATAM hispânica da América. BR NÃO entra aqui (BR é região própria). Mesma lista
// de países da detecção de idioma-ES, mas aqui decide REGIÃO DE JOGO (servidores
// Dota separados) — não confundir os dois eixos.
const LATAM_COUNTRIES = new Set([
  "AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GT", "HN", "MX",
  "NI", "PA", "PY", "PE", "PR", "UY", "VE",
]);

/**
 * País (código ISO-3166 alpha-2, ex.: "BR", "DE", "RU") → região de JOGO sugerida.
 *
 * - BR → BR
 * - LATAM hispânica (AR, PE, MX, CL, CO, …) → LATAM
 * - Teatro europeu — Europa Ocidental + Reino Unido + Bálcãs + **CIS/Rússia e
 *   vizinhos (RU, UA, BY, KZ, GE, AM, TR, …)** → EU. Pela fila do Stratz + enum da
 *   Valve, russo/CIS joga nos SERVIDORES EUROPEUS, então no matchmaking entra em EU
 *   (NÃO existe região "RU" separada).
 * - Resto do mundo / desconhecido (US, CA, Ásia, null) → EU (beachhead internacional).
 *
 * IP SUGERE, usuário CONFIRMA — a escrita real é guardada em chooseRegion().
 */
export function countryToRegion(country: string | null | undefined): GameRegion {
  if (!country) return "EU";
  const c = country.toUpperCase();
  if (c === "BR") return "BR";
  if (LATAM_COUNTRIES.has(c)) return "LATAM";
  // Europa/CIS/Rússia + qualquer outro país cai na fila EU.
  return "EU";
}
