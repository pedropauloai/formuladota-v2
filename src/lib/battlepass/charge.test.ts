import { describe, expect, it } from "vitest";
import { chargeFrom } from "./charge";

const item = {
  id: "6114264375",
  status: "processed",
  transaction_amount: 120,
  debit_date: "2026-11-20T10:00:00.000-03:00",
  payment: { id: "1234567890", status: "approved" },
};
const detail = { status: "approved", transaction_amount: 120, currency_id: "BRL", date_approved: "2026-11-20T10:00:05.000-03:00" };

describe("cobrança do cartão", () => {
  it("entra com o pagamento aprovado, o valor em centavos e a data da aprovação", () => {
    expect(chargeFrom(item, detail)).toEqual({
      authorizedId: "6114264375",
      paymentId: "1234567890",
      amountCents: 12000,
      paidAt: "2026-11-20T10:00:05.000-03:00",
    });
  });

  it("fica de fora enquanto a cobrança não aprovou (agendada, em nova tentativa ou recusada)", () => {
    expect(chargeFrom({ ...item, status: "scheduled", payment: null }, null)).toBeNull();
    expect(chargeFrom({ ...item, status: "recycling", payment: { id: "1", status: "rejected" } }, { ...detail, status: "rejected" })).toBeNull();
    expect(chargeFrom(item, { ...detail, status: "in_process" })).toBeNull();
  });

  it("recusa outra moeda e valor ausente", () => {
    expect(chargeFrom(item, { ...detail, currency_id: "USD" })).toBeNull();
    expect(chargeFrom({ ...item, transaction_amount: null }, { ...detail, transaction_amount: null })).toBeNull();
  });

  it("sem data de aprovação, usa a data do débito", () => {
    expect(chargeFrom(item, { ...detail, date_approved: null })?.paidAt).toBe("2026-11-20T10:00:00.000-03:00");
  });
});
