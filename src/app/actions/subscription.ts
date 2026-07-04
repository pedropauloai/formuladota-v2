"use server";

// Server Actions: assinaturas Plus/Premium (Pedro 2026-07-04, FASE 3).
//
// Modelo freemium matchmaking: FREE = jogar; pagos = Plus e Premium, preço
// pela REGIÃO de jogo do perfil (BR = Mercado Pago Pix Automático; LATAM/EU
// = Stripe, FASE 4). Config canônica: src/lib/subscriptions/tiers.ts.
//
// Fluxo createSubscription(tier):
//   1. Verifica user autenticado + região do perfil
//   2. Verifica se já tem assinatura ativa (bloqueia dupla assinatura)
//   3. BR: cria preapproval no MP → init_point; grava tier+provider no DB
//   4. Webhook /api/webhooks/mercadopago atualiza status → 'authorized'
//
// Cancel flow híbrido: cancela no MP imediatamente, mas next_payment_date não muda.
// Helper has_active_subscription() retorna true até next_payment_date mesmo cancelado.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createPreapproval,
  cancelPreapproval,
  isTestMode,
} from "@/lib/mercadopago/client";
import { sendSubscriptionCancelledEmail } from "@/lib/resend";
import { getStripe, stripePriceIdFor } from "@/lib/stripe/client";
import { isGameRegion, type GameRegion } from "@/lib/regions";
import {
  TIER_PRICES,
  isSubscriptionTier,
  providerForRegion,
  type SubscriptionTier,
} from "@/lib/subscriptions/tiers";

// ====================================================
// createSubscription — inicia assinatura do tier
// ====================================================

export async function createSubscription(tierInput?: string): Promise<void> {
  const tier: SubscriptionTier = isSubscriptionTier(tierInput) ? tierInput : "plus";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Região de jogo do perfil decide moeda e provedor (BR=MP, LATAM/EU=Stripe).
  const { data: prof } = await supabase
    .from("profiles")
    .select("region")
    .eq("id", user.id)
    .maybeSingle();
  const region: GameRegion = isGameRegion(prof?.region) ? prof.region : "BR";

  // Verifica se já tem assinatura ativa ou pendente (não duplicar)
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "authorized", "cancelled"])
    .maybeSingle();

  if (existing?.status === "authorized") {
    // Já tem assinatura ativa — redireciona para página com estado atual
    redirect("/assinatura?info=already_active");
  }

  if (existing?.status === "pending") {
    // Preapproval pendente pode ter expirado — deleta e cria novo.
    await supabase.from("subscriptions").delete().eq("id", existing.id);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://formuladota.com";

  if (providerForRegion(region) === "stripe") {
    // LATAM (USD) / EU (EUR) — Stripe Checkout Session (mode: subscription).
    // A linha em `subscriptions` nasce no webhook checkout.session.completed
    // (metadata user_id+tier), não aqui — evita linha pendente órfã se o user
    // abandonar o checkout.
    let checkoutUrl: string | null = null;
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: stripePriceIdFor(region, tier), quantity: 1 }],
        success_url: `${siteUrl}/assinatura?success=1`,
        cancel_url: `${siteUrl}/assinatura`,
        customer_email: user.email ?? undefined,
        client_reference_id: user.id,
        subscription_data: { metadata: { user_id: user.id, tier } },
        metadata: { user_id: user.id, tier },
      });
      checkoutUrl = session.url;
    } catch (err) {
      console.error("[subscription] stripe checkout falhou:", err);
    }
    // redirect() lança NEXT_REDIRECT — precisa ficar FORA do try/catch.
    if (!checkoutUrl) redirect("/assinatura?error=payment_failed");
    redirect(checkoutUrl);
  }
  const price = TIER_PRICES[region][tier];

  const result = await createPreapproval({
    reason:
      tier === "premium"
        ? "FORMULADOTA Premium — Mensalidade"
        : "FORMULADOTA Plus — Mensalidade",
    payerEmail: user.email ?? "",
    externalReference: `user-${user.id}`,
    transactionAmount: price.amount,
    backUrl: `${siteUrl}/assinatura?success=1`,
  });

  if (!result.success) {
    redirect("/assinatura?error=payment_failed");
  }

  // Inserir no DB com status 'pending' (webhook atualiza para 'authorized').
  // tier/provider ficam na linha — o webhook nunca os toca (só status/datas).
  const { error: insertError } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    mp_preapproval_id: result.data.id,
    status: "pending",
    tier,
    provider: "mp",
  });

  if (insertError) {
    console.error("[subscription] insert falhou:", insertError.message);
    redirect("/assinatura?error=db_failed");
  }

  // Usar sandbox_init_point em modo de teste (TOKEN começa com TEST-)
  const redirectUrl = isTestMode()
    ? result.data.sandboxInitPoint
    : result.data.initPoint;

  redirect(redirectUrl);
}

