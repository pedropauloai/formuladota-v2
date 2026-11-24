"use client";

// PROTÓTIPO (meta-previa): a tabela densa das três versões. A: ordem pela nota, com a linha dos dias.
// B: ordenável por coluna (salvo na URL), barras, as cinco funções e o profissional; o mouse na linha leva
// o herói ao detalhe. C: segundo nível do quadro. Herói abaixo da amostra mínima fica apagado, no fim.

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { MetaHeroRow } from "@/lib/dota/meta/view";
import type { RoleCell } from "./dados";
import type { SortKey } from "./estado";
import { matchesQuery, useMetaUi } from "./contexto";
import { useColumns, type Column, type ProCell, type Variant } from "./colunas";
import { fmtNum } from "./pecas";

export type { ProCell } from "./colunas";

interface Props {
  rows: MetaHeroRow[];
  variant: Variant;
  locale: string;
  mean: number;
  min: number;
  changeIndex: number | null;
  /** Título da coluna Variação; null esconde a coluna (no próprio patch anterior). */
  deltaTitle: string | null;
  pro?: Record<number, ProCell>;
  roleCells?: Record<number, RoleCell[]>;
  initialSort?: SortKey;
}

const SORT_VALUE: Record<SortKey, (r: MetaHeroRow, pro?: Record<number, ProCell>) => number> = {
  grade: (r) => r.score,
  adjusted: (r) => r.adjustedWinRate,
  winRate: (r) => r.winRate,
  matches: (r) => r.matches,
  pick: (r) => r.pick,
  delta: (r) => r.delta ?? Number.NEGATIVE_INFINITY,
  pro: (r, pro) => (pro?.[r.id] ? (pro[r.id]?.picks ?? 0) + (pro[r.id]?.bans ?? 0) : -1),
};

function saveSort(sort: SortKey) {
  const url = new URL(window.location.href);
  if (sort === "grade") url.searchParams.delete("sort");
  else url.searchParams.set("sort", sort);
  window.history.replaceState(window.history.state, "", url);
}

function sortRows(rows: MetaHeroRow[], sort: SortKey, asc: boolean, pro?: Record<number, ProCell>): MetaHeroRow[] {
  const value = SORT_VALUE[sort];
  return [...rows].sort((a, b) => {
    if (a.belowMin !== b.belowMin) return a.belowMin ? 1 : -1;
    const diff = value(b, pro) - value(a, pro);
    return asc ? -diff : diff;
  });
}

function HeaderCell({ column, sortable, sort, asc, onSort }: { column: Column; sortable: boolean; sort: SortKey; asc: boolean; onSort: (key: SortKey) => void }) {
  const t = useTranslations("metaV3");
  const cls = cn(column.className, "truncate border-b border-border-strong px-2 py-2 text-xs font-semibold text-text-faded");
  if (!sortable || !column.sort) {
    return (
      <th scope="col" className={cls}>
        {column.header ?? column.label}
      </th>
    );
  }
  const key = column.sort;
  const active = sort === key;
  return (
    <th scope="col" className={cls} aria-sort={active ? (asc ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => onSort(key)} className={cn("inline-flex items-center gap-1 hover:text-text-display", active && "text-gold")} aria-label={t("sortBy", { column: column.label })}>
        {column.label}
        {active && (asc ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
      </button>
    </th>
  );
}

export function MetaTable(props: Props) {
  const t = useTranslations("metaV3");
  const { query, focusId, setFocusId } = useMetaUi();
  const [sort, setSort] = useState<SortKey>(props.initialSort ?? "grade");
  const [asc, setAsc] = useState(false);
  const sortable = props.variant === "b";
  const maxPick = useMemo(() => Math.max(1, ...props.rows.map((r) => r.pick)), [props.rows]);
  const columns = useColumns({ ...props, maxPick });
  const rows = useMemo(() => {
    const visible = props.rows.filter((r) => matchesQuery(r.name, query));
    return sortable ? sortRows(visible, sort, asc, props.pro) : visible;
  }, [props.rows, props.pro, query, sortable, sort, asc]);
  const firstBelow = rows.findIndex((r) => r.belowMin);

  const onSort = (key: SortKey) => {
    if (key === sort) return setAsc((v) => !v);
    setSort(key);
    setAsc(false);
    saveSort(key);
  };

  // No celular a tabela rola de lado dentro da própria caixa (a página não); no computador a caixa não
  // rola, para o cabeçalho fixo da versão B continuar preso no alto da tela.
  return (
    <div className="max-lg:overflow-x-auto">
    <table className="w-full min-w-[60rem] table-fixed border-separate border-spacing-0 font-body text-sm">
      <colgroup>
        {columns.map((c) => (
          <col key={c.key} style={{ width: `${c.width}%` }} />
        ))}
      </colgroup>
      <thead className={cn(sortable && "sticky top-0 z-[var(--z-elevated)]")}>
        <tr className="bg-bg-base/95">
          {columns.map((c) => (
            <HeaderCell key={c.key} column={c} sortable={sortable} sort={sort} asc={asc} onSort={onSort} />
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-2 py-6 text-center text-text-muted">
              {t("noMatch")}
            </td>
          </tr>
        )}
        {rows.map((r, i) => (
          <MetaTableRow
            key={r.id}
            row={r}
            index={i}
            columns={columns}
            focused={sortable && focusId === r.id}
            onFocus={sortable ? () => setFocusId(r.id) : undefined}
            before={
              i === firstBelow ? (
                <tr>
                  <td colSpan={columns.length} className="border-b border-border-subtle px-2 pb-1.5 pt-4 text-xs text-text-faded">
                    {t("belowMin", { count: rows.length - firstBelow, min: fmtNum(props.min, props.locale) })}
                  </td>
                </tr>
              ) : null
            }
          />
        ))}
      </tbody>
    </table>
    </div>
  );
}

function MetaTableRow(p: { row: MetaHeroRow; index: number; columns: Column[]; focused: boolean; onFocus?: () => void; before: ReactNode }) {
  return (
    <>
      {p.before}
      <tr
        onMouseEnter={p.onFocus}
        className={cn(
          "transition-colors hover:bg-bg-elevated/80",
          p.index % 2 === 1 && "bg-bg-deep/25",
          p.focused && "bg-bg-elevated",
          p.row.belowMin && "opacity-45"
        )}
      >
        {p.columns.map((c) => (
          <td key={c.key} className={cn(c.className, "h-9 overflow-hidden whitespace-nowrap border-b border-border-subtle/70 px-2")}>
            {c.render(p.row, p.index)}
          </td>
        ))}
      </tr>
    </>
  );
}
