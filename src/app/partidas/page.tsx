// /partidas: as partidas que o PPA jogou na live com a galera, registradas por ele com o ID no
// painel da fila. Com a liga ligada (flag fila_competitiva), o feed dela vem embaixo.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pagePreview } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { v2Page } from "@/components/v2";
import { ClientShell } from "@/components/client-shell/shell";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { PartyMatchesSection } from "./party-matches-section";
import { LigaFeed } from "./liga-feed";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("matchesFeed");
  return pagePreview({ title: t("partyMetaTitle"), description: t("partyMetaDescription"), path: "/partidas" });
}

export default async function PartidasPage(props: { searchParams: Promise<{ page?: string }> }) {
  const [params, { fila_competitiva }] = await Promise.all([props.searchParams, getFeatureFlags()]);
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);

  return (
    <ClientShell currentRoute="/partidas">
      <div className={cn(v2Page, "relative isolate mx-auto w-full max-w-6xl overflow-x-clip px-4 py-6 md:px-8 md:py-10 min-[2600px]:max-w-[1500px]")}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(55%_65%_at_30%_0%,var(--color-brand-primary-glow),transparent_72%)]" />
        {/* A paginação é do feed da liga: nas páginas seguintes dele, a lista da galera fica na primeira. */}
        {(page === 1 || !fila_competitiva) && <PartyMatchesSection />}
        {fila_competitiva && <LigaFeed page={page} />}
      </div>
    </ClientShell>
  );
}
