// /meta: o painel do patch na medalha Imortal. Os 5 melhores de cada função, a tabela com vitória,
// vitória ajustada, escolha, nota com letra, variação contra o fim do patch anterior e os últimos 14
// dias, e na coluna da direita o profissional, quem subiu e caiu e o "Como ler".
//
// Dado lento guardado no banco (dota_meta_cache) pelo cron do site: a página só lê (src/lib/dota/meta).
// Os filtros moram na URL, para o link levar o filtro junto.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pagePreview } from "@/lib/seo";
import { v2Page } from "@/components/v2";
import { ClientShell } from "@/components/client-shell/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { loadMetaPage, type MetaPageData } from "@/lib/dota/meta/page-data";
import { parseMetaState, type MetaPageState } from "@/lib/dota/meta/url-state";
import { MetaUiProvider } from "@/components/meta/meta-ui";
import { MetaPanel } from "@/components/meta/meta-panel";
import { HowToRead, MoversCard, ProCard, RightColumn } from "@/components/meta/meta-side";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return pagePreview({ title: t("metaTitle"), description: t("metaDescription"), path: "/meta" });
}

// A falha vira null e a página mostra o aviso, em vez de derrubar a tela.
async function loadSafe(state: MetaPageState): Promise<MetaPageData | null> {
  try {
    return await loadMetaPage(state);
  } catch (err) {
    console.error("[meta] carregar:", err instanceof Error ? err.message : err);
    return null;
  }
}

export default async function MetaPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = parseMetaState(await props.searchParams);
  const [data, t] = await Promise.all([loadSafe(state), getTranslations("meta")]);
  const right = data ? (
    <RightColumn>
      <ProCard data={data} />
      <MoversCard data={data} />
      <HowToRead data={data} />
    </RightColumn>
  ) : undefined;
  return (
    <MetaUiProvider initialQuery={state.q}>
      <ClientShell currentRoute="/meta" rightSidebar={right} wideRightSidebar>
        <div className={cn(v2Page, "overflow-x-clip")}>
          {data ? (
            <MetaPanel data={data} />
          ) : (
            <div className="px-8 py-10">
              <EmptyState title={t("error")} icon={<BarChart3 />} principle="random" />
            </div>
          )}
        </div>
      </ClientShell>
    </MetaUiProvider>
  );
}
