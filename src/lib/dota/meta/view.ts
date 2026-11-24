// Do resumo guardado às linhas da tela: escolha, vitória, vitória ajustada, nota, letra, variação contra
// o fim do patch anterior e a linha dos últimos dias, filtrados por função e período. Lógica pura.

import type { DayStat } from "./days";
import { adjustedWinRate, letterFor, metaScore, pickRate, winRate, type MetaLetter } from "./scoring";
import type { MetaSummary, StoredPeriod } from "./summary";
import { currentPatchStartDay, type PeriodKind } from "./windows";

/** Função: todas, ou da 1 (Carry) à 5 (Hard Support). */
export type MetaRole = "all" | "1" | "2" | "3" | "4" | "5";
export const META_ROLES: readonly MetaRole[] = ["all", "1", "2", "3", "4", "5"];
export const SINGLE_ROLES = ["1", "2", "3", "4", "5"] as const;
export type HeroAttr = "str" | "agi" | "int" | "uni";

export interface HeroInfo {
  id: number;
  name: string;
  /** Rosto quadrado (minimapa) oficial. */
  face: string;
  /** Retrato 16:9 oficial. */
  portrait: string;
  attr: HeroAttr;
}

export interface MetaHeroRow extends HeroInfo {
  matches: number;
  winRate: number;
  adjustedWinRate: number;
  pick: number;
  score: number;
  letter: MetaLetter;
  /** Abaixo da amostra mínima: aparece apagado, não some. */
  belowMin: boolean;
  /** Vitória ajustada menos a do fim do patch anterior, em pontos; null sem amostra nos dois. */
  delta: number | null;
  /** Vitória ajustada de cada dia da linha; null no dia sem partida. */
  trend: Array<number | null>;
}

export type PeriodInfo = Omit<StoredPeriod, "stats">;

export interface MetaView {
  role: MetaRole;
  period: PeriodInfo;
  /** Partidas do período: as da função, ou todas em "Todas". */
  matches: number;
  /** Vitória média da função no período (perto de 50%: toda partida tem um vencedor e um perdedor). */
  mean: number;
  minMatches: number;
  rows: MetaHeroRow[];
  /** Com que período a variação compara (o fim do patch anterior), ou null. */
  baseline: PeriodInfo | null;
  trendDays: string[];
  /** Posição do dia da troca de patch na linha, ou null se ela não cai nos dias da linha. */
  patchChangeIndex: number | null;
}

// Na STRATZ cada partida tem 2 linhas por função (um herói de cada time) e 10 no total.
const ROWS_PER_MATCH_IN_ROLE = 2;
const ROWS_PER_MATCH = 10;

interface Tally {
  matches: number;
  wins: number;
}

interface Aggregate {
  byHero: Map<number, Tally>;
  rows: number;
  wins: number;
}

interface CatalogHero {
  id: number;
  name_en: string;
  primary_attr: string;
  image_icon: string;
  image_full: string;
}

export function heroesFromCatalog(catalog: CatalogHero[]): Map<number, HeroInfo> {
  const attr = (a: string): HeroAttr => (a === "str" || a === "agi" || a === "int" ? a : "uni");
  return new Map(
    catalog.map((h) => [h.id, { id: h.id, name: h.name_en, face: h.image_icon, portrait: h.image_full, attr: attr(h.primary_attr) }])
  );
}

function inRole(position: number, role: MetaRole): boolean {
  return role === "all" || position === Number(role);
}

export function aggregate(stats: DayStat[], role: MetaRole): Aggregate {
  const byHero = new Map<number, Tally>();
  let rows = 0;
  let wins = 0;
  for (const [heroId, position, m, w] of stats) {
    if (!inRole(position, role)) continue;
    const cur = byHero.get(heroId) ?? { matches: 0, wins: 0 };
    cur.matches += m;
    cur.wins += w;
    byHero.set(heroId, cur);
    rows += m;
    wins += w;
  }
  return { byHero, rows, wins };
}

/** Partidas do período: na função, linhas ÷ 2; em "Todas", linhas ÷ 10. */
export function matchesOf(agg: Aggregate, role: MetaRole): number {
  return agg.rows / (role === "all" ? ROWS_PER_MATCH : ROWS_PER_MATCH_IN_ROLE);
}

function meanOf(agg: Aggregate): number {
  return agg.rows > 0 ? (agg.wins / agg.rows) * 100 : 50;
}

