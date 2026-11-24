// PROTÓTIPO descartável: três versões do /meta reconstruído (dados novos da STRATZ por dia, nota com
// letra, profissional do patch) para o PPA escolher vendo. Só em desenvolvimento (o grupo (dev) responde
// 404 em produção). Abrir em /meta/previa?versao=a|b|c (debaixo de /meta, que o portão de login deixa
// abrir para o visitante); setas do teclado trocam a versão. O /meta do ar não muda até a escolha.

import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { panel, v2Page } from "@/components/v2";
import { ClientShell } from "@/components/client-shell/shell";
import { parseState } from "./estado";
import { loadPrevia, type PreviaData } from "./dados";
import { pageLocale } from "./cabecalho";
import { HowToRead, MoversCard, ProCard, RightColumn } from "./coluna";
import { MetaUiProvider } from "./contexto";
import { HeroInspector } from "./inspetor";
import { Seletor } from "./seletor";
import { VersaoA } from "./versao-a";
import { VersaoB, proCells } from "./versao-b";
import { VersaoC } from "./versao-c";

export const dynamic = "force-dynamic";

async function RightFor({ data }: { data: PreviaData }) {
  const [t, locale] = await Promise.all([getTranslations("metaV3"), pageLocale()]);
  if (data.state.versao === "b") {
    const deltaTitle = data.view.baseline ? t("deltaHelp", { patch: data.view.baseline.patch ?? "" }) : null;
    return (
      <RightColumn>
        <HeroInspector
          rows={data.view.rows}
          roleCells={data.roleCells}
          pro={proCells(data)}
          locale={locale}
          mean={data.view.mean}
          changeIndex={data.view.patchChangeIndex}
          trendDays={data.view.trendDays}
          deltaTitle={deltaTitle}
          role={data.state.role}
        />
        <HowToRead data={data} />
      </RightColumn>
    );
  }
  if (data.state.versao === "c") {
    return (
      <RightColumn>
        <HowToRead data={data} />
        <ProCard data={data} limit={8} />
        <MoversCard data={data} />
      </RightColumn>
    );
  }
  return (
    <RightColumn>
      <ProCard data={data} />
      <MoversCard data={data} />
      <HowToRead data={data} />
    </RightColumn>
  );
}

async function loadSafe(state: ReturnType<typeof parseState>): Promise<PreviaData | null> {
  try {
    return await loadPrevia(state);
  } catch (err) {
    console.error("[meta-previa] carregar:", err instanceof Error ? err.message : err);
    return null;
  }
}

export default async function MetaPrevia(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = parseState(await props.searchParams);
  const [data, t] = await Promise.all([loadSafe(state), getTranslations("metaV3")]);
  return (
    <MetaUiProvider initialQuery={state.q}>
      <ClientShell currentRoute="/meta" rightSidebar={data ? <RightFor data={data} /> : undefined} wideRightSidebar>
        <div className={cn(v2Page, "overflow-x-clip")}>
          {!data && <p className={cn(panel("neutral"), "m-8 p-6 font-body text-text-muted")}>{t("error")}</p>}
          {data && state.versao === "a" && <VersaoA data={data} />}
          {data && state.versao === "b" && <VersaoB data={data} />}
          {data && state.versao === "c" && <VersaoC data={data} />}
        </div>
      </ClientShell>
      <Seletor versao={state.versao} />
    </MetaUiProvider>
  );
}
