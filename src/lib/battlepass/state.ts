// Estado do Battlepass de quem está logado: regra pura, a mesma do banco (battlepass_ativo e
// battlepass_pedir_reembolso, migration 190). A página e os testes leem daqui.

import { BATTLEPASS, DAY_MS } from "./config";

export interface SubscriptionLike {
  id: string;
  /** pending | authorized | paused | cancelled */
  status: string;
  /** mp (cartão) | pix | stripe */
  provider: string;
  tier: string;
  nextPaymentDate: string | null;
  /** Hora do cancelamento: no reembolso o acesso termina nela (o fim do período fica igual a ela). */
  cancelledAt?: string | null;
}

export interface PaymentLike {
  status: string;
  method: "cartao" | "pix";
  paidAt: string | null;
  amountCents: number;
  paidAmountCents: number | null;
}

export type BattlepassView =
  | { state: "nenhum" }
  /** Cartão começado no Mercado Pago e ainda sem a primeira cobrança aprovada. */
  | { state: "aguardando_cartao"; subscriptionId: string }
  | { state: "ativo"; via: "cartao" | "pix"; until: string; renews: boolean }
  | { state: "encerrado"; until: string };

const time = (iso: string | null): number => (iso ? Date.parse(iso) : Number.NaN);

/** O cartão autorizado ganha a folga das novas tentativas do Mercado Pago; o resto vale até a data. */
export function accessEndsAt(sub: SubscriptionLike): number {
  const end = time(sub.nextPaymentDate);
  const grace = sub.provider === "mp" && sub.status === "authorized" ? BATTLEPASS.cardGraceDays * DAY_MS : 0;
  return end + grace;
}

/** Mesma regra de battlepass_ativo: tier battlepass, autorizado ou cancelado, período no futuro. */
export function isBattlepassActive(sub: SubscriptionLike | null, now: Date): boolean {
  if (!sub || sub.tier !== "battlepass") return false;
  if (sub.status !== "authorized" && sub.status !== "cancelled") return false;
  // Reembolso: o período acaba na hora do cancelamento, sem depender do relógio do servidor bater com o do banco.
  if (sub.status === "cancelled" && sub.cancelledAt && sub.nextPaymentDate && time(sub.nextPaymentDate) <= time(sub.cancelledAt)) return false;
  const end = accessEndsAt(sub);
  return Number.isFinite(end) && end > now.getTime();
}

export function resolveBattlepass(sub: SubscriptionLike | null, now: Date): BattlepassView {
  if (!sub || sub.tier !== "battlepass") return { state: "nenhum" };
  if (isBattlepassActive(sub, now) && sub.nextPaymentDate) {
    const via = sub.provider === "pix" ? "pix" : "cartao";
    return { state: "ativo", via, until: sub.nextPaymentDate, renews: via === "cartao" && sub.status === "authorized" };
  }
  if (sub.status === "pending" && sub.provider === "mp") return { state: "aguardando_cartao", subscriptionId: sub.id };
  // Cartão autorizado que ainda não teve a primeira cobrança aprovada.
  if (sub.status === "authorized" && sub.provider === "mp" && !sub.nextPaymentDate) {
    return { state: "aguardando_cartao", subscriptionId: sub.id };
  }
  if (sub.nextPaymentDate) return { state: "encerrado", until: sub.nextPaymentDate };
  return { state: "nenhum" };
}

export interface RefundWindow {
  /** Até quando dá para pedir o dinheiro de volta. */
  deadline: string;
  /** Tudo o que foi pago dentro do prazo e volta. */
  totalCents: number;
}

const PAID_OR_REFUNDED = new Set(["pago", "reembolso_pedido", "reembolsado"]);

/** Garantia de 7 dias, uma vez por pessoa: conta a partir do primeiro pagamento do Battlepass. */
export function refundWindow(payments: readonly PaymentLike[], now: Date): RefundWindow | null {
  const paid = payments
    .filter((p) => p.paidAt && PAID_OR_REFUNDED.has(p.status))
    .sort((a, b) => time(a.paidAt) - time(b.paidAt));
  const first = paid[0];
  if (!first || first.status !== "pago") return null;
  const deadline = time(first.paidAt) + BATTLEPASS.guaranteeDays * DAY_MS;
  if (now.getTime() > deadline) return null;
  const totalCents = paid
    .filter((p) => p.status === "pago" && time(p.paidAt) <= deadline)
    .reduce((sum, p) => sum + (p.paidAmountCents ?? p.amountCents), 0);
  return { deadline: new Date(deadline).toISOString(), totalCents };
}

/** De onde o próximo Pix soma 30 dias: do fim do período que ainda vale, ou de agora. */
export function nextPixPeriod(currentEnd: string | null, now: Date): { start: string; end: string } {
  const end = time(currentEnd);
  const start = Number.isFinite(end) && end > now.getTime() ? end : now.getTime();
  return { start: new Date(start).toISOString(), end: new Date(start + BATTLEPASS.periodDays * DAY_MS).toISOString() };
}
