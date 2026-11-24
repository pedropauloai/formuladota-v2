// Dados de mentira para os testes do meta: 14 dias (10 a 23/11/2026) em volta da troca para o 7.42.
// Função 2 (Mid): 200 partidas por dia, 400 linhas e 200 vitórias (a média da função é 50%).
// Antes do patch (até 18/11): Invoker 45%, Shadow Fiend 50%, Queen of Pain 50%.
// No patch (de 19/11 em diante): Invoker 55%, Shadow Fiend 40%, Queen of Pain 60%.
// O herói 9999 não está no catálogo: completa as linhas sem aparecer na tabela.

import { parseOpenDotaPatches } from "../meta-period";
import { daysBetween, type DayStat, type MetaDay } from "./days";

export const PATCHES = parseOpenDotaPatches([
  { name: "7.40", date: "2025-12-16T00:50:40.281Z" },
  { name: "7.41", date: "2026-03-24T00:50:59.580Z" },
  { name: "7.42", date: "2026-11-18T21:28:07.019Z" },
]);

export const INVOKER = 74;
export const SHADOW_FIEND = 11;
export const QUEEN_OF_PAIN = 39;
export const ANTI_MAGE = 1;
export const PHANTOM_ASSASSIN = 44;
const FILLER = 9999;

const BEFORE: DayStat[] = [
  [INVOKER, 2, 60, 27],
  [SHADOW_FIEND, 2, 40, 20],
  [QUEEN_OF_PAIN, 2, 20, 10],
  [FILLER, 2, 280, 143],
];
const AFTER: DayStat[] = [
  [INVOKER, 2, 60, 33],
  [SHADOW_FIEND, 2, 40, 16],
  [QUEEN_OF_PAIN, 2, 20, 12],
  [FILLER, 2, 280, 139],
];
// As outras funções iguais em todos os dias, também com 400 linhas: 200 partidas por dia no total.
const OTHERS: DayStat[] = [
  [ANTI_MAGE, 1, 150, 75],
  [PHANTOM_ASSASSIN, 1, 100, 50],
  [FILLER, 1, 150, 75],
  [FILLER, 3, 400, 200],
  [FILLER, 4, 400, 200],
  [FILLER, 5, 400, 200],
];

export const DAYS: MetaDay[] = daysBetween("2026-11-10", "2026-11-23").map((day) => ({
  day,
  stats: [...(day >= "2026-11-19" ? AFTER : BEFORE), ...OTHERS].map((s): DayStat => [...s]),
}));
