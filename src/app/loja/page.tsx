// /loja: vitrine do catálogo ativo. Pública (visitante compra serviço sem login); some para
// todos com a flag "loja" desligada, inclusive admin (flag autoritativa).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck, MessageCircle, KeyRound } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getActiveProducts } from "@/lib/loja/catalog";
import { ProductCard } from "@/components/loja/product-card";
import { formatBRL } from "@/lib/loja/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("loja");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/loja" } };
}

export default async function LojaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { loja } = await getFeatureFlags();
  if (!loja) {
    // Loja fechada: leva para a home sem perder a UTM do link da bio (a visita conta igual).
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (key.startsWith("utm_") && typeof value === "string") query.set(key, value);
    }
    redirect(query.size > 0 ? `/?${query}` : "/");
  }
  const [products, t] = await Promise.all([getActiveProducts(), getTranslations("loja")]);

  return (
    <ClientShell currentRoute="/loja" hideRightSidebar>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <header className="max-w-3xl space-y-3">
          <h1 className="font-display text-3xl uppercase tracking-tight text-text-display md:text-4xl">{t("title")}</h1>
          <p className="text-sm leading-relaxed text-text-muted md:text-base">{t("subtitle")}</p>
        </header>

        <ul className="grid gap-3 text-sm text-text-body md:grid-cols-3" aria-label="Garantias da compra">
          <TrustItem icon={<ShieldCheck size={16} aria-hidden="true" />} text={t("trustPayment")} />
          <TrustItem icon={<MessageCircle size={16} aria-hidden="true" />} text={t("trustContact")} />
          <TrustItem icon={<KeyRound size={16} aria-hidden="true" />} text={t("trustAccount")} />
        </ul>

        {products.length === 0 ? (
          <p className="rounded-md border border-border-subtle bg-bg-base p-6 text-sm text-text-muted">{t("empty")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const price = formatBRL(product.fromPriceCents);
              const priceLabel = product.variants.length === 1 ? price : t("fromPrice", { price });
              return <ProductCard key={product.id} product={product} priceLabel={priceLabel} cta={t("seeProduct")} />;
            })}
          </div>
        )}
      </div>
    </ClientShell>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2 rounded-md border border-border-subtle bg-bg-base/70 p-3">
      <span className="mt-0.5 text-success">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
