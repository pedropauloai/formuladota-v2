// Nome PT do modo de jogo a partir do código numérico OpenDota (matches.game_mode).
// Foco nos modos que a comunidade joga; o resto cai num rótulo genérico.

const GAME_MODE_PT: Record<number, string> = {
  1: "Escolha livre",
  2: "Modo Capitães",
  3: "Seleção aleatória",
  4: "Escolha única",
  5: "Todos aleatórios",
  16: "Capitães (draft)",
  18: "Ability Draft",
  20: "Deathmatch",
  21: "1v1 meio",
  22: "Escolha livre", // All Draft / Ranked All Pick
  23: "Turbo",
  24: "Mutação",
};

/** Nome curto e legível do modo de jogo (ou null se desconhecido). */
export function gameModeName(code: number | null | undefined): string | null {
  if (code == null) return null;
  return GAME_MODE_PT[code] ?? "Outro modo";
}
