"use client";

// PROTÓTIPO (meta-previa): as colunas da tabela e a ordem de cada versão. A largura vem em % da tabela
// (tabela fixa): em 3440 o espaço a mais se divide entre as colunas, em vez de virar um buraco num lugar só.

import Image from "next/image";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { POSITION_ICON } from "@/lib/dota/hero-assets";
import type { MetaHeroRow } from "@/lib/dota/meta/view";
import type { RoleCell } from "./dados";
import type { SortKey } from "./estado";
import { Delta, HeroFace, LetterBadge, Sparkline, fmtNum, fmtPct, toneClass } from "./pecas";

export type Variant = "a" | "b" | "c";

export interface ProCell {
  picks: number;
  bans: number;
}

export interface Column {
  key: string;
  label: string;
  /** Cabeçalho próprio (os ícones das cinco funções); sem ele, o rótulo. */
  header?: ReactNode;
  sort?: SortKey;
  /** Fatia da largura da tabela, em %. */
  width: number;
  className: string;
  render: (row: MetaHeroRow, index: number) => ReactNode;
}

export interface ColumnContext {
  variant: Variant;
  locale: string;
  mean: number;
  maxPick: number;
  changeIndex: number | null;
  deltaTitle: string | null;
  pro?: Record<number, ProCell>;
  roleCells?: Record<number, RoleCell[]>;
}

// Largura de cada coluna por versão (soma 100). A coluna que não aparece é tirada da conta.
const LAYOUT: Record<Variant, Array<[string, number]>> = {
  a: [["rank", 3], ["hero", 19], ["grade", 8], ["adjusted", 11], ["winRate", 8], ["matches", 9], ["pick", 8], ["delta", 8], ["trend", 26]],
  b: [["grade", 8], ["hero", 15], ["roles", 12], ["adjusted", 12], ["winRate", 7], ["matches", 7], ["pick", 10], ["delta", 7], ["trend", 15], ["pro", 7]],
  c: [["rank", 4], ["hero", 26], ["grade", 10], ["adjusted", 14], ["winRate", 11], ["matches", 12], ["pick", 11], ["delta", 12]],
};

/** Barra que sai da média: verde para a direita acima dela, vermelha para a esquerda abaixo. */
function MeanBar({ value, mean }: { value: number; mean: number }) {
  const diff = Math.max(-6, Math.min(6, value - mean));
  return (
    <span className="relative inline-block h-2 w-16 shrink-0 rounded-sm bg-bg-deep/80" aria-hidden="true">
      <span className="absolute inset-y-0 left-1/2 w-px bg-text-faded/50" />
      <span
        className={cn("absolute inset-y-0 rounded-sm", diff >= 0 ? "left-1/2 bg-success/70" : "right-1/2 bg-brand-text/70")}
        style={{ width: `${(Math.abs(diff) / 6) * 50}%` }}
      />
    </span>
  );
}

const ROLE_ORDER = ["1", "2", "3", "4", "5"] as const;

/** Cabeçalho da coluna das funções: os cinco ícones, alinhados com as letras de baixo. */
function RoleIcons({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1" title={label} aria-label={label}>
      {ROLE_ORDER.map((role) => (
        <span key={role} className="flex w-5 justify-center">
          <Image src={POSITION_ICON[role]} alt="" width={14} height={14} className="size-3.5 object-contain" aria-hidden />
        </span>
      ))}
    </span>
  );
}

/** A letra do herói em cada uma das cinco funções; apagada onde ele não tem a amostra mínima. */
function RoleLetters({ cells }: { cells: RoleCell[] }) {
  const t = useTranslations("metaV3");
  return (
    <span className="flex items-center gap-1">
      {ROLE_ORDER.map((role) => {
        const c = cells.find((x) => x.role === role);
        if (!c) return <span key={role} className="w-5" />;
        return (
          <span key={role} title={`${t(`role${role}`)}: ${c.letter}`} className={cn("flex w-5 justify-center", c.belowMin && "opacity-30")}>
            <LetterBadge letter={c.letter} size="sm" />
          </span>
        );
      })}
    </span>
  );
}