/** Vitória ajustada por dia, por herói, com a média do próprio dia. */
function trendByHero(summary: MetaSummary, role: MetaRole): Map<number, Array<number | null>> {
  const { days, rows } = summary.series;
  const perHero = new Map<number, { m: number[]; w: number[] }>();
  const dayRows = days.map(() => 0);
  const dayWins = days.map(() => 0);
  for (const [heroId, position, m, w] of rows) {
    if (!inRole(position, role)) continue;
    const cur = perHero.get(heroId) ?? { m: days.map(() => 0), w: days.map(() => 0) };
    days.forEach((_, i) => {
      cur.m[i] = (cur.m[i] ?? 0) + (m[i] ?? 0);
      cur.w[i] = (cur.w[i] ?? 0) + (w[i] ?? 0);
      dayRows[i] = (dayRows[i] ?? 0) + (m[i] ?? 0);
      dayWins[i] = (dayWins[i] ?? 0) + (w[i] ?? 0);
    });
    perHero.set(heroId, cur);
  }
  const dayMean = days.map((_, i) => ((dayRows[i] ?? 0) > 0 ? ((dayWins[i] ?? 0) / (dayRows[i] ?? 1)) * 100 : 50));
  const out = new Map<number, Array<number | null>>();
  for (const [heroId, { m, w }] of perHero) {
    out.set(heroId, m.map((mi, i) => (mi > 0 ? adjustedWinRate(w[i] ?? 0, mi, dayMean[i] ?? 50) : null)));
  }
  return out;
}

function withoutStats(p: StoredPeriod): PeriodInfo {
  return { kind: p.kind, start: p.start, end: p.end, patch: p.patch, days: p.days };
}

/** Acima da amostra mínima pela nota; abaixo dela no fim, pelas partidas. */
export function sortRows(rows: MetaHeroRow[]): MetaHeroRow[] {
  return [...rows].sort((a, b) => {
    if (a.belowMin !== b.belowMin) return a.belowMin ? 1 : -1;
    return a.belowMin ? b.matches - a.matches : b.score - a.score;
  });
}

interface ViewArgs {
  summary: MetaSummary;
  heroes: Map<number, HeroInfo>;
  period: PeriodKind;
  role: MetaRole;
  minMatches: number;
}

interface RowContext {
  matches: number;
  mean: number;
  minMatches: number;
  baseAgg: Aggregate | null;
  baseMean: number;
}

function buildRow(info: HeroInfo, t: Tally, ctx: RowContext, trend: Array<number | null>): MetaHeroRow {
  const pick = pickRate(t.matches, ctx.matches);
  const adjusted = adjustedWinRate(t.wins, t.matches, ctx.mean);
  const score = metaScore(adjusted, pick);
  const prev = ctx.baseAgg?.byHero.get(info.id);
  const comparable = !!prev && prev.matches >= ctx.minMatches && t.matches >= ctx.minMatches;
  return {
    ...info,
    matches: t.matches,
    winRate: winRate(t.wins, t.matches),
    adjustedWinRate: adjusted,
    pick,
    score,
    letter: letterFor(score),
    belowMin: t.matches < ctx.minMatches,
    delta: comparable && prev ? adjusted - adjustedWinRate(prev.wins, prev.matches, ctx.baseMean) : null,
    trend,
  };
}

/** Linhas da tela para a função e o período; null quando o período não existe no resumo. */
export function buildMetaView({ summary, heroes, period, role, minMatches }: ViewArgs): MetaView | null {
  const current = summary.periods.find((p) => p.kind === period);
  if (!current) return null;
  const base = period === "previous" ? undefined : summary.periods.find((p) => p.kind === "previous");
  const agg = aggregate(current.stats, role);
  const baseAgg = base ? aggregate(base.stats, role) : null;
  const ctx: RowContext = {
    matches: matchesOf(agg, role),
    mean: meanOf(agg),
    minMatches,
    baseAgg,
    baseMean: baseAgg ? meanOf(baseAgg) : 50,
  };
  const trends = trendByHero(summary, role);
  const empty = summary.series.days.map(() => null);
  const rows: MetaHeroRow[] = [];
  for (const [heroId, t] of agg.byHero) {
    const info = heroes.get(heroId);
    if (info) rows.push(buildRow(info, t, ctx, trends.get(heroId) ?? empty));
  }

  const changeDay = currentPatchStartDay(summary.patches, summary.lastDay);
  const changeIndex = changeDay ? summary.series.days.indexOf(changeDay) : -1;
  return {
    role,
    period: withoutStats(current),
    matches: ctx.matches,
    mean: ctx.mean,
    minMatches,
    rows: sortRows(rows),
    baseline: base ? withoutStats(base) : null,
    trendDays: summary.series.days,
    patchChangeIndex: changeIndex >= 0 ? changeIndex : null,
  };
}

/** Quem mais subiu e mais caiu contra o fim do patch anterior (só quem tem amostra nos dois). */
export function movers(rows: MetaHeroRow[], count = 5): { up: MetaHeroRow[]; down: MetaHeroRow[] } {
  const comparable = rows.filter((r) => r.delta !== null);
  const up = comparable.filter((r) => (r.delta ?? 0) > 0).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  const down = comparable.filter((r) => (r.delta ?? 0) < 0).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  return { up: up.slice(0, count), down: down.slice(0, count) };
}
