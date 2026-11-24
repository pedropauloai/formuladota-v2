// Janelas do meta: o patch atual, os últimos 7 dias e o fim do patch anterior. Lógica pura.
// O patch vem da OpenDota (/constants/patch, a lista da STRATZ não tem o 7.42) e a STRATZ fecha o dia
// em UTC com cerca de 1 dia de atraso. O dia da troca de patch mistura os dois e não entra em nenhum.

import type { DotaPatch } from "../meta-period";
import { dayStartMs, shiftDay, utcDay } from "./days";

export type PeriodKind = "patch" | "recent" | "previous";
export const PERIOD_KINDS: readonly PeriodKind[] = ["patch", "recent", "previous"];

/** "Últimos 7 dias": os 7 dias mais novos que a STRATZ fechou. */
export const RECENT_DAYS = 7;
/** O patch anterior entra pelos últimos 7 dias inteiros dele: o meta como estava quando acabou. */
export const PREVIOUS_PATCH_DAYS = 7;
/** Com menos dias que isso no patch atual, a página avisa que a amostra ainda é pequena. */
export const YOUNG_PATCH_DAYS = 7;

const DAY_MS = 86_400_000;

export interface PeriodWindow {
  kind: PeriodKind;
  /** Primeiro e último dia (UTC, AAAA-MM-DD), os dois inclusive. */
  start: string;
  end: string;
  /** Patch do período; nos últimos 7 dias fica null, porque a janela pode passar pela troca. */
  patch: string | null;
}

export function sortPatches(patches: DotaPatch[]): DotaPatch[] {
  return [...patches].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
}

/** Primeiro dia inteiro do patch: se ele saiu no meio do dia, conta a partir do dia seguinte. */
export function firstFullDay(startedAt: string): string {
  const ms = Date.parse(startedAt);
  const day = utcDay(ms);
  return dayStartMs(day) === ms ? day : shiftDay(day, 1);
}

/** Último dia inteiro antes do patch começar (o dia da troca fica de fora). */
export function lastFullDayBefore(startedAt: string): string {
  return shiftDay(utcDay(Date.parse(startedAt)), -1);
}

/** Índice do patch em vigor no último dia com dado: o último que começou antes do fim desse dia. */
export function currentPatchIndex(sorted: DotaPatch[], lastDay: string): number {
  const endMs = dayStartMs(lastDay) + DAY_MS;
  let index = -1;
  sorted.forEach((patch, i) => {
    if (Date.parse(patch.startedAt) < endMs) index = i;
  });
  return index;
}

function laterDay(a: string, b: string): string {
  return a > b ? a : b;
}

/** As janelas que existem para o último dia com dado, na ordem do filtro (patch, 7 dias, anterior). */
export function metaWindows(patches: DotaPatch[], lastDay: string): PeriodWindow[] {
  const sorted = sortPatches(patches);
  const index = currentPatchIndex(sorted, lastDay);
  const current = sorted[index];
  const previous = index > 0 ? sorted[index - 1] : undefined;
  const out: PeriodWindow[] = [];

  if (current) {
    const start = firstFullDay(current.startedAt);
    if (start <= lastDay) out.push({ kind: "patch", start, end: lastDay, patch: current.name });
  }
  out.push({ kind: "recent", start: shiftDay(lastDay, -(RECENT_DAYS - 1)), end: lastDay, patch: null });
  if (current && previous) {
    const end = lastFullDayBefore(current.startedAt);
    const start = laterDay(firstFullDay(previous.startedAt), shiftDay(end, -(PREVIOUS_PATCH_DAYS - 1)));
    if (start <= end) out.push({ kind: "previous", start, end, patch: previous.name });
  }
  return out;
}

/** Dia (UTC) em que o patch atual começou, para marcar a troca na linha dos últimos dias. */
export function currentPatchStartDay(patches: DotaPatch[], lastDay: string): string | null {
  const sorted = sortPatches(patches);
  const current = sorted[currentPatchIndex(sorted, lastDay)];
  return current ? utcDay(Date.parse(current.startedAt)) : null;
}
