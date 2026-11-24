// PROTÓTIPO (meta-previa), versão C, "quadro de notas": as letras de S a F como faixas e as funções como
// colunas, com os rostos dos heróis no quadro e os números no mouse; a tabela vem como segundo nível.

import { getTranslations } from "next-intl/server";
import { POSITION_ICON } from "@/lib/dota/hero-assets";
import { SINGLE_ROLES } from "@/lib/dota/meta/view";
import type { PreviaData } from "./dados";
import { MetaTitle, MinTabs, Notes, PeriodTabs, RoleTabs, SourceFooter, StateLine, pageLocale, roleKey } from "./cabecalho";
import { SearchBox } from "./busca";
import { HowToRead } from "./coluna";
import { GradeBoard, type BoardColumn } from "./quadro";
import { MetaTable } from "./tabela";

async function boardColumns(data: PreviaData): Promise<BoardColumn[]> {
  const t = await getTranslations("metaV3");
  if (data.state.role === "all") {
    return SINGLE_ROLES.map((role) => ({
      key: role,
      label: t(roleKey(role)),
      icon: POSITION_ICON[role],
      rows: data.roles[role].rows.filter((r) => !r.belowMin),
    }));
  }
  const role = data.state.role;
  return [{ key: role, label: t(roleKey(role)), icon: POSITION_ICON[role], rows: data.view.rows.filter((r) => !r.belowMin) }];
}

export async function VersaoC({ data }: { data: PreviaData }) {
  const [t, locale] = await Promise.all([getTranslations("metaV3"), pageLocale()]);
  const deltaTitle = data.view.baseline ? t("deltaHelp", { patch: data.view.baseline.patch ?? "" }) : null;
  const hidden = data.state.role === "all" ? 0 : data.view.rows.filter((r) => r.belowMin).length;
  return (
    <div className="flex flex-col gap-4 px-8 pb-10 pt-6">
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
      <section aria-labelledby="quadro" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="quadro" className="font-display-condensed text-2xl uppercase leading-none tracking-[0.04em] text-text-display">
            {t("boardTitle")}
          </h2>
          <p className="font-body text-xs text-text-faded">{t("boardHint")}</p>
          {hidden > 0 && <p className="font-body text-xs text-text-faded">{t("boardHidden", { count: hidden })}</p>}
        </div>
        <GradeBoard columns={await boardColumns(data)} locale={locale} mean={data.view.mean} deltaTitle={deltaTitle} />
      </section>
      <section aria-labelledby="numeros" className="flex flex-col gap-2">
        <h2 id="numeros" className="font-display-condensed text-2xl uppercase leading-none tracking-[0.04em] text-text-display">
          {t("tableTitle")}
        </h2>
        <MetaTable
          rows={data.view.rows}
          variant="c"
          locale={locale}
          mean={data.view.mean}
          min={data.state.min}
          changeIndex={data.view.patchChangeIndex}
          deltaTitle={deltaTitle}
        />
      </section>
      <div className="lg:hidden">
        <HowToRead data={data} id="como-ler-celular" />
      </div>
      <SourceFooter />
    </div>
  );
}
