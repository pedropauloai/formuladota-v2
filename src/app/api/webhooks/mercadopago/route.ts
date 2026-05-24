// API Route: POST /api/webhooks/mercadopago
// Recebe eventos do Mercado Pago, valida HMAC, atualiza DB com idempotência.
//
// Eventos suportados:
//   - payment.created / payment.updated  → PIX avulso (compra de pacotes)
//   - subscription_preapproval           → mudança de status da assinatura
//   - subscription_authorized_payment    → cobrança mensal recorrente confirmada
//
// DIFERENÇA CRÍTICA vs AbacatePay:
//   - Webhook MP envia payload shallow (só data.id) — handler faz GET para detalhes
//   - HMAC: assina manifest de headers (não raw body), digest HEX (não base64)
//   - Header: x-signature (não x-webhook-signature)
//   - data.id vem no query param, não no body
//
// SEMPRE retornar 200 (exceto 401 por assinatura inválida).
// MP retenta a cada 15min por 3x se receber != 200.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  verifyMpWebhookSignature,
  getPaymentDetail,
  getPreapprovalDetail,
  getAuthorizedPaymentDetail,
} from "@/lib/mercadopago/client";
import { mpWebhookPayloadSchema } from "@/lib/mercadopago/types";
import {
  sendSubscriptionCreatedEmail,
  sendSubscriptionRenewalEmail,
  sendSubscriptionCancelledEmail,
  sendPurchaseConfirmationEmail,
} from "@/lib/resend";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1) Extrair data.id do query param (ANTES de ler body — MP assina via headers)
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const signatureHeader = request.headers.get("x-signature");

  // 2) Validar assinatura HMAC — 401 sem revelar detalhes internos
  if (!verifyMpWebhookSignature(dataId, requestId, signatureHeader)) {
    console.error("[webhook/mp] assinatura inválida — data.id:", dataId);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // 3) Parse + validação Zod do body
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Body ilegível" }, { status: 400 });
  }

  const json: unknown = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();

  if (!json) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = mpWebhookPayloadSchema.safeParse(json);
  if (!parsed.success) {
    // Evento desconhecido — retornar 200 pra MP não retentar
    console.error("[webhook/mp] payload inesperado:", parsed.error.flatten());
    return NextResponse.json({ received: true });
  }

  const payload = parsed.data;
  const supabase = createServiceClient();

  // 4) Roteamento por tipo de evento
  try {
    if (payload.type === "payment") {
      await handlePaymentEvent(supabase, payload.data.id);
    } else if (payload.type === "subscription_preapproval") {
      await handlePreapprovalEvent(supabase, payload.data.id);
    } else if (payload.type === "subscription_authorized_payment") {
      await handleAuthorizedPaymentEvent(supabase, payload.data.id);
    } else {
      // Evento não suportado — log e 200 (não retentar)
      console.error("[webhook/mp] tipo não suportado:", payload.type);
    }
  } catch (err) {
    // Erro interno — log mas retornar 200 (MP não deve retentar por erro nosso processado)
    console.error("[webhook/mp] erro interno no handler:", err);
  }

  // SEMPRE 200
  return NextResponse.json({ received: true });
}

// ====================================================
// HANDLER: payment.created / payment.updated
// PIX avulso (compra de pacote de fichas)
// ====================================================
async function handlePaymentEvent(
  supabase: ReturnType<typeof createServiceClient>,
  paymentId: string
): Promise<void> {
  const result = await getPaymentDetail(paymentId);
  if (!result.success) {
    console.error("[webhook/mp] getPaymentDetail falhou:", result.error);
    return;
  }

  const payment = result.data;

  // Só processa pagamentos aprovados
  if (payment.status !== "approved") return;

  if (!payment.external_reference) {
    console.error("[webhook/mp] payment sem external_reference:", paymentId);
    return;
  }

  // UPDATE condicional — idempotência: só atualiza se ainda 'pendente'
  // Se payment_provider foi salvo como 'mercadopago' na criação do purchase, filtra aqui
  const { data: updated, error } = await supabase
    .from("purchases")
    .update({ status: "pago" })
    .eq("id", payment.external_reference)
    .eq("status", "pendente")
    .eq("payment_provider", "mercadopago")
    .select("id, user_id, partidas_compradas, sessoes_compradas, package_id")
    .maybeSingle();

  if (error) {
    console.error("[webhook/mp] update purchase falhou:", error.message);
    return;
  }

  if (!updated) return; // webhook duplicado ou compra desconhecida — silencioso

  // Gap 2 MVP Fichas (2026-05-23): insere em ficha_ledger pra creditar saldo.
  // Trigger PG `apply_ficha_ledger` atualiza user_fichas.balance automaticamente.
  // Idempotência garantida pelo UPDATE conditional da purchase acima.
  if (updated.partidas_compradas > 0) {
    const { error: ledgerError } = await supabase
      .from("ficha_ledger")
      .insert({
        user_id: updated.user_id,
        delta: updated.partidas_compradas,
        source: "purchase",
        reference_id: updated.id,
      });
    if (ledgerError) {
      console.error("[webhook/mp] insert ficha_ledger falhou:", ledgerError.message);
    }
  }

  // Email confirmação (fire-and-forget)
  void sendPurchaseConfirmationSafely(supabase, updated);
}

