// Séries temporais por jogador (ouro/XP/last hits) pros gráficos multi-linha.
// Cada jogador ganha uma cor distinta da paleta (legível no fundo escuro).

export interface PlayerSeries {
  name: string;
  heroIcon: string | null;
  team: "radiant" | "dire";
  color: string;
  gold: number[];
  xp: number[];
  lh: number[];
}

// 10 cores vívidas e distintas (5 "frias" p/ Iluminados, 5 "quentes" p/ Temidos)
// — facilita ler a linha e ainda sugere o time. Ordem = slot dentro do time.
export const RADIANT_COLORS = ["#00C466", "#22D3EE", "#3B82F6", "#A3E635", "#14B8A6"];
export const DIRE_COLORS = ["#EF4444", "#F59E0B", "#EC4899", "#F97316", "#EAB308"];

export function colorFor(team: "radiant" | "dire", slot: number): string {
  const palette = team === "radiant" ? RADIANT_COLORS : DIRE_COLORS;
  return palette[slot % palette.length] ?? "#9CA3AF";
}
