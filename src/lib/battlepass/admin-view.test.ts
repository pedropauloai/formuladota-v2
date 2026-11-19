import { describe, expect, it } from "vitest";
import { buildAdminView, type AdminPaymentRow, type AdminSubscriptionRow } from "./admin-view";

const now = new Date("2026-11-25T15:00:00Z");
const day = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const sub = (id: string, over: Partial<AdminSubscriptionRow> = {}): AdminSubscriptionRow => ({
  id, user_id: `u-${id}`, status: "authorized", provider: "pix", tier: "battlepass", next_payment_date: day(10),
  started_at: day(-20), cancelled_at: null, is_test: false, created_at: day(-20), ...over,
});
const pay = (id: string, subId: string, over: Partial<AdminPaymentRow> = {}): AdminPaymentRow => ({
  id, subscription_id: subId, user_id: `u-${subId}`, method: "pix", status: "pago", amount_cents: 12000, paid_amount_cents: 12000,
  mp_payment_id: `mp-${id}`, paid_at: day(-2), refund_requested_at: null, period_end: day(28), is_test: false, ...over,
});

describe("painel do Battlepass", () => {
  it("conta quem tem acesso por forma de pagamento e o que entrou no mês", () => {
    const view = buildAdminView(
      [sub("a"), sub("b", { provider: "mp" }), sub("c", { next_payment_date: day(-1) })],
      [pay("1", "a"), pay("2", "b", { method: "cartao" }), pay("3", "c", { paid_at: day(-31) })],
      now
    );
    expect(view.activeCount).toBe(2);
    expect(view.activeCard).toBe(1);
    expect(view.activePix).toBe(1);
    expect(view.monthCents).toBe(24000);
  });

  it("lista o que falta devolver na garantia", () => {
    const view = buildAdminView([sub("a", { status: "cancelled", next_payment_date: day(-1) })], [pay("1", "a", { status: "reembolso_pedido", refund_requested_at: day(-1) })], now);
    expect(view.refunds).toEqual([{ paymentId: "1", userId: "u-a", method: "pix", amountCents: 12000, mpPaymentId: "mp-1", requestedAt: day(-1) }]);
    expect(view.members[0]?.statusLabel.startsWith("encerrado")).toBe(true);
  });

  it("teste de 30 dias conta pagantes distintos, sem reembolso", () => {
    const view = buildAdminView(
      [sub("a"), sub("b")],
      [pay("1", "a"), pay("2", "a", { paid_at: day(-1) }), pay("3", "b", { status: "reembolsado" })],
      now
    );
    expect(view.test.payers).toBe(1);
    expect(view.test.label).toContain("passa com 5");
  });

  it("cartão que renova aparece com a data da renovação", () => {
    const view = buildAdminView([sub("a", { provider: "mp" })], [pay("1", "a", { method: "cartao" })], now);
    expect(view.members[0]?.statusLabel.startsWith("renova em")).toBe(true);
  });
});
