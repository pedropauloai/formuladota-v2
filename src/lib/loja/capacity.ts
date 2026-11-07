// Vagas do mês (mentoria 8, acompanhamento 3): o tempo do Pedro fora da live é contado.
// O mês é o de São Paulo. Pedido pago ou em conferência ocupa a vaga; pendente segura a vaga só
// enquanto a pessoa paga (30 minutos), para um Pix abandonado não travar o mês inteiro.

export const HOLD_PENDING_MS = 30 * 60 * 1000;
// Brasília não tem horário de verão desde 2019: UTC-3 o ano todo.
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Ano e mês (0 a 11) no relógio de São Paulo. */
export function saoPauloMonth(now: Date): { year: number; month: number } {
  const local = new Date(now.getTime() - SAO_PAULO_OFFSET_MS);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() };
}

/** Meia-noite do dia 1º do mês de São Paulo, em UTC. */
export function monthStartUtc(now: Date): Date {
  const { year, month } = saoPauloMonth(now);
  return new Date(Date.UTC(year, month, 1) + SAO_PAULO_OFFSET_MS);
}

/** Meia-noite do dia 1º do mês seguinte, quando as vagas abrem de novo. */
export function nextMonthStartUtc(now: Date): Date {
  const { year, month } = saoPauloMonth(now);
  return new Date(Date.UTC(year, month + 1, 1) + SAO_PAULO_OFFSET_MS);
}

export interface SlotOrder {
  status: string;
  quantity: number;
  createdAt: string;
}

const HOLDING = new Set(["pago", "em_revisao"]);

/** Vagas ocupadas no mês de `now` pelos pedidos dados. */
export function slotsTaken(orders: readonly SlotOrder[], now: Date): number {
  const start = monthStartUtc(now).getTime();
  let taken = 0;
  for (const order of orders) {
    const created = new Date(order.createdAt).getTime();
    if (created < start) continue;
    const holds = HOLDING.has(order.status) || (order.status === "pendente" && now.getTime() - created < HOLD_PENDING_MS);
    if (holds) taken += order.quantity;
  }
  return taken;
}

export function slotsLeft(capacity: number, orders: readonly SlotOrder[], now: Date): number {
  return Math.max(0, capacity - slotsTaken(orders, now));
}
