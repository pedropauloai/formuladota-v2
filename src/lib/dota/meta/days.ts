// Dia a dia do meta na medalha Imortal: o que a STRATZ devolve no winDay, agrupado por dia (UTC).
// Lógica pura: o dia guardado no banco não muda mais, e os períodos (patch, 7 dias) somam dias.

/** [herói, função de 1 a 5, partidas, vitórias] de um dia ou de um período. */
export type DayStat = [heroId: number, position: number, matches: number, wins: number];

export interface MetaDay {
  /** Dia em UTC, AAAA-MM-DD. */
  day: string;
  stats: DayStat[];
}

export const POSITIONS = [1, 2, 3, 4, 5] as const;

const DAY_MS = 86_400_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dayStartMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** O dia `delta` dias depois (ou antes, com delta negativo). */
export function shiftDay(day: string, delta: number): string {
  return utcDay(dayStartMs(day) + delta * DAY_MS);
}

/** Os dias de `start` a `end`, os dois inclusive. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let day = start; day <= end; day = shiftDay(day, 1)) out.push(day);
  return out;
}

export function isDay(value: unknown): value is string {
  return typeof value === "string" && DAY_PATTERN.test(value);
}

export function isDayStat(value: unknown): value is DayStat {
  return Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === "number" && Number.isFinite(n));
}

export function isMetaDay(value: unknown): value is MetaDay {
  if (!value || typeof value !== "object") return false;
  const { day, stats } = value as Record<string, unknown>;
  return isDay(day) && Array.isArray(stats) && stats.every(isDayStat);
}

interface WinDayRow {
  day: number;
  heroId: number;
  matchCount: number;
  winCount: number;
}

function isWinDayRow(value: unknown): value is WinDayRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["day", "heroId", "matchCount", "winCount"].every((k) => typeof row[k] === "number");
}

/**
 * Junta as respostas das 5 funções num dia a dia. `byPosition[1]` é a lista do winDay da função 1.
 * Linha sem partida ou fora do formato fica de fora; o dia vem em segundos desde 1970, à meia-noite UTC.
 */
export function groupWinDays(byPosition: Record<number, unknown>): MetaDay[] {
  const byDay = new Map<string, DayStat[]>();
  for (const position of POSITIONS) {
    const rows = byPosition[position];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!isWinDayRow(row) || row.matchCount <= 0) continue;
      const day = utcDay(row.day * 1000);
      const list = byDay.get(day) ?? [];
      list.push([row.heroId, position, row.matchCount, row.winCount]);
      byDay.set(day, list);
    }
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, stats]) => ({ day, stats }));
}

/** Soma os dias num período: uma linha por herói e função. */
export function sumDays(days: MetaDay[]): DayStat[] {
  const acc = new Map<string, DayStat>();
  for (const { stats } of days) {
    for (const [heroId, position, matches, wins] of stats) {
      const key = `${heroId}:${position}`;
      const cur = acc.get(key);
      if (cur) {
        cur[2] += matches;
        cur[3] += wins;
      } else {
        acc.set(key, [heroId, position, matches, wins]);
      }
    }
  }
  return [...acc.values()];
}
