// PROTÓTIPO (meta-previa): os mesmos dados reais para as três versões. Lê o resumo guardado (ou busca na
// hora, na primeira vez), monta a função escolhida e as cinco funções no mesmo período e amostra.

import "server-only";
import heroesCatalog from "@/data/dota-heroes.json";
import type { DotaPatch } from "@/lib/dota/meta-period";
import { getMetaData } from "@/lib/dota/meta/store";
import type { MetaLetter } from "@/lib/dota/meta/scoring";
import {
  buildMetaView,
  heroesFromCatalog,
  movers,
  SINGLE_ROLES,
  type HeroInfo,
  type MetaHeroRow,
  type MetaView,
} from "@/lib/dota/meta/view";
import { YOUNG_PATCH_DAYS, currentPatchIndex, sortPatches, type PeriodKind } from "@/lib/dota/meta/windows";
import type { PreviaState } from "./estado";

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

/** O herói numa função: o que o detalhe da versão B mostra nas cinco funções. */
export interface RoleCell {
  role: SingleRole;
  letter: MetaLetter;
  adjusted: number;
  pick: number;
  matches: number;
  belowMin: boolean;
}

export interface PreviaData {
  state: PreviaState;
  /** Período mostrado: pediu o patch e ele ainda não tem dia inteiro, cai nos últimos 7 dias. */
  period: PeriodKind;
  fallback: boolean;
  periods: Array<{ kind: PeriodKind; patch: string | null }>;
  view: MetaView;
  roles: Record<SingleRole, MetaView>;
  movers: { up: MetaHeroRow[]; down: MetaHeroRow[] };
  pro: ProBlock | null;
  roleCells: Record<number, RoleCell[]>;
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

function roleCellsOf(roles: Record<SingleRole, MetaView>): Record<number, RoleCell[]> {
  const out: Record<number, RoleCell[]> = {};
  for (const role of SINGLE_ROLES) {
    for (const r of roles[role].rows) {
      (out[r.id] ??= []).push({ role, letter: r.letter, adjusted: r.adjustedWinRate, pick: r.pick, matches: r.matches, belowMin: r.belowMin });
    }
  }
  return out;
}

export async function loadPrevia(state: PreviaState): Promise<PreviaData> {
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
    roleCells: roleCellsOf(roles),
    summaryAt: data.summaryAt,
    patches: summary.patches,
    currentPatch: current?.name ?? null,
    previousPatch: periods.find((p) => p.kind === "previous")?.patch ?? null,
    young: period === "patch" && view.period.days < YOUNG_PATCH_DAYS ? view.period.days : null,
  };
}
