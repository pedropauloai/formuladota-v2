// Página /meta — estatísticas de heróis do Dota 2 POR FUNÇÃO (pos 1-5).
// Server Component no padrão denso do cliente Dota 2.
//
// "Comprar, não construir": metadata (nome/ícone/atributo) vem do OpenDota e os
// números por posição vêm da Stratz (heroStats.stats), ambos cacheados — sem
// reconstruir pipeline de dados e sem migration. META = padrão objetivo: só o
// dado, ordenado por win rate.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BarChart3 } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchHeroStats } from "@/lib/dota/opendota";
import { fetchPositionStats } from "@/lib/dota/stratz-meta";
import { buildMetaRows, type MetaPosition } from "@/lib/dota/hero-meta";
import {
  MetaFilters,
  MetaTable,
  TopHeroes,
  type MetaFilterState,
} from "@/components/meta/hero-meta-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("metaTitle"), description: t("metaDescription") };
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

  return (
    <ClientShell currentRoute="/meta">
      <div className="px-6 py-10 xl:px-12">
        <header className="mb-8">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-text-display md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl font-display text-sm font-semibold text-text-body 2xl:text-base">
            {t("subtitle")}
          </p>
        </header>

        <MetaContent state={state} />
      </div>
    </ClientShell>
  );
}

// Conteúdo (fetch + render) isolado pra manter a page enxuta e o erro contido.
async function MetaContent({ state }: { state: MetaFilterState }) {
  const t = await getTranslations("meta");

  let result;
  try {
    const [heroes, posStats] = await Promise.all([
      fetchHeroStats(),
      fetchPositionStats(),
    ]);
    result = buildMetaRows(heroes, posStats, state.position);
  } catch {
    return (
      <>
        <MetaFilters state={state} />
        <EmptyState title={t("error")} icon={<BarChart3 />} principle="random" />
      </>
    );
  }

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
