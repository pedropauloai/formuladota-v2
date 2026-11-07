// Pagamento aplicado ao pedido: o webhook e a página do pedido (conciliação) chegam aqui.
// A transição é um UPDATE condicional no status, então quem chegar segundo vira no-op e o
// aviso de venda sai uma vez só.

import "server-only";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decideTransition, orderPaymentsForDecision, type PaymentSnapshot, type StoreOrderStatus, type Transition } from "./payment-state";
import { getPaymentSnapshot, searchPaymentsByReference } from "./mercadopago";
import { toStoreReference } from "./refs";
import { sendSaleNotification } from "./notify";

const RECONCILE_EVERY_MS = 3000;

function gatewaySummary(payment: PaymentSnapshot) {
  // Só o que explica o estado: nada de dado do comprador nem link com a conta vendedora.
  return {
    id: payment.id,
    status: payment.status,
    status_detail: payment.statusDetail ?? null,
    amount_cents: payment.amountCents,
    currency: payment.currency ?? null,
    live_mode: payment.liveMode ?? null,
  };
}

function scheduleNotification(orderId: string): void {
  const task = () => sendSaleNotification(orderId);
  try {
    // Na Cloudflare o after() vira waitUntil: o aviso termina depois da resposta.
    after(task);
  } catch {
    // Fora de requisição (roteiro de teste) o after() lança: aí o aviso corre na hora.
    void task();
  }
}

async function updateWhen(orderId: string, from: StoreOrderStatus[], values: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("store_orders")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", from)
    .select("id")
    .maybeSingle();
  // Erro de banco é transitório: sobe para o webhook devolver 500 e o Mercado Pago reenviar.
  if (error) throw new Error(`atualizar pedido ${orderId} falhou: ${error.message}`);
  return data !== null;
}

async function applyTransition(orderId: string, t: Transition, payment: PaymentSnapshot): Promise<boolean> {
  const now = new Date().toISOString();
  const payload = gatewaySummary(payment);
  switch (t.kind) {
    case "pagar":
      return updateWhen(orderId, ["pendente"], {
        status: "pago",
        paid_at: now,
        paid_amount_cents: t.paidAmountCents,
        mp_payment_id: payment.id,
        gateway_payload: payload,
      });
    case "revisar":
      return updateWhen(orderId, ["pendente"], {
        status: "em_revisao",
        paid_amount_cents: t.paidAmountCents,
        mp_payment_id: payment.id,
        gateway_payload: { ...payload, motivo: t.reason },
      });
    case "reembolsar":
      return updateWhen(orderId, ["pago", "em_revisao"], { status: "reembolsado", gateway_payload: payload });
    case "expirar":
      return updateWhen(orderId, ["pendente"], { status: "expirado", gateway_payload: payload });
    default:
      return false;
  }
}

/** Aplica um pagamento ao pedido e devolve o que mudou ("nada" quando outra via chegou antes). */
export async function applyStorePayment(orderId: string, payment: PaymentSnapshot): Promise<Transition["kind"]> {
  const { data: order, error } = await createServiceClient()
    .from("store_orders")
    .select("status, amount_cents, payment_method, mp_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`ler pedido ${orderId} falhou: ${error.message}`);
  if (!order) return "nada";
  const transition = decideTransition(
    {
      status: order.status as StoreOrderStatus,
      amountCents: order.amount_cents,
      pixPaymentId: order.payment_method === "pix" ? order.mp_payment_id : null,
    },
    payment
  );
  const changed = await applyTransition(orderId, transition, payment);
  if (!changed) return "nada";
  if (transition.kind === "pagar" || transition.kind === "revisar") scheduleNotification(orderId);
  return transition.kind;
}

async function paymentsOf(orderId: string, method: string, pixPaymentId: string | null): Promise<PaymentSnapshot[]> {
  if (method === "pix" && pixPaymentId) {
    // O GET pelo ID é imediato; a busca por referência pode demorar alguns segundos para indexar.
    const direct = await getPaymentSnapshot(pixPaymentId);
    if (direct.success) return [direct.data];
  }
  const found = await searchPaymentsByReference(toStoreReference(orderId));
  return found.success ? found.data : [];
}

/** Conciliação pela página do pedido: no máximo uma consulta ao Mercado Pago a cada 3 s. */
export async function reconcileStoreOrder(orderId: string): Promise<void> {
  const cutoff = new Date(Date.now() - RECONCILE_EVERY_MS).toISOString();
  const { data: claimed, error } = await createServiceClient()
    .from("store_orders")
    .update({ checked_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pendente")
    .or(`checked_at.is.null,checked_at.lt."${cutoff}"`)
    .select("payment_method, mp_payment_id")
    .maybeSingle();
  if (error || !claimed) return;
  try {
    const payments = await paymentsOf(orderId, claimed.payment_method, claimed.mp_payment_id);
    for (const payment of orderPaymentsForDecision(payments)) {
      if ((await applyStorePayment(orderId, payment)) !== "nada") break;
    }
  } catch (err) {
    console.error("[loja] conciliação falhou:", err);
  }
}
