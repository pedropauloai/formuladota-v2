// /loja: vitrine no design 2.0, versão "Ao vivo" (escolhida pelo Pedro em 19/11/2026). O palco
// com a live da Twitch quando ele está no ar (o quadro real da live fora do ar), a party com a
// vaga acesa e a compra da vaga ao lado; embaixo, a credencial e o resto da loja em linhas.
// Pública (visitante compra serviço sem login); some para todos com a flag "loja" desligada,
// inclusive admin (flag autoritativa).

import type { Metadata } from "next";
import { pagePreview } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getActiveProducts } from "@/lib/loja/catalog";
import { getSlots, type SlotInfo } from "@/lib/loja/slots";
import { getOwnerProof } from "@/lib/loja/owner-proof";
import { getUpcomingLives } from "@/lib/loja/agenda-server";
import { isLiveOnAir } from "@/lib/loja/fila/server";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { cn } from "@/lib/utils";
import { Panel, plate, v2Page } from "@/components/v2";
import { StoreStage } from "@/components/loja/store-stage";
import { PartyBuyPanel } from "@/components/loja/party-buy-panel";
import { OwnerStrip } from "@/components/loja/owner-strip";
import { ServiceRows } from "@/components/loja/service-rows";
import { BrandGlyph } from "@/components/loja/brand-glyph";

const YOUTUBE_CHANNEL = "https://www.youtube.com/@formuladota";
// 1152 px até 2600 px de tela: a coluna de amigos (sobreposta, aberta por padrão para quem está logado)
// não cobre o palco. Acima disso, a página já cresce pelo zoom da tela alta.
const WRAP = "mx-auto w-full max-w-6xl px-4 md:px-8 min-[2600px]:max-w-[1500px]";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("loja");
  return pagePreview({ title: t("metaTitle"), description: t("metaDescription"), path: "/loja" });
}

async function redirectHomeKeepingUtm(searchParams: Promise<Record<string, string | string[] | undefined>>): Promise<never> {
  // Loja fechada: leva para a home sem perder a UTM do link da bio (a visita conta igual).
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (key.startsWith("utm_") && typeof value === "string") query.set(key, value);
  }
  redirect(query.size > 0 ? `/?${query}` : "/");
}

export default async function LojaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) await redirectHomeKeepingUtm(searchParams);
  const [products, proof, t] = await Promise.all([getActiveProducts(), getOwnerProof(), getTranslations("loja")]);
  const party = products.find((p) => p.liveSeat === "party") ?? null;
  const [slotMap, lives, onAir] = await Promise.all([
    getSlots(products),
    party ? getUpcomingLives(party).catch(() => []) : Promise.resolve([]),
    // Live aberta pelo Pedro no painel: a vaga se compra direto na fila.
    party ? isLiveOnAir().catch(() => false) : Promise.resolve(false),
  ]);
  const slots = slotMap ?? new Map<string, SlotInfo>();
  const rest = products.filter((p) => p.id !== party?.id);

  return (
    <ClientShell currentRoute="/loja" hideRightSidebar>
      <div className={cn(v2Page, "relative overflow-x-clip pb-24")}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(55%_65%_at_35%_0%,var(--color-brand-primary-glow),transparent_72%)]" />

        <section className={cn(WRAP, "relative grid grid-cols-[minmax(0,1fr)] gap-4 pt-6 md:pt-8 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:gap-5 min-[2600px]:grid-cols-[minmax(0,1fr)_420px]")}>
          <StoreStage proof={proof} nextLive={lives[0] ?? null} />
          {party ? (
            <Panel as="aside" tone="gold" shadow="gold" wrapperClassName="h-full" className="h-full p-5 md:p-6">
              <PartyBuyPanel
                slug={party.slug}
                title={party.title}
                summary={party.summary}
                priceCents={party.fromPriceCents}
                maxQuantity={party.maxQuantity}
                queueHref={onAir ? "/party" : undefined}
              />
            </Panel>
          ) : (
            <h1 className="sr-only">{t("metaTitle")}</h1>
          )}
        </section>

        <div className={cn(WRAP, "relative mt-10")}>
          <OwnerStrip proof={proof} />
        </div>

        <div className={cn(WRAP, "relative mt-12")}>
          {products.length === 0 ? (
            <Panel className="p-6">
              <p className="text-sm text-text-muted">{t("empty")}</p>
            </Panel>
          ) : (
            <ServiceRows products={rest} slots={slots} />
          )}
        </div>

        <div className={cn(WRAP, "relative mt-12")}>
          <a
            href={YOUTUBE_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-wrap items-center justify-between gap-3 border-y border-border-subtle px-2 py-4 md:px-4"
          >
            <span className="flex items-center gap-3">
              <BrandGlyph brand="youtube" size={26} />
              <span>
                <span className="block font-display-condensed text-[1.6rem] uppercase leading-none text-text-display">{t("freeTitle")}</span>
                <span className="text-sm text-text-muted">{t("freeText")}</span>
              </span>
            </span>
            <span className={cn(plate({ kind: "ghost" }), "group-hover:text-text-display")}>
              {t("freeCta")}
              <ArrowUpRight size={14} aria-hidden="true" />
            </span>
          </a>
        </div>
      </div>
    </ClientShell>
  );
}
