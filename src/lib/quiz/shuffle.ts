// Embaralhamento das alternativas do quiz para EXIBIÇÃO.
//
// As 130 questões foram escritas com a alternativa correta quase sempre na
// posição B (128/130) — dava pra "gabaritar" chutando a letra B sem ler. O
// embaralhamento remove esse viés posicional. É SEGURO porque a checagem de
// acerto e o texto (i18n) usam `option.id` (a/b/c/d intrínseco), nunca a
// posição — então reordenar o array não afeta a correção, só a ordem visível.
// A LETRA exibida passa a ser a POSIÇÃO no display (ver displayLetter).

import type { QuizOption } from "./types";

/** Fisher–Yates. Use em useMemo keyed no id da questão pra ficar estável
 *  enquanto o aluno responde (não reembaralha a cada clique/render). */
export function shuffleOptions(options: QuizOption[]): QuizOption[] {
  const arr = options.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Letra mostrada = posição no display (0→a, 1→b, 2→c, 3→d). */
export function displayLetter(index: number): string {
  return String.fromCharCode(97 + index);
}
