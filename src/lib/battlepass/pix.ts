// Battlepass no Pix: um Pix de R$ 120 libera 30 dias, sem renovação automática. O pagamento
// confirmado (webhook, conferência da página ou cron) soma 30 dias no banco, numa função só.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createPixPayment, isTestMode } from "@/lib/mercadopago";
import { publicEnv } from "@/lib/env";
import { getPaymentSnapshot, searchPaymentsByReference } from "@/lib/loja/mercadopago";
import { orderPaymentsForDecision, type PaymentSnapshot } from "@/lib/loja/payment-state";
import { BATTLEPASS } from "./config";
import { closeRow } from "./card";
import { notifyBattlepass } from "./notify";
import { pixReference } from "./refs";
import {
  PAYMENT_COLUMNS,
  openSubscriptionOfAnyTier,
  paymentsOf,
  pendingPixOf,
  toSubscriptionLike,
  type PaymentRow,
  type PendingPix,
  type SubscriptionRow,
} from "./server";
import { isBattlepassActive } from "./state";

export type PixStartResult = { ok: true; pix: PendingPix } | { ok: false; error: string };

const RECONCILE_EVERY_MS = 3000;

function notificationUrl(): string | undefined {
  const url = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return url.startsWith("https://") ? `${url}/api/webhooks/mercadopago` : undefined;
}

/** A linha de assinatura do Pix: a de pé (para somar 30 dias) ou uma nova. */
async function pixSubscriptionFor(userId: string): Promise<{ row: Pick<SubscriptionRow, "id"> } | { error: string }> {
  const supabase = createServiceClient();
  const open = await openSubscriptionOfAnyTier(userId);
  if (open) {
    const active = isBattlepassActive(toSubscriptionLike(open), new Date());
    if (open.tier === "battlepass" && open.provider === "mp" && active && open.status === "authorized") {
      return { error: "Seu Battlepass renova no cartão. Para trocar para o Pix, cancele a renovação e pague quando acabar." };
    }
    if (open.tier === "battlepass" && open.provider === "pix") return { row: open };
    if (active) return { error: "Seu Battlepass já está ativo." };
    // Cartão abandonado no checkout (ou plano antigo): cancela no Mercado Pago e sai do caminho.
    await closeRow(open);
  }
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ user_id: userId, status: "pending", tier: "battlepass", provider: "pix", is_test: isTestMode() })
    .select("id")
    .single();
  if (error || !data) throw new Error(`gravar assinatura do Pix falhou: ${error?.message}`);
  return { row: data };
}

function splitName(name: string): { first: string; last?: string } {
  const [first = name, ...rest] = name.trim().split(/\s+/);
  return { first, last: rest.join(" ") || undefined };
}

