import { describe, it, expect } from "vitest";
import { summarizeByOrigin, totals } from "./summary";

describe("summarizeByOrigin", () => {
  const visits = [
    { utm_source: "instagram", referrer_host: null },
    { utm_source: "instagram", referrer_host: null },
    { utm_source: null, referrer_host: "youtube.com" },
    { utm_source: null, referrer_host: null },
  ];
  const orders = [
    { utm_source: "instagram", referrer_host: null, status: "pago", amount_cents: 14990, is_test: false },
    { utm_source: "instagram", referrer_host: null, status: "pendente", amount_cents: 14990, is_test: false },
    { utm_source: null, referrer_host: "youtube.com", status: "pago", amount_cents: 4990, is_test: false },
    { utm_source: "instagram", referrer_host: null, status: "pago", amount_cents: 99999, is_test: true },
  ];

  it("soma visita, pedido e receita por canal, sem os pedidos de teste", () => {
    const rows = summarizeByOrigin(visits, orders);
    expect(rows.map((r) => r.source)).toEqual(["instagram", "youtube", "direto"]);
    expect(rows[0]).toMatchObject({ visits: 2, orders: 2, paidOrders: 1, revenueCents: 14990, conversion: 0.5 });
    expect(rows[1]).toMatchObject({ visits: 1, orders: 1, paidOrders: 1, revenueCents: 4990, conversion: 1 });
    expect(rows[2]).toMatchObject({ visits: 1, orders: 0, revenueCents: 0, conversion: 0 });
  });

  it("pedido sem visita registrada não divide por zero", () => {
    const rows = summarizeByOrigin([], [{ utm_source: "tiktok", referrer_host: null, status: "pago", amount_cents: 100, is_test: false }]);
    expect(rows[0]).toMatchObject({ source: "tiktok", visits: 0, conversion: null });
  });

  it("totais fecham com a soma das linhas", () => {
    const total = totals(summarizeByOrigin(visits, orders));
    expect(total).toMatchObject({ visits: 4, orders: 3, paidOrders: 2, revenueCents: 19980, conversion: 0.5 });
  });
});
