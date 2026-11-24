// Página /meta — estatísticas de heróis do Dota 2 POR FUNÇÃO (pos 1-5).
// Server Component no padrão denso do cliente Dota 2.
//
// "Comprar, não construir": nome/ícone/atributo vêm do catálogo estático de heróis e os
// números por posição vêm da Stratz, guardados no banco pelo cron (dota_meta_cache).
// META = padrão objetivo: só o dado, ordenado por win rate.

import type { Metadata } from "next";
import { pagePreview } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { BarChart3 } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { EmptyState } from "@/components/ui/empty-state";
import heroesCatalog from "@/data/dota-heroes.json";
import { getPositionStats, type CachedPositionStats } from "@/lib/dota/meta-cache";
import { buildMetaRows, heroSourcesFromCatalog, type MetaPosition } from "@/lib/dota/hero-meta";
import {
  MetaFilters,
  MetaTable,
  TopHeroes,
  type MetaFilterState,
} from "@/components/meta/hero-meta-table";
import { MetaPeriod } from "@/components/meta/meta-period";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return pagePreview({ title: t("metaTitle"), description: t("metaDescription"), path: "/meta" });
}

const VALID_POSITIONS: MetaPosition[] = ["all", "1", "2", "3", "4", "5"];

export default async function MetaPage(props: {
  searchParams: Promise<{ position?: string }>;
}) {
  const t = await getTranslations("meta");
  const params = await props.searchParams;

  const state: MetaFilterState = {
    position: VALID_POSITIONS.includes(params.position as MetaPosition)
      ? (params.position as MetaPosition)
      : "all",
  };
  const meta = await loadMeta();

  return (
    <ClientShell currentRoute="/meta">
      <div className="px-6 py-10 xl:px-12">
        <header className="mb-8">
          <h1 className="font-display text-4xl uppercase tracking-tight text-text-display md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl font-display text-sm font-semibold text-text-body 2xl:text-base">
            {t("subtitle")}
          </p>
          {meta && <MetaPeriod window={meta.window} patches={meta.patches} refreshedAt={meta.refreshedAt} />}
        </header>

        <MetaContent state={state} meta={meta} />
      </div>
    </ClientShell>
  );
}

// O cabeçalho e a tabela usam a mesma leitura; a falha vira null e a página mostra o aviso.
async function loadMeta(): Promise<CachedPositionStats | null> {
  try {
    return await getPositionStats();
  } catch (err) {
    console.error("[meta] carregar o meta:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function MetaContent({ state, meta }: { state: MetaFilterState; meta: CachedPositionStats | null }) {
  const t = await getTranslations("meta");

  if (!meta) {
    return (
      <>
        <MetaFilters state={state} />
        <EmptyState title={t("error")} icon={<BarChart3 />} principle="random" />
      </>
    );
  }
  const result = buildMetaRows(heroSourcesFromCatalog(heroesCatalog), meta.stats, state.position);

  return (
    <>
      <MetaFilters state={state} />
      {result.rows.length === 0 ? (
        <EmptyState title={t("empty")} icon={<BarChart3 />} principle="random" />
      ) : (
        <>
          <TopHeroes rows={result.rows} />
          <MetaTable rows={result.rows} />
        </>
      )}
      <p className="mt-8 font-display text-sm uppercase tracking-widest text-text-faded">
        {t("source")}
      </p>
    </>
  );
}
