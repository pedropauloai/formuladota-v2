// Nota do meta do FORMULADOTA: vitória ajustada à amostra mais o peso da escolha, com letra por corte
// fixo (a mesma nota tem a mesma letra em qualquer filtro). Lógica pura; a fórmula está escrita na tela.

/** Média bayesiana: soma 300 partidas na média da função, e quem tem 300 partidas fica no meio do caminho. */
export const PRIOR_MATCHES = 300;
/** A escolha soma 1 ponto à nota a cada 10% das partidas. */
export const PICK_POINTS_PER_PERCENT = 0.1;

export type MetaLetter = "S" | "A" | "B" | "C" | "D" | "F";
export const LETTERS: readonly MetaLetter[] = ["S", "A", "B", "C", "D", "F"];

/** Nota mínima de cada letra; abaixo de 48,5 é F. */
export const LETTER_CUTS: ReadonlyArray<readonly [MetaLetter, number]> = [
  ["S", 55],
  ["A", 53],
  ["B", 51.5],
  ["C", 50],
  ["D", 48.5],
];

/** Partidas em que o herói aparece, em % das partidas da função (ou do período, em "Todas"). */
export function pickRate(heroMatches: number, contextMatches: number): number {
  return contextMatches > 0 ? (heroMatches / contextMatches) * 100 : 0;
}

export function winRate(wins: number, matches: number): number {
  return matches > 0 ? (wins / matches) * 100 : 0;
}

/** Vitória puxada para a média até a amostra crescer: (vitórias + 300 × média) ÷ (partidas + 300). */
export function adjustedWinRate(wins: number, matches: number, meanPct: number, prior = PRIOR_MATCHES): number {
  const mean = meanPct / 100;
  return ((wins + prior * mean) / (matches + prior)) * 100;
}

/** Nota = vitória ajustada + escolha ÷ 10. */
export function metaScore(adjustedWinRatePct: number, pickPct: number): number {
  return adjustedWinRatePct + pickPct * PICK_POINTS_PER_PERCENT;
}

export function letterFor(score: number): MetaLetter {
  for (const [letter, min] of LETTER_CUTS) {
    if (score >= min) return letter;
  }
  return "F";
}

/** Nota mínima da letra (F não tem piso). */
export function letterFloor(letter: MetaLetter): number | null {
  return LETTER_CUTS.find(([l]) => l === letter)?.[1] ?? null;
}