// ====================================================
// cancelSubscription — cancela assinatura ativa
// ====================================================

export async function cancelSubscription(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Busca assinatura ativa do user
  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select(
      "id, mp_preapproval_id, status, next_payment_date, user_id, provider, stripe_customer_id"
    )
    .eq("user_id", user.id)
    .eq("status", "authorized")
    .maybeSingle();

  if (fetchError || !subscription) {
    redirect("/assinatura?error=not_found");
  }

  // Stripe (LATAM/EU): gerenciar/cancelar é no Customer Portal do Stripe —
  // cancelamento lá volta pra nós via webhook customer.subscription.updated/deleted.
  if (subscription.provider === "stripe") {
    if (!subscription.stripe_customer_id) {
      redirect("/assinatura?error=invalid_state");
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://formuladota.com";
    let portalUrl: string | null = null;
    try {
      const portal = await getStripe().billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${siteUrl}/assinatura`,
      });
      portalUrl = portal.url;
    } catch (err) {
      console.error("[subscription] stripe portal falhou:", err);
    }
    if (!portalUrl) redirect("/assinatura?error=cancel_failed");
    redirect(portalUrl);
  }

  if (!subscription.mp_preapproval_id) {
    redirect("/assinatura?error=invalid_state");
  }

  // 1) Cancela no Mercado Pago
  const mpResult = await cancelPreapproval(subscription.mp_preapproval_id);
  if (!mpResult.success) {
    console.error("[subscription] cancelPreapproval MP falhou:", mpResult.error);
    redirect("/assinatura?error=cancel_failed");
  }

  // 2) Atualiza DB local: status=cancelled + cancelled_at=now()
  // NÃO modifica next_payment_date — cancel híbrido mantém acesso até fim do período
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);

  if (updateError) {
    console.error("[subscription] update cancelled falhou:", updateError.message);
    // Continuar mesmo assim — MP já cancelou, DB será corrigido pelo webhook
  }

  // 3) Email de cancelamento (fire-and-forget)
  void sendCancelledEmailSafely(supabase, user.id, subscription.next_payment_date);

  redirect("/assinatura?cancelled=1");
}

// ====================================================
// reactivateSubscription — recria assinatura após cancel
// ====================================================

export async function reactivateSubscription(tierInput?: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Deleta subscription cancelada/expirada para permitir nova criação
  // (unique index subscriptions_one_active_per_user bloqueia duplicata)
  await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", user.id)
    .in("status", ["cancelled", "paused"]);

  // Delega para createSubscription (mesmo fluxo, DB limpo)
  await createSubscription(tierInput);
}

// ====================================================
// Helper: email cancelamento (fire-and-forget)
// ====================================================

type SupabaseSrv = Awaited<ReturnType<typeof createClient>>;

async function sendCancelledEmailSafely(
  supabase: SupabaseSrv,
  userId: string,
  nextPaymentDate: string | null
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();

    if (!profile?.email) return;

    await sendSubscriptionCancelledEmail({
      userId,
      customerEmail: profile.email,
      customerName: profile.username ?? undefined,
      accessUntil: nextPaymentDate ?? undefined,
    });
  } catch (err) {
    console.error("[subscription] email cancel falhou:", err);
  }
}
