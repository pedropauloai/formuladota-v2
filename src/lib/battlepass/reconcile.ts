// Entradas do Battlepass vindas de fora: o webhook do Mercado Pago e o cron do site (rede de
// segurança: o cartão e o Pix ativam mesmo se o webhook falhar ou não estiver configurado).

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";
import type { PaymentSnapshot } from "@/lib/loja/payment-state";
import { syncCardSubscription, syncCardSubscriptionById, syncCardSubscriptionByPreapproval } from "./card";
import { getAuthorizedPayment } from "./mp";
import { applyPixPayment, reconcilePix } from "./pix";
import { markRefundedByMpPayment } from "./refund";
import type { BattlepassRef } from "./refs";
import { SUBSCRIPTION_COLUMNS, type SubscriptionRow } from "./server";

const REFUNDED = new Set(["refunded", "charged_back"]);

/** Pagamento com referência do Battlepass (Pix de 30 dias ou cobrança do cartão). */
export async function handleBattlepassPayment(ref: BattlepassRef, snapshot: PaymentSnapshot): Promise<void> {
  if (ref.kind === "pix") {
    await applyPixPayment(ref.paymentId, snapshot);
    return;
  }
  if (REFUNDED.has(snapshot.status)) {
    await markRefundedByMpPayment(snapshot.id);
    return;
  }
  if (snapshot.status === "approved") await syncCardSubscriptionById(ref.subscriptionId);
}

/** Evento da assinatura no Mercado Pago. Devolve true quando era do Battlepass. */
export async function handleBattlepassPreapproval(preapprovalId: string): Promise<boolean> {
  return (await syncCardSubscriptionByPreapproval(preapprovalId)) !== "nada" || (await isBattlepassPreapproval(preapprovalId));
}

async function isBattlepassPreapproval(preapprovalId: string): Promise<boolean> {
  const { data } = await createServiceClient()
    .from("subscriptions")
    .select("tier")
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle();
  return data?.tier === "battlepass";
}

/** Evento de cobrança da assinatura. Devolve true quando era do Battlepass. */
export async function handleBattlepassAuthorizedPayment(authorizedPaymentId: string): Promise<boolean> {
  const found = await getAuthorizedPayment(authorizedPaymentId);
  if (!found.success) throw new Error(`ler a cobrança ${authorizedPaymentId} falhou: ${found.error}`);
  if (!(await isBattlepassPreapproval(found.data.preapproval_id))) return false;
  await syncCardSubscriptionByPreapproval(found.data.preapproval_id);
  return true;
}

const PIX_WINDOW_MS = 26 * 60 * 60 * 1000;
const MAX_PER_RUN = 10;

async function reconcilePendingPix(isTest: boolean): Promise<{ checked: number; changed: number }> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - PIX_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("id")
    .eq("status", "pendente")
    .eq("method", "pix")
    .eq("is_test", isTest)
    .gte("created_at", since)
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN);
  if (error) throw new Error(`listar Pix pendentes falhou: ${error.message}`);
  let changed = 0;
  for (const row of data ?? []) {
    if ((await reconcilePix(row.id)) !== "nada") changed += 1;
  }
  const { error: expireError } = await supabase
    .from("subscription_payments")
    .update({ status: "expirado", updated_at: new Date().toISOString() })
    .eq("status", "pendente")
    .eq("is_test", isTest)
    .lt("created_at", since);
  if (expireError) throw new Error(`vencer Pix antigos falhou: ${expireError.message}`);
  return { checked: data?.length ?? 0, changed };
}

/** Cartões a conferir: começados há pouco, perto da renovação ou pausados. Cada um no máximo a cada 10 min. */
async function reconcileCards(isTest: boolean): Promise<{ checked: number; changed: number }> {
  const supabase = createServiceClient();
  const now = Date.now();
  const recent = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dueSoon = new Date(now + 60 * 60 * 1000).toISOString();
  const lastCheck = new Date(now - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("tier", "battlepass")
    .eq("provider", "mp")
    .eq("is_test", isTest)
    .not("mp_preapproval_id", "is", null)
    .or(
      `and(or(and(status.eq.pending,created_at.gte."${recent}"),and(status.eq.authorized,next_payment_date.is.null),` +
        `and(status.eq.authorized,next_payment_date.lte."${dueSoon}"),status.eq.paused),or(checked_at.is.null,checked_at.lt."${lastCheck}"))`
    )
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN)
    .returns<SubscriptionRow[]>();
  if (error) throw new Error(`listar assinaturas a conferir falhou: ${error.message}`);
  let changed = 0;
  for (const row of data ?? []) {
    await supabase.from("subscriptions").update({ checked_at: new Date().toISOString() }).eq("id", row.id);
    try {
      if ((await syncCardSubscription(row)) !== "nada") changed += 1;
    } catch (err) {
      console.error("[battlepass] conferir assinatura falhou:", row.id, err instanceof Error ? err.message : err);
    }
  }
  return { checked: data?.length ?? 0, changed };
}

/** Tarefa "battlepass" do cron do site. */
export async function reconcileBattlepass(): Promise<{ pix: { checked: number; changed: number }; cartoes: { checked: number; changed: number } }> {
  const isTest = isTestMode();
  const [pix, cartoes] = await Promise.all([reconcilePendingPix(isTest), reconcileCards(isTest)]);
  return { pix, cartoes };
}