// ====================================================
// HANDLER: subscription_preapproval
// Mudanças de status da assinatura (authorized, cancelled, paused)
// ====================================================
async function handlePreapprovalEvent(
  supabase: ReturnType<typeof createServiceClient>,
  preapprovalId: string
): Promise<void> {
  const result = await getPreapprovalDetail(preapprovalId);
  if (!result.success) {
    console.error("[webhook/mp] getPreapprovalDetail falhou:", result.error);
    return;
  }

  const preapproval = result.data;

  if (preapproval.status === "authorized") {
    // Assinatura autorizada pelo user — ativar
    const nextPaymentDate = preapproval.next_payment_date
      ? new Date(preapproval.next_payment_date).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // fallback +30d

    const { data: updated, error } = await supabase
      .from("subscriptions")
      .update({
        status: "authorized",
        started_at: new Date().toISOString(),
        next_payment_date: nextPaymentDate,
        updated_at: new Date().toISOString(),
      })
      .eq("mp_preapproval_id", preapprovalId)
      .in("status", ["pending"]) // idempotência: só atualiza se ainda pending
      .select("id, user_id")
      .maybeSingle();

    if (error) {
      console.error("[webhook/mp] update subscription (authorized) falhou:", error.message);
      return;
    }

    if (updated) {
      void sendSubscriptionCreatedSafely(supabase, updated.user_id);
    }
  } else if (preapproval.status === "cancelled" || preapproval.status === "paused") {
    // Cancel (ou paused tratado como cancel em V1)
    // UPDATE idempotente: se já cancelado, no-op
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("mp_preapproval_id", preapprovalId)
      .in("status", ["authorized", "pending", "paused"]); // idempotência

    if (error) {
      console.error("[webhook/mp] update subscription (cancelled) falhou:", error.message);
      return;
    }
  }
}

// ====================================================
// HANDLER: subscription_authorized_payment
// Cobrança mensal recorrente confirmada — atualiza next_payment_date
// ====================================================
async function handleAuthorizedPaymentEvent(
  supabase: ReturnType<typeof createServiceClient>,
  authorizedPaymentId: string
): Promise<void> {
  const result = await getAuthorizedPaymentDetail(authorizedPaymentId);
  if (!result.success) {
    console.error("[webhook/mp] getAuthorizedPaymentDetail falhou:", result.error);
    return;
  }

  const authorizedPayment = result.data;
  if (authorizedPayment.status !== "approved") return;

  // Próxima cobrança = 30 dias após a data aprovada (ou agora se não disponível)
  const baseDate = authorizedPayment.date_approved
    ? new Date(authorizedPayment.date_approved)
    : new Date();
  const nextPaymentDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // GREATEST idempotência: só avança next_payment_date se for maior que o atual
  // Supabase não tem GREATEST nativo em update — fazer em 2 queries
  const { data: current, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, user_id, next_payment_date")
    .eq("mp_preapproval_id", authorizedPayment.preapproval_id)
    .maybeSingle();

  if (fetchError || !current) {
    console.error("[webhook/mp] subscription não encontrada para preapproval:", authorizedPayment.preapproval_id);
    return;
  }

  // Idempotência: só atualiza se nova data é maior
  const currentNextDate = current.next_payment_date
    ? new Date(current.next_payment_date)
    : new Date(0);
  const newNextDate = new Date(nextPaymentDate);

  if (newNextDate <= currentNextDate) return; // webhook duplicado — silencioso

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "authorized",
      next_payment_date: nextPaymentDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);

  if (error) {
    console.error("[webhook/mp] update next_payment_date falhou:", error.message);
    return;
  }

  void sendSubscriptionRenewalSafely(supabase, current.user_id, nextPaymentDate);
}

// ====================================================
// Helpers de email (fire-and-forget, nunca propagam)
// ====================================================

interface PurchaseRow {
  id: string;
  user_id: string;
  partidas_compradas: number;
  sessoes_compradas: number;
  package_id: string;
}

async function sendPurchaseConfirmationSafely(
  supabase: ReturnType<typeof createServiceClient>,
  purchase: PurchaseRow
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", purchase.user_id)
      .single();

    if (!profile?.email) return;

    const { data: pkg } = await supabase
      .from("packages")
      .select("nome")
      .eq("id", purchase.package_id)
      .single();

    await sendPurchaseConfirmationEmail({
      purchaseId: purchase.id,
      customerEmail: profile.email,
      customerName: profile.username ?? undefined,
      packageName: pkg?.nome ?? "Pacote",
      partidasCompradas: purchase.partidas_compradas,
      sessoesCompradas: purchase.sessoes_compradas,
    });
  } catch (err) {
    console.error("[webhook/mp] email confirmação falhou:", err);
  }
}

async function sendSubscriptionCreatedSafely(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();

    if (!profile?.email) return;
    await sendSubscriptionCreatedEmail({
      userId,
      customerEmail: profile.email,
      customerName: profile.username ?? undefined,
    });
  } catch (err) {
    console.error("[webhook/mp] email subscription created falhou:", err);
  }
}

async function sendSubscriptionRenewalSafely(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  nextPaymentDate: string
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();

    if (!profile?.email) return;
    await sendSubscriptionRenewalEmail({
      userId,
      customerEmail: profile.email,
      customerName: profile.username ?? undefined,
      nextPaymentDate,
    });
  } catch (err) {
    console.error("[webhook/mp] email renewal falhou:", err);
  }
}

// Exporta sendSubscriptionCancelledEmail para uso em cancelSubscription server action
export { sendSubscriptionCancelledEmail };
