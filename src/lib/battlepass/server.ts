// Leitura do Battlepass no servidor (service role): a assinatura e os pagamentos de quem está
// logado, e quem tem o selo. A escrita fica em card.ts, pix.ts e refund.ts.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";
import { refundWindow, resolveBattlepass, type BattlepassView, type RefundWindow, type SubscriptionLike } from "./state";

export const SUBSCRIPTION_COLUMNS =
  "id, user_id, status, provider, tier, next_payment_date, started_at, cancelled_at, mp_preapproval_id, is_test, created_at";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  provider: string;
  tier: string;
  next_payment_date: string | null;
  started_at: string | null;
  cancelled_at: string | null;
  mp_preapproval_id: string | null;
  is_test: boolean;
  created_at: string;
}

export const PAYMENT_COLUMNS =
  "id, subscription_id, user_id, method, status, amount_cents, paid_amount_cents, mp_payment_id, pix_copia_e_cola, " +
  "pix_qr_base64, pix_expires_at, period_start, period_end, paid_at, created_at, is_test";

export interface PaymentRow {
  id: string;
  subscription_id: string;
  user_id: string;
  method: "cartao" | "pix";
  status: string;
  amount_cents: number;
  paid_amount_cents: number | null;
  mp_payment_id: string | null;
  pix_copia_e_cola: string | null;
  pix_qr_base64: string | null;
  pix_expires_at: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
  is_test: boolean;
}

/** Linha que ocupa a vaga de "uma assinatura de pé por pessoa" (índice subscriptions_one_active_per_user). */
export const OPEN_STATUSES = ["pending", "authorized", "paused"] as const;

export function toSubscriptionLike(row: SubscriptionRow): SubscriptionLike {
  return { id: row.id, status: row.status, provider: row.provider, tier: row.tier, nextPaymentDate: row.next_payment_date, cancelledAt: row.cancelled_at };
}

/** A assinatura do Battlepass que vale para a pessoa: a de pé, ou a mais recente. */
export async function currentSubscription(userId: string, isTest = isTestMode()): Promise<SubscriptionRow | null> {
  const { data, error } = await createServiceClient()
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("user_id", userId)
    .eq("tier", "battlepass")
    .eq("is_test", isTest)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<SubscriptionRow[]>();
  if (error) throw new Error(`ler a assinatura falhou: ${error.message}`);
  const rows = data ?? [];
  return rows.find((r) => (OPEN_STATUSES as readonly string[]).includes(r.status)) ?? rows[0] ?? null;
}

/** A linha de pé de qualquer tier (o índice só deixa uma por pessoa). */
export async function openSubscriptionOfAnyTier(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await createServiceClient()
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("user_id", userId)
    .in("status", [...OPEN_STATUSES])
    .limit(1)
    .returns<SubscriptionRow[]>();
  if (error) throw new Error(`ler a assinatura falhou: ${error.message}`);
  return data?.[0] ?? null;
}

export async function paymentsOf(userId: string, isTest = isTestMode()): Promise<PaymentRow[]> {
  const { data, error } = await createServiceClient()
    .from("subscription_payments")
    .select(PAYMENT_COLUMNS)
    .eq("user_id", userId)
    .eq("is_test", isTest)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PaymentRow[]>();
  if (error) throw new Error(`ler os pagamentos falhou: ${error.message}`);
  return data ?? [];
}

export interface PendingPix {
  paymentId: string;
  copiaECola: string;
  qrDataUrl: string | null;
  expiresAt: string | null;
}

/** O Pix que ainda dá para pagar (um por pessoa: tocar de novo devolve o mesmo). */
export function pendingPixOf(payments: readonly PaymentRow[], now = new Date()): PendingPix | null {
  const pix = payments.find(
    (p) =>
      p.method === "pix" &&
      p.status === "pendente" &&
      p.pix_copia_e_cola &&
      (!p.pix_expires_at || Date.parse(p.pix_expires_at) > now.getTime() + 60_000)
  );
  if (!pix?.pix_copia_e_cola) return null;
  return {
    paymentId: pix.id,
    copiaECola: pix.pix_copia_e_cola,
    qrDataUrl: pix.pix_qr_base64 ? `data:image/png;base64,${pix.pix_qr_base64}` : null,
    expiresAt: pix.pix_expires_at,
  };
}

export interface PaymentSummary {
  id: string;
  method: "cartao" | "pix";
  status: string;
  amountCents: number;
  paidAt: string | null;
  periodEnd: string | null;
}

export interface MyBattlepass {
  view: BattlepassView;
  refund: RefundWindow | null;
  pendingPix: PendingPix | null;
  /** Pagamentos já feitos (para o histórico na página). */
  history: PaymentSummary[];
}

export function summarize(payments: readonly PaymentRow[]): PaymentSummary[] {
  return payments
    .filter((p) => p.status !== "pendente" && p.status !== "cancelado" && p.status !== "expirado")
    .map((p) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      amountCents: p.paid_amount_cents ?? p.amount_cents,
      paidAt: p.paid_at,
      periodEnd: p.period_end,
    }));
}

export async function getMyBattlepass(userId: string, now = new Date()): Promise<MyBattlepass> {
  const [sub, payments] = await Promise.all([currentSubscription(userId), paymentsOf(userId)]);
  const view = resolveBattlepass(sub ? toSubscriptionLike(sub) : null, now);
  const refund =
    view.state === "ativo"
      ? refundWindow(
          payments.map((p) => ({ status: p.status, method: p.method, paidAt: p.paid_at, amountCents: p.amount_cents, paidAmountCents: p.paid_amount_cents })),
          now
        )
      : null;
  return { view, refund, pendingPix: pendingPixOf(payments, now), history: summarize(payments) };
}

/** Quem de uma lista tem o Battlepass ativo (o selo). */
export async function battlepassMembers(userIds: readonly string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return new Set();
  const { data, error } = await createServiceClient().rpc("battlepass_membros", { p_user_ids: ids, p_is_test: isTestMode() });
  if (error) {
    console.error("[battlepass] ler o selo falhou:", error.message);
    return new Set();
  }
  return new Set((data ?? []) as string[]);
}

export async function hasActiveBattlepass(userId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("battlepass_ativo", { p_user_id: userId, p_is_test: isTestMode() });
  if (error) throw new Error(`conferir o Battlepass falhou: ${error.message}`);
  return data === true;
}
