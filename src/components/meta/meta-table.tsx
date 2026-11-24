"use client";

// A tabela densa do /meta, na ordem da nota, com a linha dos últimos dias. Herói abaixo da amostra
// mínima fica apagado, no fim, abaixo de uma linha que explica o porquê. A busca filtra por nome.

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { MetaHeroRow } from "@/lib/dota/meta/view";
import { matchesQuery, useMetaUi } from "./meta-ui";
import { useColumns, type Column, type ColumnContext } from "./meta-columns";
import { fmtNum } from "./meta-parts";

interface Props extends ColumnContext {
  rows: MetaHeroRow[];
  min: number;
}

export function MetaTable(props: Props) {
  const t = useTranslations("meta");
  const { query } = useMetaUi();
  const columns = useColumns(props);
  // A posição é a da lista inteira: a busca filtra, mas não renumera.
  const rows = useMemo(
    () => props.rows.map((row, i) => ({ row, rank: i + 1 })).filter(({ row }) => matchesQuery(row.name, query)),
    [props.rows, query]
  );
  const firstBelow = rows.findIndex(({ row }) => row.belowMin);

  // No celular a tabela rola de lado dentro da própria caixa, e a página não.
  return (
    <div className="max-lg:overflow-x-auto">
      <table className="w-full min-w-[60rem] table-fixed border-separate border-spacing-0 font-body text-sm">
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={{ width: `${c.width}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-bg-base/95">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn(c.className, "truncate border-b border-border-strong px-2 py-2 text-xs font-semibold text-text-faded")}>
                {c.label}
              </th>
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
          {rows.map(({ row, rank }, i) => (
            <MetaTableRow
              key={row.id}
              row={row}
              rank={rank}
              striped={i % 2 === 1}
              columns={columns}
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

function MetaTableRow(p: { row: MetaHeroRow; rank: number; striped: boolean; columns: Column[]; before: ReactNode }) {
  return (
    <>
      {p.before}
      <tr className={cn("transition-colors hover:bg-bg-elevated/80", p.striped && "bg-bg-deep/25", p.row.belowMin && "opacity-45")}>
        {p.columns.map((c) => (
          <td key={c.key} className={cn(c.className, "h-9 overflow-hidden whitespace-nowrap border-b border-border-subtle/70 px-2")}>
            {c.render(p.row, p.rank)}
          </td>
        ))}
      </tr>
    </>
  );
}
