// API Route: POST /api/webhooks/abacatepay
// Recebe eventos transparent.* da AbacatePay, valida HMAC, atualiza purchases com idempotência.
//
// CRÍTICO: raw body lido via request.text() ANTES de qualquer JSON.parse — caso contrário
// o whitespace muda e a assinatura HMAC não bate (Pitfall 2 do RESEARCH.md).
//
// Webhook duplicado SEMPRE retorna 200 received:true — NUNCA 5xx — senão AbacatePay retenta
// indefinidamente e pode duplicar processamento (Pitfall 3 do RESEARCH.md).

import { NextRequest, NextResponse } from "next/server";
import { verifyAbacatepayWebhookSignature } from "@/lib/abacatepay";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPurchaseConfirmationEmail } from "@/lib/resend";
import {
  webhookPayloadSchema,
  type AbacatepayWebhookPayload,
} from "@/types/abacatepay";

// Tipo dos campos retornados pelo UPDATE condicional
interface ProcessedPurchase {
  id: string;
  user_id: string;
  partidas_compradas: number;
  sessoes_compradas: number;
  package_id: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1) Raw body ANTES de qualquer parse (HMAC depende de bytes exatos)
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  // 2) Validar HMAC — retorna 401 sem revelar detalhes (timingSafeEqual em abacatepay.ts)
  if (!verifyAbacatepayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // 3) Parse + validação Zod do payload
  let payload: AbacatepayWebhookPayload;
  try {
    const json: unknown = JSON.parse(rawBody);
    const parsed = webhookPayloadSchema.safeParse(json);
    if (!parsed.success) {
      console.error("[webhook] payload inesperado:", parsed.error.flatten());
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const externalPaymentId = payload.data.transparent.id;

  // 4) Roteamento por evento
  if (payload.event === "transparent.completed") {
    await handlePaymentCompleted(supabase, externalPaymentId, payload);
  } else if (payload.event === "transparent.refunded") {
    await handleRefund(supabase, externalPaymentId);
  } else {
    // transparent.disputed — log apenas, admin trata manualmente (sem mudança automática no DB)
    console.error(
      "[webhook] transparent.disputed received — revisão manual necessária:",
      externalPaymentId
    );
  }

  // SEMPRE 200 — qualquer 4xx/5xx (exceto validações acima) faz AbacatePay retentar
  return NextResponse.json({ received: true });
}

/**
 * Atualiza purchase para status=pago via UPDATE condicional (idempotência).
 * WHERE status='pendente' garante que retentativas não duplicam saldo.
 * Se 0 rows afetadas: webhook duplicado ou external_payment_id desconhecido — retorno silencioso.
 * Se 1 row afetada: purchase liberada → dispara email de confirmação (fire-and-forget).
 */
async function handlePaymentCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  externalPaymentId: string,
  payload: AbacatepayWebhookPayload
): Promise<void> {
  const { data: updated, error } = await supabase
    .from("purchases")
    .update({ status: "pago" })
    .eq("external_payment_id", externalPaymentId)
    .eq("status", "pendente") // condicional é a chave da idempotência (C9)
    .select("id, user_id, partidas_compradas, sessoes_compradas, package_id")
    .maybeSingle();

  if (error) {
    console.error("[webhook] update purchases failed:", error.message);
    return;
  }

  if (!updated) {
    // Webhook duplicado ou external_payment_id não encontrado — return silently (não é erro)
    return;
  }

  // Email é side-effect não-crítico: wrapper com try/catch interno + void call
  // CLAUDE.md exige async/await sem promise chaining — usamos async function + void
  void sendConfirmationSafely(supabase, updated as ProcessedPurchase, payload);
}

/**
 * Wrapper async para envio de email — encapsula try/catch e nunca propaga exceção.
 * Chamado via `void` para sinalizar fire-and-forget intencional sem bloquear o handler.
 */
async function sendConfirmationSafely(
  supabase: ReturnType<typeof createServiceClient>,
  purchase: ProcessedPurchase,
  payload: AbacatepayWebhookPayload
): Promise<void> {
  try {
    await sendConfirmationFromPurchase(supabase, purchase, payload);
  } catch (err) {
    console.error("[webhook] confirmação email falhou:", err);
  }
}

/**
 * Atualiza purchase para status=cancelado sem checar status anterior (refund é definitivo).
 */
async function handleRefund(
  supabase: ReturnType<typeof createServiceClient>,
  externalPaymentId: string
): Promise<void> {
  const { error } = await supabase
    .from("purchases")
    .update({ status: "cancelado" })
    .eq("external_payment_id", externalPaymentId);

  if (error) {
    console.error("[webhook] refund update failed:", error.message);
  }
}

/**
 * Busca email/nome do user no profiles (fallback caso payload não traga customer)
 * e despacha sendPurchaseConfirmationEmail.
 */
async function sendConfirmationFromPurchase(
  supabase: ReturnType<typeof createServiceClient>,
  purchase: ProcessedPurchase,
  payload: AbacatepayWebhookPayload
): Promise<void> {
  // Email pode vir no payload (raro) ou buscar do profiles
  let customerEmail = payload.data.customer?.email;
  let customerName = payload.data.customer?.name;

  if (!customerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", purchase.user_id)
      .single();
    customerEmail = profile?.email ?? undefined;
    customerName = customerName ?? profile?.username ?? undefined;
  }

  if (!customerEmail) {
    console.error(
      "[webhook] sem email do user — pulando confirmação:",
      purchase.user_id
    );
    return;
  }

  // Buscar nome do pacote para o email
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
}
