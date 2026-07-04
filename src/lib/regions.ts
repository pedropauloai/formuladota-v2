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

export function isGameRegion(value: string | null | undefined): value is GameRegion {
  return !!value && (GAME_REGIONS as readonly string[]).includes(value);
}