function numberColumns(ctx: ColumnContext, t: ReturnType<typeof useTranslations<"metaV3">>): Record<string, Omit<Column, "width">> {
  const { locale, mean, variant } = ctx;
  const num = "text-right font-body tabular-nums";
  return {
    adjusted: {
      key: "adjusted",
      label: t("colAdjusted"),
      sort: "adjusted",
      className: num,
      render: (r) => (
        <span className="inline-flex items-center justify-end gap-2.5">
          {variant === "b" && <MeanBar value={r.adjustedWinRate} mean={mean} />}
          <span className={cn("font-semibold", toneClass(r.adjustedWinRate, mean))}>{fmtPct(r.adjustedWinRate, locale)}</span>
        </span>
      ),
    },
    winRate: { key: "winRate", label: t("colWinRate"), sort: "winRate", className: cn(num, "text-text-muted"), render: (r) => fmtPct(r.winRate, locale) },
    matches: { key: "matches", label: t("colMatches"), sort: "matches", className: cn(num, "text-gold"), render: (r) => fmtNum(r.matches, locale) },
    pick: {
      key: "pick",
      label: t("colPick"),
      sort: "pick",
      className: num,
      render: (r) => (
        <span className="inline-flex items-center justify-end gap-2 text-gold">
          {variant === "b" && (
            <span className="relative inline-block h-1.5 w-12 shrink-0 rounded-sm bg-bg-deep/80" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 rounded-sm bg-gold/60" style={{ width: `${Math.min(100, (r.pick / ctx.maxPick) * 100)}%` }} />
            </span>
          )}
          {fmtPct(r.pick, locale)}
        </span>
      ),
    },
    delta: {
      key: "delta",
      label: t("colDelta"),
      sort: "delta",
      className: num,
      render: (r) => <Delta value={r.delta} locale={locale} title={r.delta === null ? t("deltaNone") : (ctx.deltaTitle ?? undefined)} />,
    },
  };
}

function otherColumns(ctx: ColumnContext, t: ReturnType<typeof useTranslations<"metaV3">>): Record<string, Omit<Column, "width">> {
  const { locale, variant } = ctx;
  return {
    rank: { key: "rank", label: t("colRank"), className: "text-right font-body tabular-nums text-text-faded", render: (_r, i) => i + 1 },
    hero: {
      key: "hero",
      label: t("colHero"),
      className: "text-left",
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <HeroFace src={r.face} name="" size={variant === "b" ? 26 : 28} />
          <span className="truncate font-body text-sm font-medium text-text-display">{r.name}</span>
        </span>
      ),
    },
    grade: {
      key: "grade",
      label: t("colGrade"),
      sort: "grade",
      className: "text-left",
      render: (r) => (
        <span className="flex items-center gap-2">
          <LetterBadge letter={r.letter} size={variant === "b" ? "md" : "sm"} />
          <span className="font-body text-[0.8rem] tabular-nums text-text-muted">{fmtNum(r.score, locale, 1)}</span>
        </span>
      ),
    },
    roles: {
      key: "roles",
      label: t("inspectorRoles"),
      header: <RoleIcons label={t("inspectorRoles")} />,
      className: "text-left",
      render: (r) => <RoleLetters cells={ctx.roleCells?.[r.id] ?? []} />,
    },
    trend: {
      key: "trend",
      label: t("colTrend"),
      className: "text-right",
      // Estica com a célula até 24rem: mais larga que isso, a linha de 14 pontos achata e perde a leitura.
      render: (r) => <Sparkline values={r.trend} changeIndex={ctx.changeIndex} height={22} fluid className="ml-auto max-w-[24rem]" />,
    },
    pro: {
      key: "pro",
      label: t("colPro"),
      sort: "pro",
      className: "text-right font-body tabular-nums text-text-muted",
      render: (r) => {
        const cell = ctx.pro?.[r.id];
        return cell ? `${cell.picks} / ${cell.bans}` : "";
      },
    },
  };
}

export function useColumns(ctx: ColumnContext): Column[] {
  const t = useTranslations("metaV3");
  const all = { ...numberColumns(ctx, t), ...otherColumns(ctx, t) };
  const layout = LAYOUT[ctx.variant].filter(([key]) => key !== "delta" || ctx.deltaTitle !== null);
  const total = layout.reduce((s, [, w]) => s + w, 0);
  return layout.flatMap(([key, weight]) => {
    const col = all[key];
    return col ? [{ ...col, width: (weight / total) * 100 }] : [];
  });
}
