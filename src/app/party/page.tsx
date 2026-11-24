// /party (ES /grupo): a fila da party ao vivo. A live na tela, quem está na party do Pedro, a fila
// e a compra da vaga com Pix na página. Aberta a todos com a flag "loja" ligada; comprar pede
// login com Discord e Steam vinculada. Spec: docs/loja/fila-da-party.md.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { pagePreview } from "@/lib/seo";
import { ClientShell } from "@/components/client-shell/shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { getActiveProduct } from "@/lib/loja/catalog";
import { PARTY_PRODUCT_SLUG, getQueueState, getViewerSteam } from "@/lib/loja/fila/server";
import { PartyQueuePage } from "@/components/loja/fila/party-queue-page";
import { HowItWorks } from "@/components/loja/fila/how-it-works";
import type { FilaOffer, FilaViewer } from "@/components/loja/fila/buy-box";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("fila");
  return pagePreview({ title: t("metaTitle"), description: t("metaDescription"), path: "/party" });
}

async function redirectHomeKeepingUtm(searchParams: SearchParams): Promise<never> {
  // Loja fechada: leva para a home sem perder a UTM do QR da live (a visita conta igual).
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (key.startsWith("utm_") && typeof value === "string") query.set(key, value);
  }
  redirect(query.size > 0 ? `/?${query}` : "/");
}

/** Quantidade escolhida na vitrine da loja (?qtd=2); qualquer outra coisa vira 1. */
function quantityFrom(raw: string | string[] | undefined): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function PartyPage({ searchParams }: { searchParams: SearchParams }) {
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) await redirectHomeKeepingUtm(searchParams);
  const user = await getCurrentUser();
  const [view, product, steam] = await Promise.all([
    getQueueState(user?.id ?? null),
    getActiveProduct(PARTY_PRODUCT_SLUG),
    user ? getViewerSteam(user.id) : Promise.resolve(null),
  ]);
  const variant = product?.variants[0];
  const offer: FilaOffer = {
    priceCents: variant?.priceCents ?? 2500,
    maxQuantity: product?.maxQuantity ?? 1,
    onSale: !!product && !!variant && product.liveSeat === "party",
  };
  const initialQuantity = Math.min(quantityFrom((await searchParams).qtd), offer.maxQuantity);
  const viewer: FilaViewer = { loggedIn: !!user, hasSteam: !!steam, dotaId: steam?.dotaId ?? null, mpPublicKey: process.env.MP_PUBLIC_KEY ?? null };

  return (
    <ClientShell currentRoute="/party" hideRightSidebar hideBottomBar>
      <PartyQueuePage initial={view} viewer={viewer} offer={offer} initialQuantity={initialQuantity} howItWorks={<HowItWorks />} />
    </ClientShell>
  );
}
