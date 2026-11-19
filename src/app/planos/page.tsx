// /planos (EN /plans, ES /planes): a página do Battlepass FORMULADOTA, a mensalidade de R$ 120 (spec:
// docs/battlepass/spec.md). Aberta a todos. O painel da primeira dobra compra (cartão ou Pix), espera
// o pagamento e mostra o estado de quem assina; a volta do checkout do cartão chega com
// ?assinatura=<id>. O link curto /battlepass (next.config.ts) traz para cá.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClientShell } from "@/components/client-shell/shell";
import { getCurrentUser } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getMyBattlepass, type MyBattlepass } from "@/lib/battlepass/server";
import { getActiveProduct } from "@/lib/loja/catalog";
import { PARTY_PRODUCT_SLUG, getViewerSteam } from "@/lib/loja/fila/server";
import { getOwnerProof } from "@/lib/loja/owner-proof";
import { lerEnqueteLiga } from "@/lib/enquete/server";
import { languageAlternates, pagePreview } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { v2Page } from "@/components/v2";
import { BattlepassHero } from "@/components/battlepass/battlepass-hero";
import { BattlepassPanel } from "@/components/battlepass/battlepass-panel";
import { BattlepassIncludes } from "@/components/battlepass/battlepass-includes";
import { BattlepassRotation } from "@/components/battlepass/battlepass-rotation";
import { BattlepassClosing, BattlepassFaq, BattlepassFree } from "@/components/battlepass/battlepass-more";
import { SEAT_FALLBACK_CENTS } from "@/components/battlepass/layout";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("battlepass");
  return pagePreview({ title: t("metaTitle"), description: t("metaDescription"), path: "/planos", alternates: languageAlternates("/planos") });
}

interface Mine {
  me: MyBattlepass | null;
  failed: boolean;
}

async function readMine(userId: string): Promise<Mine> {
  try {
    return { me: await getMyBattlepass(userId), failed: false };
  } catch (err) {
    console.error("[battlepass] ler o Battlepass na /planos falhou:", err instanceof Error ? err.message : err);
    return { me: null, failed: true };
  }
}

/** Preço da vaga avulsa na party, do catálogo da loja (a /party usa o mesmo). */
async function seatPrice(): Promise<number> {
  const product = await getActiveProduct(PARTY_PRODUCT_SLUG).catch(() => null);
  return product?.variants[0]?.priceCents ?? SEAT_FALLBACK_CENTS;
}

export default async function PlanosPage({ searchParams }: { searchParams: SearchParams }) {
  const [user, flags, params] = await Promise.all([getCurrentUser(), getFeatureFlags(), searchParams]);
  // Enquete só com a flag dela ligada e as salas ainda pausadas: é a régua da volta das salas.
  const showPoll = flags.enquete_liga && !flags.fila_competitiva;
  const [mine, steam, proof, seatCents, poll] = await Promise.all([
    user ? readMine(user.id) : Promise.resolve<Mine>({ me: null, failed: false }),
    user ? getViewerSteam(user.id).catch(() => null) : Promise.resolve(null),
    getOwnerProof(),
    seatPrice(),
    showPoll ? lerEnqueteLiga({ userId: null, aparelhoId: null }, false) : Promise.resolve(null),
  ]);
  const returning = user && typeof params.assinatura === "string" && UUID.test(params.assinatura) ? params.assinatura : null;
  const state = mine.me?.view.state ?? "nenhum";
  const buying = !mine.failed && (state === "nenhum" || state === "encerrado");

  return (
    <ClientShell currentRoute="/planos" hideRightSidebar>
      <div className={cn(v2Page, "relative overflow-x-clip pb-24")}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(50%_60%_at_72%_0%,color-mix(in_oklab,var(--color-gold)_16%,transparent),transparent_72%)]"
        />
        <BattlepassHero
          proof={proof}
          panel={<BattlepassPanel initial={mine.me} hasSteam={!!steam} returningSubscription={returning} readFailed={mine.failed} />}
        />
        <BattlepassIncludes proof={proof} seatCents={seatCents} roomsOn={flags.fila_competitiva} pollYes={poll?.sim ?? null} />
        <BattlepassRotation />
        <BattlepassFree seatCents={seatCents} />
        <BattlepassFaq />
        {buying && <BattlepassClosing />}
      </div>
    </ClientShell>
  );
}
