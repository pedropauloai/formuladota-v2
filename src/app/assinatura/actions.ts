"use server";

// Server Actions FORMULADOTA — assinatura mensal Mercado Pago Pix Automático.
// Phase 4 (2026-05-02). Cookie client per C13 (service-role apenas em /api/webhooks/* e /api/cron/*).
//
// 3 actions:
// - createSubscription() — cria preapproval pendente + retorna init_point pra redirect MP
// - cancelSubscription() — cancela no MP + UPDATE local cancelled_at (mantém next_payment_date pra cancel híbrido)
// - reactivateSubscription() — re-cria preapproval pra subscription cancelled/expired

import { createClient } from "@/lib/supabase/server";
import {
  createPreapproval,
  cancelPreapproval as mpCancelPreapproval,
} from "@/lib/mercadopago";
import { publicEnv, serverEnv } from "@/lib/env";

export type SubscriptionActionResult =
  | { success: true; initPoint: string }
  | { success: false; error: string };

export type CancelActionResult =
  | { success: true }
  | { success: false; error: string };

function getHubPriceBrl(): number {
  const fromEnv = serverEnv.HUB_PRICE_BRL;
  if (fromEnv) {
    const n = Number(fromEnv);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 47;
}

/**
 * Cria preapproval Pix Automático no MP + INSERT subscriptions row pendente.
 * Retorna init_point — page deve redirect pra essa URL pra user autorizar Pix Automático.
 */
export async function createSubscription(): Promise<SubscriptionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, error: "Não autenticado." };
  }

  // Verifica se já existe subscription ativa/pending
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "authorized"])
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: "Você já tem uma mensalidade pendente ou ativa.",
    };
  }

  const amount = getHubPriceBrl();
  const backUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/assinatura?status=success`;

  const mpResult = await createPreapproval({
    reason: "FORMULADOTA HUB — Mensalidade",
    amount,
    payerEmail: user.email,
    externalReference: `user-${user.id}`,
    backUrl,
  });

  if (!mpResult.success) {
    return { success: false, error: mpResult.error };
  }

  // INSERT subscription row pendente — webhook subscription_preapproval atualiza pra authorized depois
  const { error: insertErr } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    mp_preapproval_id: mpResult.data.id,
    status: "pending",
    payment_method_id: "pix",
  });

  if (insertErr) {
    console.error("[createSubscription] insert falhou:", insertErr.message);
    // MP já criou preapproval — não dá pra reverter; user vai pra init_point e webhook cria row
    if (insertErr.code !== "23505") {
      return { success: false, error: "Erro ao registrar assinatura. Tente novamente." };
    }
  }

  return { success: true, initPoint: mpResult.data.initPoint };
}

/**
 * Cancela subscription:
 * 1. Chama MP PUT /preapproval/{id} status=cancelled (MP cancela imediato)
 * 2. UPDATE local cancelled_at + status='cancelled' (mantém next_payment_date)
 *
 * Helper has_active_subscription() retorna true até next_payment_date passar — cancel híbrido.
 */
export async function cancelSubscription(): Promise<CancelActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, mp_preapproval_id")
    .eq("user_id", user.id)
    .eq("status", "authorized")
    .maybeSingle();

  if (!subscription || !subscription.mp_preapproval_id) {
    return { success: false, error: "Nenhuma assinatura ativa encontrada." };
  }

  const mpResult = await mpCancelPreapproval(subscription.mp_preapproval_id);
  if (!mpResult.success) {
    return { success: false, error: `Erro no Mercado Pago: ${mpResult.error}` };
  }

  // UPDATE local cancelled_at — webhook subscription_preapproval pode ter chego antes (idempotente)
  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", subscription.id)
    .eq("status", "authorized");

  if (updateErr) {
    console.error("[cancelSubscription] update falhou:", updateErr.message);
    // Webhook MP vai sincronizar status eventualmente; não retornar erro pro user
  }

  return { success: true };
}

/**
 * Reativa subscription cancelled/expired criando novo preapproval.
 * Apaga subscription antiga + cria nova (mantém audit trail via created_at distinto).
 */
export async function reactivateSubscription(): Promise<SubscriptionActionResult> {
  // Idempotente — chamar createSubscription que já checa existing pending/authorized
  return createSubscription();
}
