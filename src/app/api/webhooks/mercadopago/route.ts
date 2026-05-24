// API Route: POST /api/webhooks/mercadopago
// Recebe eventos MP (payment.* + subscription_preapproval + subscription_authorized_payment),
// valida HMAC x-signature, atualiza purchases/subscriptions com idempotência.
//
// CRÍTICO: raw body lido via request.text() ANTES de qualquer parse — HMAC depende dos bytes exatos.
// Webhook duplicado SEMPRE retorna 200 received:true — NUNCA 5xx — senão MP retenta indefinidamente.

import { NextRequest, NextResponse } from "next/server";
import {
  verifyMercadopagoWebhookSignature,
  fetchPayment,
  fetchPreapproval,
  fetchAuthorizedPayment,
} from "@/lib/mercadopago";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendPurchaseConfirmationEmail,
  sendSubscriptionAuthorizedEmail,
  sendSubscriptionRenewedEmail,
} from "@/lib/resend";
import { webhookNotificationSchema } from "@/types/mercadopago";
import type { TablesUpdate } from "@/types/database";

interface ProcessedPurchase {
  id: string;
  user_id: string;
  partidas_compradas: number;
  sessoes_compradas: number;
  package_id: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1) Raw body antes de qualquer parse (HMAC depende de bytes exatos)
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  // 2) Parse + validação Zod do payload (precisa data.id pra validar HMAC)
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = webhookNotificationSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("[mp-webhook] payload inesperado:", parsed.error.flatten());
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  const notification = parsed.data;

  // 3) Validar HMAC — retorna 401 sem revelar detalhes
  const isValid = verifyMercadopagoWebhookSignature({
    signatureHeader,
    requestId,
    dataId: notification.data.id,
  });
  if (!isValid) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 4) Roteamento por tipo de notificação
  if (notification.type === "payment") {
    await handlePaymentNotification(supabase, notification.data.id);
  } else if (notification.type === "subscription_preapproval") {
    await handlePreapprovalNotification(supabase, notification.data.id);
  } else if (notification.type === "subscription_authorized_payment") {
    await handleAuthorizedPaymentNotification(supabase, notification.data.id);
  } else {
    console.error("[mp-webhook] tipo desconhecido:", notification.type);
  }

  // SEMPRE 200 — qualquer 5xx faz MP retentar indefinidamente
  return NextResponse.json({ received: true });
}

/**
 * Processa notificação `payment.*` — busca detalhes via API e libera saldo se aprovado.
 * Reusa pattern Phase 2 (UPDATE conditional pra idempotência).
 */
async function handlePaymentNotification(
  supabase: ReturnType<typeof createServiceClient>,
  paymentId: string
): Promise<void> {
  const result = await fetchPayment(paymentId);
  if (!result.success) {
    console.error("[mp-webhook] fetchPayment falhou:", result.error);
    return;
  }
  const payment = result.data;

  if (payment.status !== "approved") {
    return; // só processa quando aprovado
  }

  const { data: updated, error } = await supabase
    .from("purchases")
    .update({ status: "pago" })
    .eq("external_payment_id", paymentId)
    .eq("status", "pendente")
    .select("id, user_id, partidas_compradas, sessoes_compradas, package_id")
    .maybeSingle();

  if (error) {
    console.error("[mp-webhook] update purchases falhou:", error.message);
    return;
  }
  if (!updated) {
    return; // duplicado ou external_payment_id desconhecido
  }

  // Gap 2 MVP Fichas: inserir em ficha_ledger pra cada partida comprada.
  // O trigger apply_ficha_ledger atualiza user_fichas.balance automaticamente.
  // source_id = purchase.id pra rastreabilidade e idempotência por design
  // (purchase só vira 'pago' uma vez — UPDATE conditional acima garante).
  if (updated.partidas_compradas > 0) {
    const { error: ledgerErr } = await supabase
      .from("ficha_ledger")
      .insert({
        user_id: updated.user_id,
        delta: updated.partidas_compradas,
        source: "purchase" as const,
        source_id: updated.id,
        reason: `Compra PIX confirmada (purchase ${updated.id.slice(0, 8)})`,
      });
    if (ledgerErr) {
      console.error("[mp-webhook] ficha_ledger insert falhou:", ledgerErr.message);
      // Não abortar — purchase já marcado como pago. Log pra reconciliação manual.
    }
  }

  void sendPurchaseEmailSafely(supabase, updated as ProcessedPurchase, payment.payer?.email);
}

