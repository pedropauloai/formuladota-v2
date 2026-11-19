// Battlepass no cartão: assinatura do Mercado Pago (preapproval) que renova todo mês. A primeira
// cobrança aprovada libera o acesso; o webhook, a volta do checkout e o cron conferem no Mercado Pago.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getPaymentDetail, isTestMode } from "@/lib/mercadopago";
import { publicEnv } from "@/lib/env";
import { BATTLEPASS, DAY_MS } from "./config";
import { chargeFrom } from "./charge";
import {
  cancelBattlepassPreapproval,
  checkoutUrlOf,
  createBattlepassPreapproval,
  getBattlepassPreapproval,
  listAuthorizedPayments,
  type MpAuthorizedPayment,
  type MpPreapproval,
} from "./mp";
import { notifyBattlepass } from "./notify";
import { SUBSCRIPTION_COLUMNS, openSubscriptionOfAnyTier, toSubscriptionLike, type SubscriptionRow } from "./server";
import { isBattlepassActive } from "./state";

export type StartResult = { ok: true; url: string } | { ok: false; error: string };

const PRODUCTION_URL = "https://www.formuladota.com.br";

/** O Mercado Pago só aceita volta em https: no servidor local, a volta vai para o domínio real. */
const backBaseUrl = () => {
  const site = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return site.startsWith("https://") ? site : PRODUCTION_URL;
};

/** Fecha a linha que sobrou (e a assinatura dela no Mercado Pago), para abrir outra. */
export async function closeRow(row: SubscriptionRow): Promise<void> {
  // Linha que sobrou (cartão abandonado, Pix vencido, plano antigo): sai do caminho do índice.
  if (row.provider === "mp" && row.mp_preapproval_id && row.status !== "cancelled") {
    const cancelled = await cancelBattlepassPreapproval(row.mp_preapproval_id);
    if (!cancelled.success) console.error("[battlepass] cancelar assinatura antiga no Mercado Pago falhou:", row.id);
  }
  const { error } = await createServiceClient()
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) throw new Error(`fechar assinatura antiga falhou: ${error.message}`);
}

