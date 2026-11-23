import { beforeEach, describe, expect, it, vi } from "vitest";

// Banco de mentira com as duas tabelas que o cancelamento toca: store_orders e store_bookings.
const h = vi.hoisted(() => {
  type Row = Record<string, unknown> & { id: string };
  const tables: Record<string, Row[]> = { store_orders: [], store_bookings: [] };
  function from(table: string) {
    let values: Record<string, unknown> = {};
    const filters: Array<[string, unknown]> = [];
    const builder = {
      update(v: Record<string, unknown>) {
        values = v;
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return builder;
      },
      async select() {
        const hit = tables[table]!.filter((row) => filters.every(([c, v]) => row[c] === v));
        for (const row of hit) Object.assign(row, values);
        return { data: hit.map((row) => ({ id: row.id })), error: null };
      },
    };
    return builder;
  }
  return { tables, client: { from } };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => h.client }));

import { cancelUnpaidOrder } from "./cancel-order";

const status = (table: string, id: string) => h.tables[table]!.find((row) => row.id === id)?.status;

beforeEach(() => {
  h.tables.store_orders = [
    { id: "pedido-sem-pix", status: "pendente" },
    { id: "pedido-pago", status: "pago" },
  ];
  h.tables.store_bookings = [
    { id: "vaga-segurada", order_id: "pedido-sem-pix", status: "reservado" },
    { id: "vaga-de-outro", order_id: "outro-pedido", status: "reservado" },
    { id: "vaga-paga", order_id: "pedido-pago", status: "confirmado" },
  ];
});

describe("pedido que não abriu pagamento", () => {
  it("o Pix falhou na última vaga: o pedido cancela e a vaga volta na hora", async () => {
    const out = await cancelUnpaidOrder("pedido-sem-pix");
    expect(out).toEqual({ cancelled: true, released: 1 });
    expect(status("store_orders", "pedido-sem-pix")).toBe("cancelado");
    expect(status("store_bookings", "vaga-segurada")).toBe("cancelado");
  });

  it("a vaga segurada por outro pedido continua segurada", async () => {
    await cancelUnpaidOrder("pedido-sem-pix");
    expect(status("store_bookings", "vaga-de-outro")).toBe("reservado");
  });

  it("pedido já pago não é cancelado e a vaga confirmada fica", async () => {
    const out = await cancelUnpaidOrder("pedido-pago");
    expect(out).toEqual({ cancelled: false, released: 0 });
    expect(status("store_orders", "pedido-pago")).toBe("pago");
    expect(status("store_bookings", "vaga-paga")).toBe("confirmado");
  });
});
