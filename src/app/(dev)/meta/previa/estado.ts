// PROTÓTIPO (meta-previa): o estado da tela vem da URL, para o link levar o filtro junto (Discord, live).
// ?versao=a|b|c&position=all|1..5&period=patch|recent|previous&min=500&q=texto&sort=coluna

import { META_ROLES, type MetaRole } from "@/lib/dota/meta/view";
import { PERIOD_KINDS, type PeriodKind } from "@/lib/dota/meta/windows";

export type Versao = "a" | "b" | "c";
export const VERSOES: readonly Versao[] = ["a", "b", "c"];
export const MIN_OPTIONS = [100, 500, 1000, 2000] as const;
export const DEFAULT_MIN = 500;
export const SORT_KEYS = ["grade", "adjusted", "winRate", "matches", "pick", "delta", "pro"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface PreviaState {
  versao: Versao;
  role: MetaRole;
  period: PeriodKind;
  min: number;
  q: string;
  sort: SortKey;
}

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(value: string | undefined, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function parseState(params: Params): PreviaState {
  const min = Number(one(params, "min"));
  return {
    versao: pick(one(params, "versao"), VERSOES, "a"),
    role: pick(one(params, "position"), META_ROLES, "all"),
    period: pick(one(params, "period"), PERIOD_KINDS, "patch"),
    min: (MIN_OPTIONS as readonly number[]).includes(min) ? min : DEFAULT_MIN,
    q: (one(params, "q") ?? "").slice(0, 40),
    sort: pick(one(params, "sort"), SORT_KEYS, "grade"),
  };
}

const BASE = "/meta/previa";

/** Link para o mesmo estado com alguma coisa trocada; o padrão fica fora da URL. */
export function hrefFor(state: PreviaState, change: Partial<PreviaState>): string {
  const next = { ...state, ...change };
  const q = new URLSearchParams();
  q.set("versao", next.versao);
  if (next.role !== "all") q.set("position", next.role);
  if (next.period !== "patch") q.set("period", next.period);
  if (next.min !== DEFAULT_MIN) q.set("min", String(next.min));
  if (next.q) q.set("q", next.q);
  if (next.sort !== "grade") q.set("sort", next.sort);
  return `${BASE}?${q.toString()}`;
}
