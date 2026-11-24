// O que o /meta mostra: lê o resumo guardado (ou busca na hora, na primeira vez) e monta a função
// escolhida e as cinco funções no mesmo período e amostra, mais quem subiu e caiu e o profissional.

import "server-only";
import heroesCatalog from "@/data/dota-heroes.json";
import type { DotaPatch } from "../meta-period";
import { getMetaData } from "./store";
import type { MetaPageState } from "./url-state";
import { buildMetaView, heroesFromCatalog, movers, SINGLE_ROLES, type HeroInfo, type MetaHeroRow, type MetaView } from "./view";
import { YOUNG_PATCH_DAYS, currentPatchIndex, sortPatches, type PeriodKind } from "./windows";

export type SingleRole = (typeof SINGLE_ROLES)[number];

export interface ProRow extends Pick<HeroInfo, "id" | "name" | "face"> {
  picks: number;
  bans: number;
  wins: number;
}

export interface ProBlock {
  patch: string;
  startedAt: string;
  matches: number;
  leagues: number;
  rows: ProRow[];
}

export interface MetaPageData {
  state: MetaPageState;
  /** Período mostrado: pediu o patch e ele ainda não tem dia inteiro, cai nos últimos 7 dias. */
  period: PeriodKind;
  fallback: boolean;
  periods: Array<{ kind: PeriodKind; patch: string | null }>;
  view: MetaView;
  roles: Record<SingleRole, MetaView>;
  movers: { up: MetaHeroRow[]; down: MetaHeroRow[] };
  pro: ProBlock | null;
  summaryAt: string;
  patches: DotaPatch[];
  /** Patch em vigor no último dia fechado (com ou sem dia inteiro ainda). */
  currentPatch: string | null;
  previousPatch: string | null;
  /** Dias do patch atual quando ainda são poucos (aviso de amostra pequena). */
  young: number | null;
}

function proBlock(raw: Awaited<ReturnType<typeof getMetaData>>["pro"], heroes: Map<number, HeroInfo>): ProBlock | null {
  if (!raw) return null;
  const rows = raw.heroes.flatMap((h): ProRow[] => {
    const info = heroes.get(h.heroId);
    return info ? [{ id: info.id, name: info.name, face: info.face, picks: h.picks, bans: h.bans, wins: h.wins }] : [];
  });
  return { patch: raw.patch, startedAt: raw.startedAt, matches: raw.matches, leagues: raw.leagues, rows };
}

export async function loadMetaPage(state: MetaPageState): Promise<MetaPageData> {
  const data = await getMetaData();
  const { summary } = data;
  const heroes = heroesFromCatalog(heroesCatalog);
  const periods = summary.periods.map((p) => ({ kind: p.kind, patch: p.patch }));
  const available = periods.some((p) => p.kind === state.period);
  const period: PeriodKind = available ? state.period : "recent";
  const build = (role: MetaView["role"]) => {
    const view = buildMetaView({ summary, heroes, period, role, minMatches: state.min });
    if (!view) throw new Error(`período ${period} sem dado`);
    return view;
  };
  const view = build(state.role);
  const roles = Object.fromEntries(SINGLE_ROLES.map((r) => [r, build(r)])) as Record<SingleRole, MetaView>;
  const sorted = sortPatches(summary.patches);
  const current = sorted[currentPatchIndex(sorted, summary.lastDay)];
  return {
    state,
    period,
    fallback: !available && state.period === "patch",
    periods,
    view,
    roles,
    movers: movers(view.rows),
    pro: proBlock(data.pro, heroes),
    summaryAt: data.summaryAt,
    patches: summary.patches,
    currentPatch: current?.name ?? null,
    previousPatch: periods.find((p) => p.kind === "previous")?.patch ?? null,
    young: period === "patch" && view.period.days < YOUNG_PATCH_DAYS ? view.period.days : null,
  };
}
