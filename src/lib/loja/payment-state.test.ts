import { describe, it, expect } from "vitest";
import { decideTransition, orderPaymentsForDecision, type OrderForDecision, type PaymentSnapshot } from "./payment-state";

const order = (over: Partial<OrderForDecision> = {}): OrderForDecision => ({
  status: "pendente",
  amountCents: 9990,
  pixPaymentId: "111",
  ...over,
});
const payment = (over: Partial<PaymentSnapshot> = {}): PaymentSnapshot => ({
  id: "111",
  status: "approved",
  amountCents: 9990,
  currency: "BRL",
  ...over,
});

describe("decideTransition", () => {
  it("pagamento aprovado com o valor certo paga o pedido pendente", () => {
    expect(decideTransition(order(), payment())).toEqual({ kind: "pagar", paidAmountCents: 9990 });
  });

  it("valor maior que o pedido (juros do parcelado) também paga", () => {
    expect(decideTransition(order(), payment({ amountCents: 10990 }))).toEqual({ kind: "pagar", paidAmountCents: 10990 });
  });

  it("valor menor vai para revisão, nunca para pago", () => {
    expect(decideTransition(order(), payment({ amountCents: 100 }))).toEqual({
      kind: "revisar",
      reason: "valor_menor",
      paidAmountCents: 100,
    });
  });

  it("valor ausente vai para revisão", () => {
    expect(decideTransition(order(), payment({ amountCents: null })).kind).toBe("revisar");
  });

  it("moeda diferente de BRL vai para revisão", () => {
    expect(decideTransition(order(), payment({ currency: "USD" }))).toMatchObject({ kind: "revisar", reason: "moeda" });
  });

  it("notificação repetida de pedido já pago não faz nada", () => {
    expect(decideTransition(order({ status: "pago" }), payment())).toEqual({ kind: "nada" });
  });

  it("estorno de pedido pago marca reembolsado", () => {
    expect(decideTransition(order({ status: "pago" }), payment({ status: "refunded" }))).toEqual({ kind: "reembolsar" });
    expect(decideTransition(order({ status: "pago" }), payment({ status: "charged_back" }))).toEqual({ kind: "reembolsar" });
  });

  it("estorno de pedido pendente não faz nada", () => {
    expect(decideTransition(order(), payment({ status: "refunded" }))).toEqual({ kind: "nada" });
  });

  it("o Pix do próprio pedido vencido expira o pedido", () => {
    expect(decideTransition(order(), payment({ status: "cancelled" }))).toEqual({ kind: "expirar" });
  });

  it("cartão recusado ou cancelado de outro pagamento não expira o pedido", () => {
    expect(decideTransition(order(), payment({ id: "222", status: "cancelled" }))).toEqual({ kind: "nada" });
    expect(decideTransition(order(), payment({ status: "rejected" }))).toEqual({ kind: "nada" });
  });

  it("pendente e em processo não mudam nada", () => {
    expect(decideTransition(order(), payment({ status: "pending" }))).toEqual({ kind: "nada" });
    expect(decideTransition(order(), payment({ status: "in_process" }))).toEqual({ kind: "nada" });
  });
});

describe("orderPaymentsForDecision", () => {
  it("põe o aprovado na frente dos recusados", () => {
    const list = [payment({ id: "1", status: "rejected" }), payment({ id: "2", status: "approved" }), payment({ id: "3", status: "pending" })];
    expect(orderPaymentsForDecision(list).map((p) => p.id)).toEqual(["2", "1", "3"]);
  });
});
