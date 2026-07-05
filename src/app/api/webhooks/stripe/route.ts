// API Route: POST /api/webhooks/stripe (FASE 4, 2026-07-04).
// Assinaturas LATAM (USD) / EU (EUR). BR segue no webhook do Mercado Pago.
//
// Segue o MESMO contrato do webhook MP (route irmã):
//   - Assinatura inválida → 401 (Stripe não retenta com 4xx… mas loga no dashboard)
//   - Falha transitória (DB) → 500 (Stripe RETENTA com backoff por até 3 dias)
//   - Caso terminal tratado/ignorado → 200 (não retentar)
//
// Idempotência: updates condicionais por status + next_payment_date "GREATEST"
// (webhook duplicado ou fora de ordem não regride o estado).
//
// Eventos:
//   checkout.session.completed   → cria/ativa a linha em subscriptions
//   invoice.paid                 → renovação (avança next_payment_date)
//   invoice.payment_failed       → status 'paused' (acesso expira no período)
//   customer.subscription.updated → status/tier/cancel_at_period_end
//   customer.subscription.deleted → status 'cancelled'

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { requireServerEnv } from "@/lib/env";
import {
  getStripe,
  stripePeriodEndIso,
  tierFromStripePriceId,
} from "@/lib/stripe/client";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 401 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      requireServerEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch (err) {
    console.error("[webhook/stripe] assinatura inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data.object);
        break;
      case "checkout.session.async_payment_succeeded":
        // Pix é assíncrono: confirma quando o banco liquida (não no completed).
        await handlePixOneTime(supabase, event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(supabase, event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(supabase, event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;
      default:
        // Evento não assinado aqui — 200 silencioso.
        break;
    }
  } catch (err) {
    // Transitório (DB/rede) → 500 pro Stripe retentar (mesma regra do MP).
    console.error("[webhook/stripe] erro transitório — pedindo retry (500):", err);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type Service = ReturnType<typeof createServiceClient>;

// ID da subscription pode vir como string ou objeto expandido.
function subIdOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

// invoice.subscription mudou de lugar na API Basil (parent.subscription_details).
function subIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const basil = (
    invoice as unknown as {
      parent?: { subscription_details?: { subscription?: string | { id: string } } };
    }
  ).parent?.subscription_details?.subscription;
  const legacy = (invoice as unknown as { subscription?: string | { id: string } })
    .subscription;
  return subIdOf(basil) ?? subIdOf(legacy);
}

// ====================================================
// checkout.session.completed — nasce/ativa a assinatura
// ====================================================
async function handleCheckoutCompleted(
  supabase: Service,
  session: Stripe.Checkout.Session
): Promise<void> {
  // Pix (pagamento AVULSO, mode: payment) concede 30 dias. Se já pago no completed
  // (raro pro Pix, comum pro cartão avulso), concede aqui; senão o
  // async_payment_succeeded cuida. Idempotente por session.id.
  if (session.mode === "payment" && session.metadata?.kind === "pix_30d") {
    if (session.payment_status === "paid") await handlePixOneTime(supabase, session);
    return;
  }
  if (session.mode !== "subscription") return;

  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const tier = session.metadata?.tier === "premium" ? "premium" : "plus";
  const stripeSubId = subIdOf(session.subscription as string | { id: string } | null);
  const customerId = subIdOf(session.customer as string | { id: string } | null);

  if (!userId || !stripeSubId) {
    console.error("[webhook/stripe] checkout sem user_id/subscription:", session.id);
    return; // terminal — sem como recuperar
  }

  // Busca a subscription pra datar o período (falha de rede → throw → retry).
  const sub = await getStripe().subscriptions.retrieve(stripeSubId);
  const nextPaymentDate = stripePeriodEndIso(sub);

  // Idempotência: linha já existe pra esta subscription? Nada a fazer.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubId)
    .maybeSingle();
  if (existing) return;

  // Remove restos não-ativos do user (unique parcial permite 1 linha só).
  await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", userId)
    .in("status", ["pending", "cancelled"]);

  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    provider: "stripe",
    stripe_subscription_id: stripeSubId,
    stripe_customer_id: customerId,
    tier,
    status: "authorized",
    started_at: new Date().toISOString(),
    next_payment_date: nextPaymentDate,
    payment_method_id: "card",
  });
  if (error) throw new Error(`insert subscription (stripe) falhou: ${error.message}`);
}

// ====================================================
// Pix AVULSO (30 dias) — pagamento único via Stripe (mode: payment). Concede acesso
// por 30 dias com renovação MANUAL (o Pix não é recorrente). Idempotente por session.id
// (guardado em stripe_subscription_id — namespace Stripe, sem colisão com sub real).
// ====================================================
async function handlePixOneTime(
  supabase: Service,
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.metadata?.kind !== "pix_30d") return;
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier === "premium" ? "premium" : "plus";
  if (!userId) {
    console.error("[webhook/stripe] pix sem user_id:", session.id);
    return;
  }

  // Idempotência: esta sessão já concedeu? (retry do Stripe / completed + async).
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", session.id)
    .maybeSingle();
  if (existing) return;

  await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", userId)
    .in("status", ["pending", "cancelled"]);

  const next = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    provider: "stripe",
    stripe_subscription_id: session.id, // chave de idempotência (não é sub recorrente)
    tier,
    status: "authorized",
    started_at: new Date().toISOString(),
    next_payment_date: next,
    payment_method_id: "pix",
  });
  if (error) throw new Error(`insert pix 30d falhou: ${error.message}`);
}

