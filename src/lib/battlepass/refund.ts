// Garantia de 7 dias do Battlepass: o pedido de reembolso encerra o acesso na hora, para a
// renovação no Mercado Pago e avisa o Pedro de quanto devolver (como a saída da fila da party).

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";
import { cancelBattlepassPreapproval } from "./mp";
import { notifyBattlepass } from "./notify";
import { currentSubscription, paymentsOf } from "./server";
import { refundWindow } from "./state";

export type RefundResult = { ok: true; totalCents: number } | { ok: false; error: string };

export async function requestRefund(userId: string, now = new Date()): Promise<RefundResult> {
  const [sub, payments] = await Promise.all([currentSubscription(userId), paymentsOf(userId)]);
  const window = refundWindow(
    payments.map((p) => ({ status: p.status, method: p.method, paidAt: p.paid_at, amountCents: p.amount_cents, paidAmountCents: p.paid_amount_cents })),
    now
  );
  if (!window) return { ok: false, error: "A garantia vale nos 7 dias depois do primeiro pagamento, uma vez por pessoa." };

  // A renovação para antes do banco marcar o reembolso: sem isso o Mercado Pago cobraria no mês seguinte.
  if (sub && sub.provider === "mp" && sub.mp_preapproval_id && (sub.status === "authorized" || sub.status === "paused" || sub.status === "pending")) {
    const cancelled = await cancelBattlepassPreapproval(sub.mp_preapproval_id);
    if (!cancelled.success) return { ok: false, error: "O Mercado Pago não cancelou a renovação agora. Tente de novo em instantes." };
  }
  const { data: total, error } = await createServiceClient().rpc("battlepass_pedir_reembolso", { p_user_id: userId, p_is_test: isTestMode() });
  if (error) throw new Error(`pedir reembolso falhou: ${error.message}`);
  if (typeof total !== "number") return { ok: false, error: "A garantia vale nos 7 dias depois do primeiro pagamento, uma vez por pessoa." };

  const deadline = Date.parse(window.deadline);
  const mpPaymentIds = payments
    .filter((p) => p.status === "pago" && p.paid_at && Date.parse(p.paid_at) <= deadline && p.mp_payment_id)
    .map((p) => p.mp_payment_id as string);
  void notifyBattlepass({ kind: "reembolso", userId, isTest: isTestMode(), totalCents: total, mpPaymentIds });
  return { ok: true, totalCents: total };
}

/** Reembolso feito no Mercado Pago (webhook do pagamento devolvido): o livro registra. */
export async function markRefundedByMpPayment(mpPaymentId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("subscription_payments")
    .update({ status: "reembolsado", updated_at: new Date().toISOString() })
    .eq("mp_payment_id", mpPaymentId)
    .in("status", ["pago", "em_revisao", "reembolso_pedido"])
    .select("id");
  if (error) throw new Error(`marcar reembolso falhou: ${error.message}`);
  return (data ?? []).length > 0;
}
