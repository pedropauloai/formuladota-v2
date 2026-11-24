// Estado do /meta na URL, para o link levar o filtro junto (Discord, live). Lógica pura.
// /meta?position=all|1..5&period=patch|recent|previous&min=500&q=texto (o padrão fica fora da URL)

import { META_ROLES, type MetaRole } from "./view";
import { PERIOD_KINDS, type PeriodKind } from "./windows";

export const MIN_OPTIONS = [100, 500, 1000, 2000] as const;
export const DEFAULT_MIN = 500;
const MAX_QUERY = 40;
const BASE = "/meta";

export interface MetaPageState {
  role: MetaRole;
  period: PeriodKind;
  min: number;
  q: string;
}

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(value: string | undefined, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** Filtro desconhecido ou fora da lista volta ao padrão, sem erro. */
export function parseMetaState(params: Params): MetaPageState {
  const min = Number(one(params, "min"));
  return {
    role: pick(one(params, "position"), META_ROLES, "all"),
    period: pick(one(params, "period"), PERIOD_KINDS, "patch"),
    min: (MIN_OPTIONS as readonly number[]).includes(min) ? min : DEFAULT_MIN,
    q: (one(params, "q") ?? "").slice(0, MAX_QUERY),
  };
}

/** Link para o mesmo estado com alguma coisa trocada. */
export function metaHref(state: MetaPageState, change: Partial<MetaPageState>): string {
  const next = { ...state, ...change };
  const q = new URLSearchParams();
  if (next.role !== "all") q.set("position", next.role);
  if (next.period !== "patch") q.set("period", next.period);
  if (next.min !== DEFAULT_MIN) q.set("min", String(next.min));
  if (next.q) q.set("q", next.q);
  const query = q.toString();
  return query ? `${BASE}?${query}` : BASE;
}