async function sendPurchaseEmailSafely(
  supabase: ReturnType<typeof createServiceClient>,
  purchase: ProcessedPurchase,
  payerEmail?: string
): Promise<void> {
  try {
    let customerEmail = payerEmail;
    let customerName: string | undefined;

    if (!customerEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, username")
        .eq("id", purchase.user_id)
        .single();
      customerEmail = profile?.email ?? undefined;
      customerName = profile?.username ?? undefined;
    }
    if (!customerEmail) return;

    const { data: pkg } = await supabase
      .from("packages")
      .select("nome")
      .eq("id", purchase.package_id)
      .single();

    await sendPurchaseConfirmationEmail({
      purchaseId: purchase.id,
      customerEmail,
      customerName,
      packageName: pkg?.nome ?? "Pacote",
      partidasCompradas: purchase.partidas_compradas,
      sessoesCompradas: purchase.sessoes_compradas,
    });
  } catch (err) {
    console.error("[mp-webhook] email purchase falhou:", err);
  }
}

/**
 * Processa notificação `subscription_preapproval` — atualiza status da subscription.
 * Eventos: pending → authorized → cancelled / paused.
 */
async function handlePreapprovalNotification(
  supabase: ReturnType<typeof createServiceClient>,
  preapprovalId: string
): Promise<void> {
  const result = await fetchPreapproval(preapprovalId);
  if (!result.success) {
    console.error("[mp-webhook] fetchPreapproval falhou:", result.error);
    return;
  }
  const detail = result.data;

  // Map MP status → nosso enum
  const statusMap: Record<string, string> = {
    pending: "pending",
    authorized: "authorized",
    paused: "paused",
    cancelled: "cancelled",
  };
  const newStatus = statusMap[detail.status] ?? detail.status;

  // UPDATE conditional — idempotência
  // Se status='authorized' (primeiro pagamento OK), preencher started_at + next_payment_date
  const updates: TablesUpdate<"subscriptions"> = { status: newStatus };
  if (newStatus === "authorized") {
    updates.started_at = new Date().toISOString();
    if (detail.next_payment_date) {
      updates.next_payment_date = detail.next_payment_date;
    }
  }
  if (newStatus === "cancelled") {
    updates.cancelled_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("mp_preapproval_id", preapprovalId)
    .select("id, user_id, status")
    .maybeSingle();

  if (error) {
    console.error("[mp-webhook] update subscriptions falhou:", error.message);
    return;
  }
  if (!updated) {
    console.error("[mp-webhook] subscription não encontrada:", preapprovalId);
    return;
  }

  // Email se primeiro authorized
  if (newStatus === "authorized") {
    void sendAuthorizedEmailSafely(supabase, updated.id, updated.user_id, detail);
  }
}

async function sendAuthorizedEmailSafely(
  supabase: ReturnType<typeof createServiceClient>,
  subscriptionId: string,
  userId: string,
  detail: { auto_recurring?: { transaction_amount?: number }; next_payment_date?: string }
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();
    if (!profile?.email) return;

    await sendSubscriptionAuthorizedEmail({
      subscriptionId,
      customerEmail: profile.email,
      customerName: profile.username ?? undefined,
      nextPaymentDate: detail.next_payment_date,
      amountBrl: detail.auto_recurring?.transaction_amount ?? 47,
    });
  } catch (err) {
    console.error("[mp-webhook] email authorized falhou:", err);
  }
}

/**
 * Processa notificação `subscription_authorized_payment` — renovação mensal paga.
 * Atualiza next_payment_date + status='authorized'.
 */
async function handleAuthorizedPaymentNotification(
  supabase: ReturnType<typeof createServiceClient>,
  authorizedPaymentId: string
): Promise<void> {
  const result = await fetchAuthorizedPayment(authorizedPaymentId);
  if (!result.success) {
    console.error("[mp-webhook] fetchAuthorizedPayment falhou:", result.error);
    return;
  }
  const detail = result.data;

  if (detail.status !== "approved" && detail.status !== "processed") {
    return; // só processa renovações pagas
  }

  // UPDATE conditional GREATEST — só avança next_payment_date, nunca recua (protege contra reorder)
  const newNextPayment = detail.next_payment_date;
  if (!newNextPayment) {
    console.error("[mp-webhook] authorized_payment sem next_payment_date");
    return;
  }

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({ status: "authorized", next_payment_date: newNextPayment })
    .eq("mp_preapproval_id", detail.preapproval_id)
    .lt("next_payment_date", newNextPayment)
    .select("id, user_id")
    .maybeSingle();

  if (error) {
    console.error("[mp-webhook] update subscription renewal falhou:", error.message);
    return;
  }
  if (!updated) {
    return; // já atualizado (idempotente) ou subscription não existe
  }

  void sendRenewedEmailSafely(supabase, updated.id, updated.user_id, detail);
}

async function sendRenewedEmailSafely(
  supabase: ReturnType<typeof createServiceClient>,
  subscriptionId: string,
  userId: string,
  detail: { transaction_amount?: number; next_payment_date?: string }
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();
    if (!profile?.email) return;

    await sendSubscriptionRenewedEmail({
      subscriptionId,
      customerEmail: profile.email,
      customerName: profile.username ?? undefined,
      nextPaymentDate: detail.next_payment_date,
      amountBrl: detail.transaction_amount ?? 47,
    });
  } catch (err) {
    console.error("[mp-webhook] email renewed falhou:", err);
  }
}
