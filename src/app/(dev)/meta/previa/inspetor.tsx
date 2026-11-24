"use client";

// PROTÓTIPO (meta-previa), versão B: o detalhe do herói sob o mouse na coluna da direita, como o painel
// de item selecionado do cliente. Sem mouse em linha nenhuma, mostra o primeiro da tabela.

import Image from "next/image";
import { Crosshair } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { panel } from "@/components/v2";
import { CardHeader } from "@/components/client-shell/sidebar-card-header";
import { POSITION_ICON } from "@/lib/dota/hero-assets";
import type { MetaHeroRow } from "@/lib/dota/meta/view";
import type { RoleCell } from "./dados";
import { useMetaUi } from "./contexto";
import { Delta, LetterBadge, Sparkline, fmtNum, fmtPct, toneClass } from "./pecas";

interface ProCell {
  picks: number;
  bans: number;
  wins: number;
}

interface Props {
  rows: MetaHeroRow[];
  roleCells: Record<number, RoleCell[]>;
  pro: Record<number, ProCell>;
  locale: string;
  mean: number;
  changeIndex: number | null;
  trendDays: string[];
  deltaTitle: string | null;
  role: string;
}

function Stat({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-sm border border-border-subtle bg-bg-deep/50 px-2.5 py-1.5">
      <span className="font-body text-[0.7rem] text-text-faded">{label}</span>
      <span className={cn("font-body text-base font-semibold tabular-nums", className)}>{children}</span>
    </div>
  );
}

function dayLabel(day: string | undefined, locale: string): string {
  if (!day) return "";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(Date.parse(`${day}T00:00:00Z`));
}

export function HeroInspector(p: Props) {
  const t = useTranslations("metaV3");
  const { focusId } = useMetaUi();
  const hero = p.rows.find((r) => r.id === focusId) ?? p.rows[0];
  if (!hero) return null;
  const pro = p.pro[hero.id];
  const cells = p.roleCells[hero.id] ?? [];
  return (
    <article className={cn(panel("gold"), "overflow-hidden")} aria-live="polite">
      <CardHeader icon={Crosshair} title={t("inspectorTitle")} />
      {focusId === null && <p className="px-3 pt-2 font-body text-[0.75rem] text-text-faded">{t("inspectorHint")}</p>}
      <div className="flex gap-3 px-3 pt-3">
        <Image src={hero.portrait} alt={hero.name} width={176} height={99} className="h-[99px] w-[176px] shrink-0 rounded-sm object-cover" />
        <div className="flex min-w-0 flex-col justify-between">
          <p className="truncate font-display-condensed text-3xl uppercase leading-none text-text-display">{hero.name}</p>
          <div className="flex items-center gap-2">
            <LetterBadge letter={hero.letter} size="xl" />
            <div className="flex flex-col">
              <span className="font-body text-[0.7rem] text-text-faded">{t("colGrade")}</span>
              <span className="font-body text-xl font-semibold tabular-nums text-gold">{fmtNum(hero.score, p.locale, 1)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-3 pt-3">
        <Stat label={t("colAdjusted")} className={toneClass(hero.adjustedWinRate, p.mean)}>
          {fmtPct(hero.adjustedWinRate, p.locale)}
        </Stat>
        <Stat label={t("colWinRate")} className="text-text-body">
          {fmtPct(hero.winRate, p.locale)}
        </Stat>
        <Stat label={t("colDelta")}>
          {p.deltaTitle === null ? "" : <Delta value={hero.delta} locale={p.locale} title={p.deltaTitle} />}
        </Stat>
        <Stat label={t("colMatches")} className="text-gold">
          {fmtNum(hero.matches, p.locale)}
        </Stat>
        <Stat label={t("colPick")} className="text-gold">
          {fmtPct(hero.pick, p.locale)}
        </Stat>
        <Stat label={t("inspectorPro")} className="text-text-body">
          {pro ? `${pro.picks} / ${pro.bans}` : "0 / 0"}
        </Stat>
      </div>
      <div className="px-3 pt-3">
        <p className="font-body text-[0.7rem] text-text-faded">{t("colTrend")}</p>
        <Sparkline values={hero.trend} changeIndex={p.changeIndex} width={440} height={56} className="mt-1 w-full" />
        <div className="flex justify-between font-body text-[0.7rem] tabular-nums text-text-faded">
          <span>{dayLabel(p.trendDays[0], p.locale)}</span>
          <span>{dayLabel(p.trendDays.at(-1), p.locale)}</span>
        </div>
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="pb-1 font-body text-[0.7rem] text-text-faded">{t("inspectorRoles")}</p>
        <ul className="flex flex-col">
          {cells.map((c) => (
            <li key={c.role} className={cn("flex items-center gap-2 border-t border-border-subtle/60 py-1", c.belowMin && "opacity-45", p.role === c.role && "bg-bg-elevated/70")}>
              <Image src={POSITION_ICON[c.role]} alt="" width={16} height={16} className="size-4 object-contain" aria-hidden />
              <span className="w-24 font-body text-[0.8rem] text-text-display">{t(`role${c.role}`)}</span>
              <LetterBadge letter={c.letter} size="sm" />
              <span className={cn("ml-auto font-body text-[0.8rem] font-semibold tabular-nums", toneClass(c.adjusted, p.mean))}>{fmtPct(c.adjusted, p.locale)}</span>
              <span className="w-14 text-right font-body text-[0.8rem] tabular-nums text-gold">{fmtPct(c.pick, p.locale)}</span>
              <span className="w-16 text-right font-body text-[0.8rem] tabular-nums text-text-muted">{fmtNum(c.matches, p.locale)}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
