// O que o painel /admin/battlepass mostra, calculado das linhas do banco. Regra pura e testada:
// quem tem acesso, quanto entrou no mês, o que falta devolver e o placar do teste de 30 dias.

import { BATTLEPASS } from "./config";
import { isBattlepassActive } from "./state";

export interface AdminSubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  provider: string;
  tier: string;
  next_payment_date: string | null;
  started_at: string | null;
  cancelled_at: string | null;
  is_test: boolean;
  created_at: string;
}

export interface AdminPaymentRow {
  id: string;
  subscription_id: string;
  user_id: string;
  method: "cartao" | "pix";
  status: string;
  amount_cents: number;
  paid_amount_cents: number | null;
  mp_payment_id: string | null;
  paid_at: string | null;
  refund_requested_at: string | null;
  period_end: string | null;
  is_test: boolean;
}

export interface AdminMember {
  subscriptionId: string;
  userId: string;
  via: "cartao" | "pix";
  active: boolean;
  statusLabel: string;
  paidCents: number;
  paidCount: number;
}

export interface AdminRefund {
  paymentId: string;
  userId: string;
  method: "cartao" | "pix";
  amountCents: number;
  mpPaymentId: string | null;
  requestedAt: string | null;
}

export interface AdminView {
  activeCount: number;
  activeCard: number;
  activePix: number;
  monthCents: number;
  members: AdminMember[];
  refunds: AdminRefund[];
  test: { payers: number; label: string };
}

/** Teste de 30 dias (spec): passa com 5 assinantes pagos, falha com menos de 2, a partir do primeiro dia à venda. */
export const TEST_PASS = 5;
export const TEST_FAIL = 2;
const TEST_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

function statusLabel(sub: AdminSubscriptionRow, active: boolean): string {
  if (sub.status === "pending") return sub.provider === "mp" ? "começou no cartão, sem cobrança" : "Pix gerado, sem pagamento";
  const until = sub.next_payment_date ? DATE.format(new Date(sub.next_payment_date)) : "sem data";
  if (!active) return `encerrado em ${until}`;
  if (sub.provider === "mp" && sub.status === "authorized") return `renova em ${until}`;
  return `vale até ${until}`;
}

const PAID = new Set(["pago", "reembolso_pedido", "reembolsado"]);

function testLabel(start: number, payers: number, now: Date): string {
  const end = start + TEST_DAYS * DAY;
  const left = Math.max(0, Math.ceil((end - now.getTime()) / DAY));
  const verdict = payers >= TEST_PASS ? "já passou" : left === 0 ? (payers < TEST_FAIL ? "falhou" : "ajustar a oferta") : `faltam ${left} dias`;
  return `passa com ${TEST_PASS}, falha com menos de ${TEST_FAIL}: ${verdict}`;
}

export function buildAdminView(subs: readonly AdminSubscriptionRow[], payments: readonly AdminPaymentRow[], now: Date): AdminView {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const paidBySub = new Map<string, { cents: number; count: number }>();
  let monthCents = 0;
  for (const p of payments) {
    if (!PAID.has(p.status) || !p.paid_at) continue;
    const cents = p.paid_amount_cents ?? p.amount_cents;
    const acc = paidBySub.get(p.subscription_id) ?? { cents: 0, count: 0 };
    paidBySub.set(p.subscription_id, { cents: acc.cents + cents, count: acc.count + 1 });
    if (p.status === "pago" && Date.parse(p.paid_at) >= monthStart) monthCents += cents;
  }
  const members = subs
    .filter((s) => s.status !== "cancelled" || paidBySub.has(s.id))
    .map((s): AdminMember => {
      const active = isBattlepassActive(
        { id: s.id, status: s.status, provider: s.provider, tier: s.tier, nextPaymentDate: s.next_payment_date },
        now
      );
      const paid = paidBySub.get(s.id) ?? { cents: 0, count: 0 };
      return { subscriptionId: s.id, userId: s.user_id, via: s.provider === "pix" ? "pix" : "cartao", active, statusLabel: statusLabel(s, active), paidCents: paid.cents, paidCount: paid.count };
    })
    .sort((a, b) => Number(b.active) - Number(a.active) || b.paidCents - a.paidCents);
  const active = members.filter((m) => m.active);
  const refunds = payments
    .filter((p) => p.status === "reembolso_pedido")
    .map((p) => ({ paymentId: p.id, userId: p.user_id, method: p.method, amountCents: p.paid_amount_cents ?? p.amount_cents, mpPaymentId: p.mp_payment_id, requestedAt: p.refund_requested_at }));
  const start = Date.parse(BATTLEPASS.onSaleSince);
  const inTest = (iso: string | null) => !!iso && Date.parse(iso) >= start && Date.parse(iso) < start + TEST_DAYS * DAY;
  const payers = new Set(payments.filter((p) => p.status === "pago" && inTest(p.paid_at)).map((p) => p.user_id)).size;
  return {
    activeCount: active.length,
    activeCard: active.filter((m) => m.via === "cartao").length,
    activePix: active.filter((m) => m.via === "pix").length,
    monthCents,
    members,
    refunds,
    test: { payers, label: testLabel(start, payers, now) },
  };
}
