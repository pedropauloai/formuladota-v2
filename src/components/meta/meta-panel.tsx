// O centro do /meta, o "painel do patch": linha de estado e filtros, os 5 melhores de cada função lado a
// lado (ou de uma função só, em fileira) e a tabela densa embaixo. A coluna da direita fica em meta-side.

import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { panel } from "@/components/v2";
import { POSITION_ICON } from "@/lib/dota/hero-assets";
import type { MetaPageData } from "@/lib/dota/meta/page-data";
import { SINGLE_ROLES, type MetaHeroRow, type MetaView } from "@/lib/dota/meta/view";
import { MetaTitle, MinTabs, Notes, PeriodTabs, RoleTabs, SourceFooter, StateLine, pageLocale, roleKey } from "./meta-header";
import { SearchBox } from "./meta-search";
import { HowToRead } from "./meta-side";
import { MetaTable } from "./meta-table";
import { Delta, HeroFace, LetterBadge, fmtNum, fmtPct, toneClass } from "./meta-parts";

function top(view: MetaView, count = 5): MetaHeroRow[] {
  return view.rows.filter((r) => !r.belowMin).slice(0, count);
}

// Em tela larga (3440) cada função mostra os 10 primeiros em duas colunas, em vez de sobrar margem.
const WIDE_TOP = 10;

async function RoleColumn({ view, role }: { view: MetaView; role: (typeof SINGLE_ROLES)[number] }) {
  const [t, locale] = await Promise.all([getTranslations("meta"), pageLocale()]);
  return (
    <section className={cn(panel("neutral"), "flex min-w-0 flex-col")}>
      <header className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
        <Image src={POSITION_ICON[role]} alt="" width={18} height={18} className="size-[18px] object-contain" aria-hidden />
        <h3 className="truncate font-display-condensed text-xl uppercase leading-none tracking-[0.06em] text-text-display">{t(roleKey(role))}</h3>
      </header>
      <ol className="grid grid-flow-col grid-rows-5 py-1 min-[2600px]:grid-cols-2">
        {top(view, WIDE_TOP).map((r, i) => (
          <li key={r.id} className={cn("h-12 items-center gap-2.5 px-3 min-[2600px]:gap-2 min-[2600px]:px-2.5", i < 5 ? "flex" : "hidden min-[2600px]:flex")}>
            <span className="w-3 shrink-0 font-body text-xs tabular-nums text-text-faded min-[2600px]:w-4">{i + 1}</span>
            <HeroFace src={r.face} name="" size={30} />
            <span className="flex min-w-0 flex-1 flex-col">
              {/* Na coluna dupla da tela larga o nome quebra em duas linhas em vez de ser cortado. */}
              <span className="truncate font-body text-[0.85rem] font-medium leading-tight text-text-display min-[2600px]:whitespace-normal min-[2600px]:text-[0.8rem]">
                {r.name}
              </span>
              <span className="flex gap-2 font-body text-[0.75rem] leading-tight tabular-nums">
                <span className={cn("font-semibold", toneClass(r.adjustedWinRate, view.mean))} title={t("colAdjusted")}>
                  {fmtPct(r.adjustedWinRate, locale)}
                </span>
                <span className="text-gold" title={t("colPick")}>
                  {fmtPct(r.pick, locale)}
                </span>
              </span>
            </span>
            <LetterBadge letter={r.letter} size="md" className="min-[2600px]:h-6 min-[2600px]:w-6 min-[2600px]:text-lg" />
          </li>
        ))}
      </ol>
    </section>
  );
}

async function TopCard({ row, rank, view }: { row: MetaHeroRow; rank: number; view: MetaView }) {
  const [t, locale] = await Promise.all([getTranslations("meta"), pageLocale()]);
  return (
    <article className={cn(panel(rank === 1 ? "gold" : "neutral"), "flex items-center gap-3 p-3")}>
      <span className="font-display-condensed text-3xl leading-none text-text-faded">{rank}</span>
      <HeroFace src={row.face} name="" size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-body text-sm font-semibold text-text-display">{row.name}</p>
        <p className="flex items-center gap-2 font-body text-[0.78rem] tabular-nums">
          <span className={cn("font-semibold", toneClass(row.adjustedWinRate, view.mean))} title={t("colAdjusted")}>
            {fmtPct(row.adjustedWinRate, locale)}
          </span>
          <span className="text-gold" title={t("colPick")}>
            {fmtPct(row.pick, locale)}
          </span>
          <Delta value={row.delta} locale={locale} title={row.delta === null ? undefined : t("colDelta")} />
        </p>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <LetterBadge letter={row.letter} size="lg" />
        <span className="font-body text-[0.7rem] tabular-nums text-text-faded" title={t("colGrade")}>
          {fmtNum(row.score, locale, 1)}
        </span>
      </div>
    </article>
  );
}

async function BestBlock({ data }: { data: MetaPageData }) {
  const t = await getTranslations("meta");
  if (data.state.role === "all") {
    return (
      <section aria-labelledby="melhores" className="flex flex-col gap-2">
        <h2 id="melhores" className="font-display-condensed text-2xl uppercase leading-none tracking-[0.04em] text-text-display">
          <span className="min-[2600px]:hidden">{t("bestByRole", { count: 5 })}</span>
          <span className="hidden min-[2600px]:inline">{t("bestByRole", { count: WIDE_TOP })}</span>
        </h2>
        <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-2">
          {SINGLE_ROLES.map((role) => (
            <RoleColumn key={role} role={role} view={data.roles[role]} />
          ))}
        </div>
      </section>
    );
  }
  const rows = top(data.view);
  return (
    <section aria-labelledby="melhores" className="flex flex-col gap-2">
      <h2 id="melhores" className="font-display-condensed text-2xl uppercase leading-none tracking-[0.04em] text-text-display">
        {t("bestInRole", { count: rows.length, role: t(roleKey(data.state.role)) })}
      </h2>
      <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-1">
        {rows.map((r, i) => (
          <TopCard key={r.id} row={r} rank={i + 1} view={data.view} />
        ))}
      </div>
    </section>
  );
}

export async function MetaPanel({ data }: { data: MetaPageData }) {
  const [t, locale] = await Promise.all([getTranslations("meta"), pageLocale()]);
  const deltaTitle = data.view.baseline ? t("deltaHelp", { patch: data.view.baseline.patch ?? "" }) : null;
  // pb-36: no fim da rolagem o rodapé fica acima do cartão do canto de baixo (126 px da tela).
  return (
    <div className="flex flex-col gap-5 px-8 pb-36 pt-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          <MetaTitle data={data} className="text-5xl" />
          <StateLine data={data} className="pb-1" />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <RoleTabs data={data} />
          <PeriodTabs data={data} />
          <MinTabs data={data} />
          <SearchBox className="w-56" />
        </div>
        <Notes data={data} />
      </header>
      <BestBlock data={data} />
      <MetaTable
        rows={data.view.rows}
        locale={locale}
        mean={data.view.mean}
        min={data.state.min}
        changeIndex={data.view.patchChangeIndex}
        deltaTitle={deltaTitle}
      />
      <div className="lg:hidden">
        <HowToRead data={data} id="como-ler-celular" />
      </div>
      <SourceFooter />
    </div>
  );
}
