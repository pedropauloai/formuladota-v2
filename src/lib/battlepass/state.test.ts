import { describe, expect, it } from "vitest";
import { isBattlepassActive, nextPixPeriod, refundWindow, resolveBattlepass, type PaymentLike, type SubscriptionLike } from "./state";
import { parseBattlepassReference, pixReference, subscriptionReference } from "./refs";

const now = new Date("2026-11-20T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

const sub = (over: Partial<SubscriptionLike>): SubscriptionLike => ({
  id: "s1",
  status: "authorized",
  provider: "pix",
  tier: "battlepass",
  nextPaymentDate: days(10),
  ...over,
});

const paid = (paidAt: string, over: Partial<PaymentLike> = {}): PaymentLike => ({
  status: "pago",
  method: "pix",
  paidAt,
  amountCents: 12000,
  paidAmountCents: 12000,
  ...over,
});

describe("Battlepass ativo", () => {
  it("vale até o fim do período no Pix", () => {
    expect(isBattlepassActive(sub({}), now)).toBe(true);
    expect(isBattlepassActive(sub({ nextPaymentDate: days(-1) }), now)).toBe(false);
  });

  it("dá 3 dias de folga ao cartão autorizado, e nenhuma ao cancelado", () => {
    expect(isBattlepassActive(sub({ provider: "mp", nextPaymentDate: days(-2) }), now)).toBe(true);
    expect(isBattlepassActive(sub({ provider: "mp", nextPaymentDate: days(-4) }), now)).toBe(false);
    expect(isBattlepassActive(sub({ provider: "mp", status: "cancelled", nextPaymentDate: days(-1) }), now)).toBe(false);
  });

  it("reembolso encerra na hora do cancelamento, mesmo com o relógio do servidor atrasado", () => {
    expect(isBattlepassActive(sub({ status: "cancelled", nextPaymentDate: days(0.0001), cancelledAt: days(0.0001) }), now)).toBe(false);
    expect(isBattlepassActive(sub({ status: "cancelled", provider: "mp", nextPaymentDate: days(10), cancelledAt: days(-1) }), now)).toBe(true);
  });

  it("não vale para outro tier, pausado ou pendente", () => {
    expect(isBattlepassActive(sub({ tier: "premium" }), now)).toBe(false);
    expect(isBattlepassActive(sub({ status: "paused" }), now)).toBe(false);
    expect(isBattlepassActive(sub({ status: "pending" }), now)).toBe(false);
    expect(isBattlepassActive(null, now)).toBe(false);
  });
});

describe("estado na página", () => {
  it("cartão autorizado renova; cancelado vale até o fim sem renovar", () => {
    expect(resolveBattlepass(sub({ provider: "mp" }), now)).toEqual({ state: "ativo", via: "cartao", until: days(10), renews: true });
    expect(resolveBattlepass(sub({ provider: "mp", status: "cancelled" }), now)).toEqual({ state: "ativo", via: "cartao", until: days(10), renews: false });
  });

  it("Pix nunca renova sozinho", () => {
    expect(resolveBattlepass(sub({}), now)).toEqual({ state: "ativo", via: "pix", until: days(10), renews: false });
  });

  it("cartão começado e sem cobrança aprovada espera", () => {
    expect(resolveBattlepass(sub({ provider: "mp", status: "pending", nextPaymentDate: null }), now).state).toBe("aguardando_cartao");
    expect(resolveBattlepass(sub({ provider: "mp", status: "authorized", nextPaymentDate: null }), now).state).toBe("aguardando_cartao");
  });

  it("período vencido aparece como encerrado; sem assinatura, nenhum", () => {
    expect(resolveBattlepass(sub({ nextPaymentDate: days(-3) }), now)).toEqual({ state: "encerrado", until: days(-3) });
    expect(resolveBattlepass(null, now)).toEqual({ state: "nenhum" });
    expect(resolveBattlepass(sub({ status: "pending", nextPaymentDate: null }), now)).toEqual({ state: "nenhum" });
  });
});

describe("garantia de 7 dias", () => {
  it("devolve tudo o que foi pago no prazo do primeiro pagamento", () => {
    const window = refundWindow([paid(days(-2)), paid(days(-1))], now);
    expect(window?.totalCents).toBe(24000);
    expect(window?.deadline).toBe(days(5));
  });

  it("acaba 7 dias depois do primeiro pagamento", () => {
    expect(refundWindow([paid(days(-8))], now)).toBeNull();
  });

  it("vale uma vez por pessoa: quem já pediu não pede de novo", () => {
    expect(refundWindow([paid(days(-30), { status: "reembolsado" }), paid(days(-1))], now)).toBeNull();
    expect(refundWindow([paid(days(-1), { status: "reembolso_pedido" })], now)).toBeNull();
  });

  it("ignora o que não foi pago", () => {
    expect(refundWindow([paid(days(-1), { status: "pendente", paidAt: null })], now)).toBeNull();
  });
});

describe("Pix seguinte", () => {
  it("soma 30 dias a partir do fim do período que ainda vale", () => {
    expect(nextPixPeriod(days(10), now)).toEqual({ start: days(10), end: days(40) });
  });

  it("com o período vencido, conta de agora", () => {
    expect(nextPixPeriod(days(-5), now)).toEqual({ start: now.toISOString(), end: days(30) });
    expect(nextPixPeriod(null, now)).toEqual({ start: now.toISOString(), end: days(30) });
  });
});

describe("referência no Mercado Pago", () => {
  const id = "0b9d2f3e-1c4a-4f6b-9a8e-2d7c5b3a1f00";

  it("ida e volta do Pix e da assinatura", () => {
    expect(parseBattlepassReference(pixReference(id))).toEqual({ kind: "pix", paymentId: id });
    expect(parseBattlepassReference(subscriptionReference(id))).toEqual({ kind: "assinatura", subscriptionId: id });
  });

  it("não confunde com a loja nem com lixo", () => {
    expect(parseBattlepassReference(`loja-${id}`)).toBeNull();
    expect(parseBattlepassReference("battlepass-pix-123")).toBeNull();
    expect(parseBattlepassReference(null)).toBeNull();
  });
});
