// PROTÓTIPO (meta-previa), versão B, "tabela de instrumento": linha de estado e abas grandes de função;
// uma tabela larga, ordenável por coluna, com a letra primeiro, a linha dos últimos dias, a variação e o
// profissional; o mouse numa linha leva o herói ao detalhe da coluna da direita.

import { getTranslations } from "next-intl/server";
import type { PreviaData } from "./dados";
import { MetaTitle, MinTabs, Notes, PeriodTabs, RoleTabs, SourceFooter, StateLine, pageLocale } from "./cabecalho";
import { SearchBox } from "./busca";
import { HowToRead } from "./coluna";
import { MetaTable, type ProCell } from "./tabela";

export function proCells(data: PreviaData): Record<number, ProCell & { wins: number }> {
  return Object.fromEntries((data.pro?.rows ?? []).map((r) => [r.id, { picks: r.picks, bans: r.bans, wins: r.wins }]));
}

export async function VersaoB({ data }: { data: PreviaData }) {
  const [t, locale] = await Promise.all([getTranslations("metaV3"), pageLocale()]);
  const deltaTitle = data.view.baseline ? t("deltaHelp", { patch: data.view.baseline.patch ?? "" }) : null;
  return (
    <div className="flex flex-col gap-4 px-8 pb-10 pt-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <MetaTitle data={data} className="text-4xl" />
          <StateLine data={data} />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border-strong pb-3">
          <RoleTabs data={data} big />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <PeriodTabs data={data} />
            <MinTabs data={data} />
            <SearchBox className="w-60" />
          </div>
        </div>
        <Notes data={data} />
      </header>
      <MetaTable
        rows={data.view.rows}
        variant="b"
        locale={locale}
        mean={data.view.mean}
        min={data.state.min}
        changeIndex={data.view.patchChangeIndex}
        deltaTitle={deltaTitle}
        pro={proCells(data)}
        roleCells={data.roleCells}
        initialSort={data.state.sort}
      />
      <div className="lg:hidden">
        <HowToRead data={data} id="como-ler-celular" />
      </div>
      <SourceFooter />
    </div>
  );
}
