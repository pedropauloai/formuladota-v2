// /loja/[slug]: página do produto com o formulário de compra ao lado (embaixo, no celular, com
// um atalho no topo). Produto com vaga contada mostra o contador e, esgotado, troca o formulário
// pelo aviso de quando as vagas abrem.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowDown, ArrowLeft, LogIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ClientShell } from "@/components/client-shell/shell";
import { MiniMarkdown } from "@/components/changelog/mini-markdown";
import { CheckoutForm } from "@/components/loja/checkout-form";
import { ItemArt } from "@/components/loja/item-art";
import { ModeTag } from "@/components/loja/mode-tag";
import { SlotsMeter } from "@/components/loja/slots-meter";
import { SoldOutPanel } from "@/components/loja/sold-out-panel";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getActiveProduct } from "@/lib/loja/catalog";
import { getSlots } from "@/lib/loja/slots";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { formatPrice } from "@/lib/loja/money";
import { mdBullets } from "@/lib/loja/text";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProduct(slug);
  const t = await getTranslations("loja");
  if (!product) return { title: t("metaTitle") };
  return { title: `${product.title} | ${t("metaTitle")}`, description: product.summary, alternates: { canonical: `/loja/${slug}` } };
}

function DeliverySteps({ md }: { md: string }) {
  const steps = mdBullets(md);
  if (steps.length === 0) return <MiniMarkdown source={md} />;
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step, i) => (
        <li key={step} className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-gold/50 font-display text-base leading-none text-gold">
            {i + 1}
          </span>
          <span className="pt-1 text-sm leading-relaxed text-text-body">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function ProdutoPage({ params }: Params) {
  const { slug } = await params;
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) redirect("/");
  const product = await getActiveProduct(slug);
  if (!product) notFound();

  const supabase = await createClient();
  const [{ data: { user } }, slotMap, t] = await Promise.all([supabase.auth.getUser(), getSlots([product]), getTranslations("loja")]);
  const slots = slotMap?.get(product.id);
  const needsLogin = product.requiresLogin && !user;

  return (
    <ClientShell currentRoute="/loja" hideRightSidebar>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
        <article className="min-w-0 space-y-8">
          <Link href="/loja" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-display">
            <ArrowLeft size={14} aria-hidden="true" /> {t("backToStore")}
          </Link>
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <ItemArt art={product.art} size="xl" />
            <div className="min-w-0 space-y-3">
              <ModeTag mode={product.mode} />
              <h1 className="font-display text-4xl uppercase leading-none tracking-tight text-text-display md:text-5xl">{product.title}</h1>
              <p className="text-base leading-relaxed text-text-body">{product.summary}</p>
              <p className="flex items-baseline gap-2">
                <span className="font-display text-4xl leading-none tabular-nums text-gold">{formatPrice(product.fromPriceCents)}</span>
                {product.priceUnit && <span className="text-sm text-text-muted">{product.priceUnit}</span>}
              </p>
              {slots && <SlotsMeter slots={slots} />}
              <a
                href="#comprar"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-2 font-display text-sm uppercase tracking-wide text-text-body lg:hidden"
              >
                {t("buyNow")} <ArrowDown size={14} aria-hidden="true" />
              </a>
            </div>
          </header>
          {product.descriptionMd && <MiniMarkdown source={product.descriptionMd} />}
          {product.deliveryMd && (
            <section className="rounded-md border border-border-subtle bg-bg-base/70 p-5">
              <h2 className="font-display text-xl uppercase tracking-wide text-text-display">{t("howItWorks")}</h2>
              <DeliverySteps md={product.deliveryMd} />
            </section>
          )}
        </article>

        <aside id="comprar" className="scroll-mt-24 self-start lg:sticky lg:top-6">
          {needsLogin ? (
            <div className="space-y-4 rounded-md border border-border-strong bg-bg-base p-5">
              <p className="text-sm text-text-body">{t("loginRequired")}</p>
              <a
                href={`/login?next=${encodeURIComponent(`/loja/${product.slug}`)}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-primary px-4 py-3 font-display uppercase tracking-widest text-text-display hover:bg-brand-primary-hover"
              >
                <LogIn size={16} aria-hidden="true" /> {t("login")}
              </a>
            </div>
          ) : slots?.left === 0 ? (
            <SoldOutPanel slots={slots} />
          ) : (
            <CheckoutForm
              slug={product.slug}
              variants={product.variants}
              formFields={product.formFields}
              maxQuantity={product.maxQuantity}
              priceUnit={product.priceUnit}
              mmrTiers={product.mmrTiers}
              defaultEmail={user?.email ?? ""}
            />
          )}
        </aside>
      </div>
    </ClientShell>
  );
}
