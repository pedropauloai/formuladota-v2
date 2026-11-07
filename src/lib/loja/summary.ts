// Visitas, pedidos e receita por origem: o número do checkpoint de 27/11/2026. Regra pura.

import { sourceLabel } from "./attribution";

export interface VisitRow {
  utm_source: string | null;
  referrer_host: string | null;
}

export interface OrderRow {
  utm_source: string | null;
  referrer_host: string | null;
  status: string;
  amount_cents: number;
  is_test: boolean;
}

export interface OriginSummary {
  source: string;
  visits: number;
  orders: number;
  paidOrders: number;
  revenueCents: number;
  /** Pedidos pagos por visita; null sem visita (o pedido veio de uma sessão sem beacon). */
  conversion: number | null;
}

const PAID = new Set(["pago"]);

function bucket(map: Map<string, OriginSummary>, source: string): OriginSummary {
  let row = map.get(source);
  if (!row) {
    row = { source, visits: 0, orders: 0, paidOrders: 0, revenueCents: 0, conversion: null };
    map.set(source, row);
  }
  return row;
}

export function summarizeByOrigin(visits: VisitRow[], orders: OrderRow[]): OriginSummary[] {
  const map = new Map<string, OriginSummary>();
  for (const visit of visits) bucket(map, sourceLabel(visit)).visits += 1;
  for (const order of orders) {
    if (order.is_test) continue;
    const row = bucket(map, sourceLabel(order));
    row.orders += 1;
    if (PAID.has(order.status)) {
      row.paidOrders += 1;
      row.revenueCents += order.amount_cents;
    }
  }
  const rows = [...map.values()].map((row) => ({
    ...row,
    conversion: row.visits > 0 ? row.paidOrders / row.visits : null,
  }));
  return rows.sort((a, b) => b.revenueCents - a.revenueCents || b.visits - a.visits || a.source.localeCompare(b.source));
}

export function totals(rows: OriginSummary[]): Omit<OriginSummary, "source"> {
  const sum = rows.reduce(
    (acc, row) => ({
      visits: acc.visits + row.visits,
      orders: acc.orders + row.orders,
      paidOrders: acc.paidOrders + row.paidOrders,
      revenueCents: acc.revenueCents + row.revenueCents,
    }),
    { visits: 0, orders: 0, paidOrders: 0, revenueCents: 0 }
  );
  return { ...sum, conversion: sum.visits > 0 ? sum.paidOrders / sum.visits : null };
}