/** Gera o Pix de 30 dias (ou devolve o que ainda está pendente: um por pessoa). */
export async function startPix(user: { id: string; email: string; name: string }): Promise<PixStartResult> {
  const existing = pendingPixOf(await paymentsOf(user.id));
  if (existing) return { ok: true, pix: existing };
  const target = await pixSubscriptionFor(user.id);
  if ("error" in target) return { ok: false, error: target.error };

  const supabase = createServiceClient();
  const { data: payment, error } = await supabase
    .from("subscription_payments")
    .insert({ subscription_id: target.row.id, user_id: user.id, method: "pix", amount_cents: BATTLEPASS.priceCents, is_test: isTestMode() })
    .select("id")
    .single();
  if (error || !payment) throw new Error(`gravar o Pix falhou: ${error?.message}`);

  const { first, last } = splitName(user.name);
  const pix = await createPixPayment({
    amount: BATTLEPASS.priceCents / 100,
    description: `${BATTLEPASS.name}: 30 dias`,
    payerEmail: user.email,
    payerFirstName: first,
    payerLastName: last,
    externalReference: pixReference(payment.id),
    notificationUrl: notificationUrl(),
    statementDescriptor: "FORMULADOTA",
    itemId: "battlepass-30-dias",
    itemTitle: `${BATTLEPASS.name}: 30 dias`,
    itemCategoryId: "services",
    idempotencyKey: `battlepass-pix-${payment.id}`,
    expiresInMinutes: BATTLEPASS.pixMinutes,
  });
  if (!pix.success) {
    await supabase.from("subscription_payments").update({ status: "cancelado", updated_at: new Date().toISOString() }).eq("id", payment.id);
    return { ok: false, error: "O Mercado Pago não gerou o Pix agora. Tente de novo em instantes ou assine no cartão." };
  }
  const { error: saveError } = await supabase
    .from("subscription_payments")
    .update({
      mp_payment_id: pix.data.id,
      pix_copia_e_cola: pix.data.qrCode,
      pix_qr_base64: pix.data.qrCodeBase64,
      pix_expires_at: pix.data.expiresAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);
  if (saveError) throw new Error(`gravar o código do Pix falhou: ${saveError.message}`);
  return {
    ok: true,
    pix: {
      paymentId: payment.id,
      copiaECola: pix.data.qrCode,
      qrDataUrl: pix.data.qrCodeBase64 ? `data:image/png;base64,${pix.data.qrCodeBase64}` : null,
      expiresAt: pix.data.expiresAt ?? null,
    },
  };
}

export type PixOutcome = "pago" | "revisar" | "expirado" | "reembolsado" | "nada";

const REFUNDED = new Set(["refunded", "charged_back"]);

async function loadPayment(paymentId: string): Promise<PaymentRow | null> {
  const { data, error } = await createServiceClient()
    .from("subscription_payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", paymentId)
    .maybeSingle<PaymentRow>();
  if (error) throw new Error(`ler o Pix falhou: ${error.message}`);
  return data;
}

/** Aplica um pagamento do Mercado Pago ao Pix do Battlepass (webhook e conferência chegam aqui). */
export async function applyPixPayment(paymentId: string, snapshot: PaymentSnapshot): Promise<PixOutcome> {
  const row = await loadPayment(paymentId);
  if (!row || row.method !== "pix") return "nada";
  const supabase = createServiceClient();
  if (snapshot.status === "approved") {
    const wrongAmount = snapshot.amountCents === null || snapshot.amountCents < row.amount_cents;
    const wrongCurrency = !!snapshot.currency && snapshot.currency !== "BRL";
    if (wrongAmount || wrongCurrency) {
      const { data } = await supabase
        .from("subscription_payments")
        .update({ status: "em_revisao", paid_amount_cents: snapshot.amountCents, mp_payment_id: snapshot.id, updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .in("status", ["pendente", "expirado", "cancelado"])
        .select("id");
      if (data?.length) void notifyBattlepass({ kind: "revisar", userId: row.user_id, isTest: row.is_test, reason: "o Pix caiu com valor ou moeda diferente" });
      return "revisar";
    }
    const { data: outcome, error } = await supabase.rpc("battlepass_pix_confirmar", {
      p_payment_id: row.id,
      p_mp_payment_id: snapshot.id,
      p_paid_cents: snapshot.amountCents ?? row.amount_cents,
      p_gateway: { id: snapshot.id, status: snapshot.status, status_detail: snapshot.statusDetail ?? null, live_mode: snapshot.liveMode ?? null },
    });
    if (error) throw new Error(`confirmar o Pix falhou: ${error.message}`);
    if (outcome === "pago") {
      const fresh = await loadPayment(row.id);
      void notifyBattlepass({ kind: "pagou_pix", userId: row.user_id, isTest: row.is_test, amountCents: snapshot.amountCents ?? row.amount_cents, until: fresh?.period_end ?? new Date().toISOString() });
      return "pago";
    }
    if (outcome === "revisar") {
      void notifyBattlepass({ kind: "revisar", userId: row.user_id, isTest: row.is_test, reason: "o Pix caiu com outra assinatura já ativa" });
      return "revisar";
    }
    return "nada";
  }
  if (REFUNDED.has(snapshot.status)) {
    const { data } = await supabase
      .from("subscription_payments")
      .update({ status: "reembolsado", updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .in("status", ["pago", "em_revisao", "reembolso_pedido"])
      .select("id");
    return data?.length ? "reembolsado" : "nada";
  }
  // Pix vencido sem pagar: o pedido para de valer; pagar de novo gera outro.
  if (snapshot.status === "cancelled" && row.status === "pendente" && snapshot.id === row.mp_payment_id) {
    await supabase.from("subscription_payments").update({ status: "expirado", updated_at: new Date().toISOString() }).eq("id", row.id).eq("status", "pendente");
    return "expirado";
  }
  return "nada";
}

/** Conferência pela página e pelo cron: no máximo uma consulta ao Mercado Pago a cada 3 s por Pix. */
export async function reconcilePix(paymentId: string): Promise<PixOutcome> {
  const cutoff = new Date(Date.now() - RECONCILE_EVERY_MS).toISOString();
  const { data: claimed, error } = await createServiceClient()
    .from("subscription_payments")
    .update({ checked_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("status", "pendente")
    .or(`checked_at.is.null,checked_at.lt."${cutoff}"`)
    .select("mp_payment_id")
    .maybeSingle();
  if (error || !claimed) return "nada";
  let payments: PaymentSnapshot[] = [];
  if (claimed.mp_payment_id) {
    const direct = await getPaymentSnapshot(claimed.mp_payment_id);
    if (direct.success) payments = [direct.data];
  }
  // A aprovação pode vir por outro pagamento na mesma referência (o roteiro de teste aprova assim).
  const found = await searchPaymentsByReference(pixReference(paymentId));
  if (found.success) payments = [...payments, ...found.data.filter((p) => !payments.some((q) => q.id === p.id))];
  for (const payment of orderPaymentsForDecision(payments)) {
    const outcome = await applyPixPayment(paymentId, payment);
    if (outcome !== "nada") return outcome;
  }
  return "nada";
}
