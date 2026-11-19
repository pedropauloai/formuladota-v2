// /loja/[slug]: página do produto com o formulário de compra ao lado (embaixo, no celular, com
// um atalho no topo). Produto com vaga contada mostra o contador e, esgotado, troca o formulário
// pelo aviso de quando as vagas abrem.

import type { Metadata } from "next";
import { pagePreview } from "@/lib/seo";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowDown, ArrowLeft, LogIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ClientShell } from "@/components/client-shell/shell";
import { MiniMarkdown } from "@/components/changelog/mini-markdown";
import { CheckoutForm, type CheckoutBooking } from "@/components/loja/checkout-form";
import { ItemArt } from "@/components/loja/item-art";
import { ModeTag } from "@/components/loja/mode-tag";
import { SlotsMeter } from "@/components/loja/slots-meter";
import { SoldOutPanel } from "@/components/loja/sold-out-panel";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getActiveProduct } from "@/lib/loja/catalog";
import { getSlots } from "@/lib/loja/slots";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { getAgendaData, getUpcomingLives } from "@/lib/loja/agenda-server";
import type { StoreProduct } from "@/lib/loja/catalog";
import { mdBullets } from "@/lib/loja/text";
import { cn } from "@/lib/utils";
import { Panel, Price, plate, v2Page } from "@/components/v2";

type Params = { params: Promise<{ slug: string }> };
type PageProps = Params & { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Quantidade escolhida na vitrine (?qtd=2); qualquer outra coisa vira 1. */
function quantityFrom(raw: string | string[] | undefined): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProduct(slug);
  const t = await getTranslations("loja");
  if (!product) return { title: t("metaTitle") };
  return pagePreview({ title: `${product.title} | ${t("metaTitle")}`, description: product.summary, path: `/loja/${slug}` });
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

/** Agenda do produto para o formulário: horários livres, lives com vaga, ou nada. */
async function bookingFor(product: StoreProduct): Promise<CheckoutBooking> {
  if (product.bookingMode === "agenda") {
    const agenda = await getAgendaData(product, 1);
    return { mode: "agenda", windows: agenda.windows, busy: agenda.busy, sessionMinutes: product.sessionMinutes ?? 60, perQuantity: product.maxQuantity > 1 };
  }
  if (product.bookingMode === "live") return { mode: "live", lives: await getUpcomingLives(product) };
  return null;
}

export default async function ProdutoPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) redirect("/");
  const product = await getActiveProduct(slug);
  if (!product) notFound();
  // A vaga na party se compra na fila, que já vende para a live no ar ou para a próxima marcada,
  // com login e Steam (o Pedro convida pela Steam, e a pessoa vê a própria vez).
  if (product.liveSeat === "party") {
    const qtd = quantityFrom(query.qtd);
    redirect(qtd > 1 ? `/party?qtd=${qtd}` : "/party");
  }

  const supabase = await createClient();
  const [{ data: { user } }, slotMap, booking, t] = await Promise.all([
    supabase.auth.getUser(),
    getSlots([product]),
    bookingFor(product),
    getTranslations("loja"),
  ]);
  const noLive = booking?.mode === "live" && booking.lives.length === 0;
  const slots = slotMap?.get(product.id);
  const needsLogin = product.requiresLogin && !user;

  return (
    <ClientShell currentRoute="/loja" hideRightSidebar>
      <div className={cn(v2Page, "mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 overflow-x-clip px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12")}>
        <article className="min-w-0 space-y-8">
          <Link href="/loja" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-display">
            <ArrowLeft size={14} aria-hidden="true" /> {t("backToStore")}
          </Link>
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Ícone da Valve tem 88x64: fica no tamanho nativo ou menor, para não borrar. */}
            <span className="grid shrink-0 place-items-center self-start rounded-sm bg-bg-deep p-3 shadow-[inset_0_0_0_1px_var(--color-border-gold),0_0_22px_var(--fd-raw-gold-glow-soft)]">
              <ItemArt art={product.art} size="md" className="border-0" />
            </span>
            <div className="min-w-0 space-y-3">
              <ModeTag mode={product.mode} />
              <h1 className="font-display-condensed text-[3rem] uppercase leading-[0.85] text-text-display md:text-[4rem]">{product.title}</h1>
              <p className="text-base leading-relaxed text-text-body">{product.summary}</p>
              <Price cents={product.fromPriceCents} unit={product.priceUnit} className="text-[3rem]" />
              {slots && <SlotsMeter slots={slots} />}
              <a href="#comprar" className={cn(plate({ kind: "ghost" }), "lg:hidden")}>
                {t("buyNow")} <ArrowDown size={14} aria-hidden="true" />
              </a>
            </div>
          </header>
          {product.descriptionMd && <MiniMarkdown source={product.descriptionMd} />}
          {product.deliveryMd && (
            <Panel as="section" className="p-5">
              <h2 className="font-display-condensed text-[1.8rem] uppercase leading-none text-text-display">{t("howItWorks")}</h2>
              <DeliverySteps md={product.deliveryMd} />
            </Panel>
          )}
        </article>

        <aside id="comprar" className="min-w-0 scroll-mt-24 self-start lg:sticky lg:top-6">
          {needsLogin ? (
            <Panel tone="gold" shadow="gold" className="space-y-4 p-5">
              <p className="text-sm text-text-body">{t("loginRequired")}</p>
              <a href={`/login?next=${encodeURIComponent(`/loja/${product.slug}`)}`} className={plate({ kind: "brand", block: true })}>
                <LogIn size={16} aria-hidden="true" /> {t("login")}
              </a>
            </Panel>
          ) : slots?.left === 0 ? (
            <SoldOutPanel slots={slots} />
          ) : noLive ? (
            <Panel data-loja-esgotado className="space-y-2 p-5">
              <p className="font-display-condensed text-[1.9rem] uppercase leading-none text-text-display">{t("noLiveTitle")}</p>
              <p className="text-sm text-text-muted">{t("noLiveText")}</p>
            </Panel>
          ) : (
            <CheckoutForm
              slug={product.slug}
              variants={product.variants}
              formFields={product.formFields}
              maxQuantity={product.maxQuantity}
              priceUnit={product.priceUnit}
              mmrTiers={product.mmrTiers}
              booking={booking}
              defaultEmail={user?.email ?? ""}
              initialQuantity={quantityFrom(query.qtd)}
            />
          )}
        </aside>
      </div>
    </ClientShell>
  );
}
