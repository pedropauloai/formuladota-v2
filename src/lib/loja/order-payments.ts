// Pagamento aplicado ao pedido: o webhook e a página do pedido (conciliação) chegam aqui.
// A transição é um UPDATE condicional no status, então quem chegar segundo vira no-op e o
// aviso de venda sai uma vez só.

import "server-only";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";
import {
  PAYABLE_STATUSES,
  decideTransition,
  orderPaymentsForDecision,
  type PaymentSnapshot,
  type StoreOrderStatus,
  type Transition,
} from "./payment-state";
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
      return updateWhen(orderId, [...PAYABLE_STATUSES], {
        status: "pago",
        paid_at: now,
        paid_amount_cents: t.paidAmountCents,
        mp_payment_id: payment.id,
        gateway_payload: payload,
      });
    case "revisar":
      return updateWhen(orderId, [...PAYABLE_STATUSES], {
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
export async function reconcileStoreOrder(orderId: string): Promise<Transition["kind"]> {
  const cutoff = new Date(Date.now() - RECONCILE_EVERY_MS).toISOString();
  const { data: claimed, error } = await createServiceClient()
    .from("store_orders")
    .update({ checked_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pendente")
    .or(`checked_at.is.null,checked_at.lt."${cutoff}"`)
    .select("payment_method, mp_payment_id")
    .maybeSingle();
  if (error || !claimed) return "nada";
  try {
    const payments = await paymentsOf(orderId, claimed.payment_method, claimed.mp_payment_id);
    for (const payment of orderPaymentsForDecision(payments)) {
      const kind = await applyStorePayment(orderId, payment);
      if (kind !== "nada") return kind;
    }
  } catch (err) {
    console.error("[loja] conciliação falhou:", err);
  }
  return "nada";
}

// O Pix vence em 24 h e a preferência do cartão também: 26 h dá folga ao relógio do Mercado Pago.
const PENDING_WINDOW_MS = 26 * 60 * 60 * 1000;
const MAX_PER_RUN = 10;

/**
 * Rede de segurança do webhook, chamada pelo cron de cada minuto: concilia os pedidos pendentes
 * mais antigos sem consulta recente e vence os que passaram da janela. Se o webhook falhar e o
 * comprador fechar a página, a venda ainda vira pedido pago e aviso ao Pedro.
 */
export async function reconcilePendingStoreOrders(): Promise<{ checked: number; changed: number; expired: number }> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - PENDING_WINDOW_MS).toISOString();
  const { data: pending, error } = await supabase
    .from("store_orders")
    .select("id")
    .eq("status", "pendente")
    // Pedido de teste só existe no sandbox: a credencial de produção nunca o encontra, e vice-versa.
    .eq("is_test", isTestMode())
    .gte("created_at", since)
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN);
  if (error) throw new Error(`listar pedidos pendentes falhou: ${error.message}`);
  let changed = 0;
  for (const order of pending ?? []) {
    if ((await reconcileStoreOrder(order.id)) !== "nada") changed += 1;
  }
  const { data: expired, error: expireError } = await supabase
    .from("store_orders")
    .update({ status: "expirado", updated_at: new Date().toISOString() })
    .eq("status", "pendente")
    .lt("created_at", since)
    .select("id");
  if (expireError) throw new Error(`vencer pedidos antigos falhou: ${expireError.message}`);
  return { checked: pending?.length ?? 0, changed, expired: expired?.length ?? 0 };
}
