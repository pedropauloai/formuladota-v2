// /loja/[slug]: página do produto com o formulário de compra ao lado.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, LogIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ClientShell } from "@/components/client-shell/shell";
import { MiniMarkdown } from "@/components/changelog/mini-markdown";
import { CheckoutForm } from "@/components/loja/checkout-form";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getActiveProduct } from "@/lib/loja/catalog";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProduct(slug);
  const t = await getTranslations("loja");
  if (!product) return { title: t("metaTitle") };
  return { title: `${product.title} | ${t("metaTitle")}`, description: product.summary, alternates: { canonical: `/loja/${slug}` } };
}

export default async function ProdutoPage({ params }: Params) {
  const { slug } = await params;
  const { loja } = await getFeatureFlags();
  if (!loja) redirect("/");
  const product = await getActiveProduct(slug);
  if (!product) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("loja");
  const needsLogin = product.requiresLogin && !user;

  return (
    <ClientShell currentRoute="/loja" hideRightSidebar>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_420px]">
        <article className="min-w-0 space-y-6">
          <Link href="/loja" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-display">
            <ArrowLeft size={14} aria-hidden="true" /> {t("backToStore")}
          </Link>
          <header className="space-y-3">
            <h1 className="font-display text-3xl uppercase tracking-tight text-text-display md:text-4xl">{product.title}</h1>
            <p className="text-base leading-relaxed text-text-body">{product.summary}</p>
          </header>
          {product.descriptionMd && <MiniMarkdown source={product.descriptionMd} />}
          {product.deliveryMd && (
            <section className="rounded-md border border-border-subtle bg-bg-base/70 p-5">
              <h2 className="font-display text-lg uppercase tracking-wide text-text-display">{t("howItWorks")}</h2>
              <MiniMarkdown source={product.deliveryMd} />
            </section>
          )}
        </article>

        <aside className="self-start lg:sticky lg:top-6">
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
          ) : (
            <CheckoutForm
              slug={product.slug}
              variants={product.variants}
              formFields={product.formFields}
              defaultEmail={user?.email ?? ""}
            />
          )}
        </aside>
      </div>
    </ClientShell>
  );
}