// ====================================================
// invoice.paid — renovação: avança next_payment_date (GREATEST)
// ====================================================
async function handleInvoicePaid(supabase: Service, invoice: Stripe.Invoice): Promise<void> {
  const stripeSubId = subIdFromInvoice(invoice);
  if (!stripeSubId) return;

  const sub = await getStripe().subscriptions.retrieve(stripeSubId);
  const nextPaymentDate = stripePeriodEndIso(sub);

  const { data: current, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, next_payment_date")
    .eq("stripe_subscription_id", stripeSubId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!current) return; // checkout.completed ainda não processou — o retry/updated cobre

  const currentEnd = current.next_payment_date
    ? new Date(current.next_payment_date)
    : new Date(0);
  if (new Date(nextPaymentDate) <= currentEnd) return; // duplicado/fora de ordem

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "authorized",
      next_payment_date: nextPaymentDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);
  if (error) throw new Error(error.message);
}

// ====================================================
// invoice.payment_failed — pausa (acesso morre no fim do período pago)
// ====================================================
async function handleInvoiceFailed(supabase: Service, invoice: Stripe.Invoice): Promise<void> {
  const stripeSubId = subIdFromInvoice(invoice);
  if (!stripeSubId) return;

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", stripeSubId)
    .in("status", ["authorized", "pending"]);
  if (error) throw new Error(error.message);
}

// ====================================================
// customer.subscription.updated — status/tier/cancelamento agendado
// ====================================================
async function handleSubscriptionUpdated(
  supabase: Service,
  sub: Stripe.Subscription
): Promise<void> {
  // Upgrade/downgrade no Customer Portal muda o price — refletir o tier.
  const priceId = sub.items?.data?.[0]?.price?.id;
  const tier = priceId ? tierFromStripePriceId(priceId) : null;

  const patch: Record<string, unknown> = {
    next_payment_date: stripePeriodEndIso(sub),
    updated_at: new Date().toISOString(),
  };
  if (tier) patch.tier = tier;

  if (sub.status === "active" || sub.status === "trialing") {
    // cancel_at_period_end = cancelamento agendado → modelo híbrido (igual MP):
    // status 'cancelled' mas acesso até next_payment_date.
    if (sub.cancel_at_period_end) {
      patch.status = "cancelled";
      patch.cancelled_at = new Date().toISOString();
    } else {
      patch.status = "authorized";
      patch.cancelled_at = null;
    }
  } else if (sub.status === "past_due" || sub.status === "unpaid") {
    patch.status = "paused";
  } else if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    patch.status = "cancelled";
    patch.cancelled_at = new Date().toISOString();
  } else {
    return; // incomplete etc. — aguarda evento definitivo
  }

  const { error } = await supabase
    .from("subscriptions")
    .update(patch as never)
    .eq("stripe_subscription_id", sub.id);
  if (error) throw new Error(error.message);
}

// ====================================================
// customer.subscription.deleted — cancelamento efetivado
// ====================================================
async function handleSubscriptionDeleted(
  supabase: Service,
  sub: Stripe.Subscription
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id)
    .in("status", ["authorized", "pending", "paused"]);
  if (error) throw new Error(error.message);
}
