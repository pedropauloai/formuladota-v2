"use client";

// As colunas da tabela do /meta, na ordem da tela. A largura vem em % da tabela (tabela fixa): em 3440 o
// espaço a mais se divide entre as colunas, em vez de virar um buraco num lugar só.

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { MetaHeroRow } from "@/lib/dota/meta/view";
import { Delta, HeroFace, LetterBadge, Sparkline, fmtNum, fmtPct, toneClass } from "./meta-parts";

export interface Column {
  key: string;
  label: string;
  /** Fatia da largura da tabela, em %. */
  width: number;
  className: string;
  /** `rank`: a posição do herói na lista inteira (a busca não renumera). */
  render: (row: MetaHeroRow, rank: number) => ReactNode;
}

export interface ColumnContext {
  locale: string;
  mean: number;
  changeIndex: number | null;
  /** Título da coluna Variação; null esconde a coluna (no próprio patch anterior). */
  deltaTitle: string | null;
}

// Largura de cada coluna (soma 100). A coluna que não aparece sai da conta.
const LAYOUT: Array<[string, number]> = [
  ["rank", 3],
  ["hero", 19],
  ["grade", 8],
  ["adjusted", 11],
  ["winRate", 8],
  ["matches", 9],
  ["pick", 8],
  ["delta", 8],
  ["trend", 26],
];

type T = ReturnType<typeof useTranslations<"meta">>;

function numberColumns(ctx: ColumnContext, t: T): Record<string, Omit<Column, "width">> {
  const { locale, mean } = ctx;
  const num = "text-right font-body tabular-nums";
  return {
    adjusted: {
      key: "adjusted",
      label: t("colAdjusted"),
      className: num,
      render: (r) => <span className={cn("font-semibold", toneClass(r.adjustedWinRate, mean))}>{fmtPct(r.adjustedWinRate, locale)}</span>,
    },
    winRate: { key: "winRate", label: t("colWinRate"), className: cn(num, "text-text-muted"), render: (r) => fmtPct(r.winRate, locale) },
    matches: { key: "matches", label: t("colMatches"), className: cn(num, "text-gold"), render: (r) => fmtNum(r.matches, locale) },
    pick: { key: "pick", label: t("colPick"), className: cn(num, "text-gold"), render: (r) => fmtPct(r.pick, locale) },
    delta: {
      key: "delta",
      label: t("colDelta"),
      className: num,
      render: (r) => <Delta value={r.delta} locale={locale} title={r.delta === null ? t("deltaNone") : (ctx.deltaTitle ?? undefined)} />,
    },
  };
}

function otherColumns(ctx: ColumnContext, t: T): Record<string, Omit<Column, "width">> {
  return {
    rank: { key: "rank", label: t("colRank"), className: "text-right font-body tabular-nums text-text-faded", render: (_r, rank) => rank },
    hero: {
      key: "hero",
      label: t("colHero"),
      className: "text-left",
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <HeroFace src={r.face} name="" size={28} />
          <span className="truncate font-body text-sm font-medium text-text-display">{r.name}</span>
        </span>
      ),
    },
    grade: {
      key: "grade",
      label: t("colGrade"),
      className: "text-left",
      render: (r) => (
        <span className="flex items-center gap-2">
          <LetterBadge letter={r.letter} size="sm" />
          <span className="font-body text-[0.8rem] tabular-nums text-text-muted">{fmtNum(r.score, ctx.locale, 1)}</span>
        </span>
      ),
    },
    trend: {
      key: "trend",
      label: t("colTrend"),
      className: "text-right",
      // Estica com a célula até 24rem: mais larga que isso, a linha de 14 pontos achata e perde a leitura.
      render: (r) => <Sparkline values={r.trend} changeIndex={ctx.changeIndex} height={22} fluid className="ml-auto max-w-[24rem]" />,
    },
  };
}

export function useColumns(ctx: ColumnContext): Column[] {
  const t = useTranslations("meta");
  const all = { ...numberColumns(ctx, t), ...otherColumns(ctx, t) };
  const layout = LAYOUT.filter(([key]) => key !== "delta" || ctx.deltaTitle !== null);
  const total = layout.reduce((s, [, w]) => s + w, 0);
  return layout.flatMap(([key, weight]) => {
    const col = all[key];
    return col ? [{ ...col, width: (weight / total) * 100 }] : [];
  });
}
