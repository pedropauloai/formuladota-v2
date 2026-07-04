import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { PlansView } from "@/components/plans/plans-view";
import { SubscriptionPanel } from "@/components/plans/subscription-panel";
import { languageAlternates } from "@/lib/seo";
import { isSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import {
  resolveSubscriptionState,
  type SubscriptionRow,
} from "@/lib/subscriptions/state";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("planos");
  return { title: t("metaTitle"), alternates: languageAlternates("/planos") };
}

// Rota CANÔNICA de planos + assinatura (fusão 2026-07-04: /assinatura foi
// absorvida aqui — era duplicata fora do ClientShell, violando a filosofia
// "tudo é client" de 2026-05-24; agora é só redirect de compat).
//
// Rota pública (vitrine de conversão): visitante vê os planos + CTA de login;
// logado vê também o painel FUNCIONAL (assinar/cancelar/reativar, preço pela
// região de jogo). Retornos do MP/Stripe chegam aqui via ?success/?error/?info.
export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string; error?: string; info?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;

  // Logado: assinatura mais recente (o card de status gerencia; os botões da
  // vitrine assinam). Visitante: só a vitrine — botão dispara login Discord.
  let panel: React.ReactNode = null;
  let activeTier: SubscriptionTier | null = null;
  if (user) {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, status, started_at, next_payment_date, cancelled_at, tier, provider")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = (subscription as SubscriptionRow | null) ?? null;
    const state = resolveSubscriptionState(row);
    // Tier "vigente" (ativa, pendente ou cancelada em período) — trava os
    // botões de assinar da vitrine enquanto houver assinatura de pé.
    if (state !== "none" && state !== "expired" && isSubscriptionTier(row?.tier)) {
      activeTier = row.tier;
    }
    panel = (
      <SubscriptionPanel
        state={state}
        subscription={row}
        queryParams={{
          success: params.success === "1",
          cancelled: params.cancelled === "1",
          error: params.error,
          info: params.info,
        }}
      />
    );
  }

  return (
    <ClientShell currentRoute="/planos" hideRightSidebar>
      <div className="space-y-10 px-6 py-10 xl:px-12">
        {panel}
        <PlansView isLoggedIn={user !== null} activeTier={activeTier} />
      </div>
    </ClientShell>
  );
}
