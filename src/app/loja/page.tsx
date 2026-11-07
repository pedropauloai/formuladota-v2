// /loja: vitrine do catálogo ativo. Pública (visitante compra serviço sem login); some para
// todos com a flag "loja" desligada, inclusive admin (flag autoritativa).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getActiveProducts, type StoreMode, type StoreProduct } from "@/lib/loja/catalog";
import { getSlots, type SlotInfo } from "@/lib/loja/slots";
import { getOwnerProof } from "@/lib/loja/owner-proof";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { FeaturedProductCard, ProductCard } from "@/components/loja/product-card";
import { StoreHero } from "@/components/loja/store-hero";
import { BrandGlyph } from "@/components/loja/brand-glyph";

const YOUTUBE_CHANNEL = "https://www.youtube.com/@formuladota";

// Ordem da vitrine: o tempo contado do Pedro primeiro (âncora de preço), depois a live e o resto.
const SECTIONS: Array<{ key: string; modes: StoreMode[]; featured?: boolean }> = [
  { key: "Scheduled", modes: ["agendado"], featured: true },
  { key: "Live", modes: ["live"] },
  { key: "Off", modes: ["fora_da_live", "gravado"] },
  { key: "Digital", modes: ["digital"] },
];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("loja");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/loja" } };
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
  const slots = (await getSlots(products)) ?? new Map<string, SlotInfo>();

  return (
    <ClientShell currentRoute="/loja" hideRightSidebar>
      <StoreHero proof={proof} />
      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 md:px-8 md:py-14">
        {products.length === 0 && (
          <p className="rounded-md border border-border-subtle bg-bg-base p-6 text-sm text-text-muted">{t("empty")}</p>
        )}
        {SECTIONS.map((section) => {
          const items = products.filter((p) => section.modes.includes(p.mode));
          if (items.length === 0) return null;
          return (
            <StoreSection
              key={section.key}
              id={`secao-${section.key.toLowerCase()}`}
              title={t(`section${section.key}Title`)}
              text={t(`section${section.key}Text`)}
              items={items}
              slots={slots}
              featured={section.featured === true}
            />
          );
        })}
        <section className="flex flex-col gap-4 rounded-md border border-border-strong bg-bg-base p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl uppercase leading-none tracking-wide text-text-display">{t("freeTitle")}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-text-muted">{t("freeText")}</p>
          </div>
          <a
            href={YOUTUBE_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border border-border-strong px-4 py-2.5 font-display text-base uppercase tracking-wide text-text-display transition-colors hover:border-text-muted"
          >
            <BrandGlyph brand="youtube" size={18} />
            {t("freeCta")}
            <ArrowUpRight size={15} aria-hidden="true" className="text-text-muted" />
          </a>
        </section>
      </div>
    </ClientShell>
  );
}

function StoreSection(props: {
  id: string;
  title: string;
  text: string;
  items: StoreProduct[];
  slots: Map<string, SlotInfo>;
  featured: boolean;
}) {
  return (
    <section aria-labelledby={props.id} className="space-y-5">
      <header className="space-y-1.5">
        <h2 id={props.id} className="font-display text-3xl uppercase leading-none tracking-wide text-text-display md:text-4xl">
          {props.title}
        </h2>
        <p className="text-sm text-text-muted">{props.text}</p>
      </header>
      <div className={props.featured || props.items.length === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        {props.items.map((product) =>
          props.featured ? (
            <FeaturedProductCard key={product.id} product={product} slots={props.slots.get(product.id)} />
          ) : (
            <ProductCard key={product.id} product={product} slots={props.slots.get(product.id)} />
          )
        )}
      </div>
    </section>
  );
}