/** Abre a assinatura no cartão e devolve o checkout do Mercado Pago. */
export async function startCardSubscription(user: { id: string; email: string }): Promise<StartResult> {
  const open = await openSubscriptionOfAnyTier(user.id);
  if (open && isBattlepassActive(toSubscriptionLike(open), new Date())) {
    return { ok: false, error: "Seu Battlepass já está ativo." };
  }
  if (open) await closeRow(open);

  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("subscriptions")
    .insert({ user_id: user.id, status: "pending", tier: "battlepass", provider: "mp", is_test: isTestMode() })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[battlepass] gravar assinatura falhou:", error?.message);
    return { ok: false, error: "Não deu para começar a assinatura agora. Tente de novo em instantes." };
  }
  const preapproval = await createBattlepassPreapproval({
    subscriptionId: row.id,
    payerEmail: user.email,
    backUrl: `${backBaseUrl()}/planos?assinatura=${row.id}`,
  });
  const url = preapproval.success ? checkoutUrlOf(preapproval.data, isTestMode()) : null;
  if (!preapproval.success || !url) {
    await supabase.from("subscriptions").delete().eq("id", row.id);
    return { ok: false, error: "O Mercado Pago não abriu a assinatura agora. Tente de novo ou pague no Pix." };
  }
  const { error: saveError } = await supabase
    .from("subscriptions")
    .update({ mp_preapproval_id: preapproval.data.id, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (saveError) throw new Error(`gravar a assinatura do Mercado Pago falhou: ${saveError.message}`);
  return { ok: true, url };
}

/** Cobrança aprovada: o pagamento dela, com valor e data, pela API de Payments. */
async function approvedCharge(item: MpAuthorizedPayment) {
  const paymentId = item.payment?.id;
  if (!paymentId || item.payment?.status !== "approved") return null;
  const detail = await getPaymentDetail(paymentId);
  if (!detail.success) throw new Error(`ler a cobrança ${paymentId} falhou: ${detail.error}`);
  return chargeFrom({ ...item, payment: { id: paymentId, status: item.payment.status } }, detail.data);
}

/** Grava as cobranças aprovadas que ainda não estão no livro. Devolve quantas entraram. */
async function recordCharges(row: SubscriptionRow, preapproval: MpPreapproval): Promise<number> {
  if (!row.mp_preapproval_id) return 0;
  const charges = await listAuthorizedPayments(row.mp_preapproval_id);
  if (!charges.success) throw new Error(`listar cobranças falhou: ${charges.error}`);
  const { data: known, error: knownError } = await createServiceClient()
    .from("subscription_payments")
    .select("mp_authorized_payment_id")
    .eq("subscription_id", row.id)
    .not("mp_authorized_payment_id", "is", null);
  if (knownError) throw new Error(`ler cobranças gravadas falhou: ${knownError.message}`);
  const recorded = new Set((known ?? []).map((k) => k.mp_authorized_payment_id));
  let added = 0;
  for (const item of charges.data) {
    if (recorded.has(item.id)) continue;
    const charge = await approvedCharge(item);
    if (!charge) continue;
    const { data, error } = await createServiceClient().rpc("battlepass_cartao_cobranca", {
      p_subscription_id: row.id,
      p_authorized_payment_id: charge.authorizedId,
      p_mp_payment_id: charge.paymentId,
      p_paid_cents: charge.amountCents,
      p_paid_at: charge.paidAt,
      // Sem a data do Mercado Pago, o período é de 30 dias a partir da cobrança (a função faz igual).
      p_next_payment_date: preapproval.next_payment_date ?? new Date(Date.parse(charge.paidAt) + BATTLEPASS.periodDays * DAY_MS).toISOString(),
      p_gateway: { authorized_payment: item.id, status: item.status ?? null, payment_status: item.payment?.status ?? null },
    });
    if (error) throw new Error(`gravar cobrança falhou: ${error.message}`);
    if (data === true) added += 1;
  }
  return added;
}

export type SyncResult = "ativou" | "renovou" | "cancelou" | "pausou" | "nada";

/** Confere a assinatura no Mercado Pago e aplica: estado, cobranças novas e aviso ao Pedro. */
export async function syncCardSubscription(row: SubscriptionRow): Promise<SyncResult> {
  if (row.provider !== "mp" || !row.mp_preapproval_id) return "nada";
  const found = await getBattlepassPreapproval(row.mp_preapproval_id);
  if (!found.success) throw new Error(`conferir a assinatura ${row.id} falhou: ${found.error}`);
  const preapproval = found.data;
  const supabase = createServiceClient();
  const wasActive = isBattlepassActive(toSubscriptionLike(row), new Date());

  if (preapproval.status === "cancelled" || preapproval.status === "paused") {
    const status = preapproval.status;
    if (row.status === status) return "nada";
    const { error } = await supabase
      .from("subscriptions")
      .update({ status, cancelled_at: status === "cancelled" ? new Date().toISOString() : row.cancelled_at, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .neq("status", status);
    if (error) throw new Error(`atualizar assinatura falhou: ${error.message}`);
    return status === "cancelled" ? "cancelou" : "pausou";
  }
  if (preapproval.status !== "authorized") return "nada";
  if (row.status === "pending" || row.status === "paused") {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "authorized", started_at: row.started_at ?? new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .in("status", ["pending", "paused"]);
    if (error) throw new Error(`autorizar assinatura falhou: ${error.message}`);
  }
  const added = await recordCharges(row, preapproval);
  if (added === 0) return "nada";
  if (wasActive) {
    void notifyBattlepass({ kind: "renovou_cartao", userId: row.user_id, isTest: row.is_test, amountCents: BATTLEPASS.priceCents });
    return "renovou";
  }
  void notifyBattlepass({ kind: "assinou_cartao", userId: row.user_id, isTest: row.is_test });
  return "ativou";
}

export async function syncCardSubscriptionById(subscriptionId: string): Promise<SyncResult> {
  const { data, error } = await createServiceClient()
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("id", subscriptionId)
    .maybeSingle<SubscriptionRow>();
  if (error) throw new Error(`ler assinatura falhou: ${error.message}`);
  return data ? syncCardSubscription(data) : "nada";
}

export async function syncCardSubscriptionByPreapproval(preapprovalId: string): Promise<SyncResult> {
  const { data, error } = await createServiceClient()
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle<SubscriptionRow>();
  if (error) throw new Error(`ler assinatura falhou: ${error.message}`);
  return data && data.tier === "battlepass" ? syncCardSubscription(data) : "nada";
}

/** Para a renovação no cartão; o acesso segue até o fim do período pago. */
export async function cancelRenewal(row: SubscriptionRow): Promise<{ ok: true } | { ok: false; error: string }> {
  if (row.provider !== "mp" || !row.mp_preapproval_id || row.status !== "authorized") {
    return { ok: false, error: "Não há renovação no cartão para cancelar." };
  }
  const cancelled = await cancelBattlepassPreapproval(row.mp_preapproval_id);
  if (!cancelled.success) return { ok: false, error: "O Mercado Pago não cancelou agora. Tente de novo em instantes." };
  const { error } = await createServiceClient()
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) throw new Error(`gravar o cancelamento falhou: ${error.message}`);
  return { ok: true };
}
