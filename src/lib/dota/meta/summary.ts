// Resumo guardado do meta (uma linha da dota_meta_cache): os três períodos já somados e a linha dos
// últimos 14 dias por herói e função. O cron monta; a página só lê e calcula a nota. Lógica pura.

import type { DotaPatch } from "../meta-period";
import { daysBetween, isDay, isDayStat, shiftDay, sumDays, type DayStat, type MetaDay } from "./days";
import { PERIOD_KINDS, metaWindows, sortPatches, type PeriodKind, type PeriodWindow } from "./windows";

/** Dias da linha de tendência: duas semanas, o bastante para ver a troca de patch. */
export const SERIES_DAYS = 14;
/** Patches guardados no resumo: os últimos, que cobrem qualquer janela da página. */
const KEPT_PATCHES = 4;

export interface StoredPeriod extends PeriodWindow {
  /** Dias com dado dentro da janela (um dia sem dado na STRATZ fica de fora da conta). */
  days: number;
  stats: DayStat[];
}

/** [herói, função, partidas por dia, vitórias por dia], alinhado com `series.days`. */
export type SeriesRow = [heroId: number, position: number, matches: number[], wins: number[]];

export interface MetaSummary {
  version: 3;
  /** Último dia que a STRATZ fechou. */
  lastDay: string;
  patches: DotaPatch[];
  periods: StoredPeriod[];
  series: { days: string[]; rows: SeriesRow[] };
}

/** Dias que o resumo precisa ler: os das janelas e os da linha de tendência. */
export function daysNeeded(patches: DotaPatch[], lastDay: string): string[] {
  const needed = new Set(daysBetween(shiftDay(lastDay, -(SERIES_DAYS - 1)), lastDay));
  for (const w of metaWindows(patches, lastDay)) {
    for (const day of daysBetween(w.start, w.end)) needed.add(day);
  }
  return [...needed].sort();
}

function buildSeries(byDay: Map<string, MetaDay>, lastDay: string): MetaSummary["series"] {
  const days = daysBetween(shiftDay(lastDay, -(SERIES_DAYS - 1)), lastDay);
  const rows = new Map<string, SeriesRow>();
  days.forEach((day, i) => {
    for (const [heroId, position, matches, wins] of byDay.get(day)?.stats ?? []) {
      const key = `${heroId}:${position}`;
      let row = rows.get(key);
      if (!row) {
        row = [heroId, position, days.map(() => 0), days.map(() => 0)];
        rows.set(key, row);
      }
      row[2][i] = matches;
      row[3][i] = wins;
    }
  });
  return { days, rows: [...rows.values()] };
}

/** Monta o resumo a partir dos dias guardados. Sem nenhum dia, não há resumo. */
export function buildSummary(days: MetaDay[], patches: DotaPatch[]): MetaSummary | null {
  const lastDay = days.map((d) => d.day).sort().at(-1);
  if (!lastDay) return null;
  const byDay = new Map(days.map((d) => [d.day, d]));
  const periods = metaWindows(patches, lastDay).map((w): StoredPeriod => {
    const inside = daysBetween(w.start, w.end).flatMap((day) => byDay.get(day) ?? []);
    return { ...w, days: inside.length, stats: sumDays(inside) };
  });
  return {
    version: 3,
    lastDay,
    patches: sortPatches(patches).slice(-KEPT_PATCHES),
    periods: periods.filter((p) => p.days > 0),
    series: buildSeries(byDay, lastDay),
  };
}

function isPeriod(value: unknown): value is StoredPeriod {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    PERIOD_KINDS.includes(p.kind as PeriodKind) &&
    isDay(p.start) &&
    isDay(p.end) &&
    (p.patch === null || typeof p.patch === "string") &&
    typeof p.days === "number" &&
    Array.isArray(p.stats) &&
    p.stats.every(isDayStat)
  );
}

function isNumbers(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every((n) => typeof n === "number");
}

function isSeries(value: unknown): value is MetaSummary["series"] {
  if (!value || typeof value !== "object") return false;
  const { days, rows } = value as Record<string, unknown>;
  if (!Array.isArray(days) || !days.every(isDay) || !Array.isArray(rows)) return false;
  return rows.every(
    (r) =>
      Array.isArray(r) &&
      r.length === 4 &&
      typeof r[0] === "number" &&
      typeof r[1] === "number" &&
      isNumbers(r[2], days.length) &&
      isNumbers(r[3], days.length)
  );
}

export function isMetaSummary(value: unknown): value is MetaSummary {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    s.version === 3 &&
    isDay(s.lastDay) &&
    Array.isArray(s.patches) &&
    s.patches.every((p) => !!p && typeof p === "object" && typeof (p as DotaPatch).name === "string" && typeof (p as DotaPatch).startedAt === "string") &&
    Array.isArray(s.periods) &&
    s.periods.every(isPeriod) &&
    isSeries(s.series)
  );
}
