// Battlepass FORMULADOTA: a mensalidade do site (spec: docs/battlepass/spec.md).
// Preço e prazos decididos pelo Pedro em 19/11/2026; mudança de preço é decisão dele.

export const BATTLEPASS = {
  name: "Battlepass FORMULADOTA",
  priceCents: 12000,
  /** Cada Pix libera 30 dias; o cartão renova todo mês. */
  periodDays: 30,
  /** Garantia: desistiu em até 7 dias do primeiro pagamento, o dinheiro volta. */
  guaranteeDays: 7,
  /** Folga do cartão autorizado: o Mercado Pago tenta de novo a cobrança recusada antes de pausar. */
  cardGraceDays: 3,
  /** O Pix vence em 24 h, como o da loja; a página confere sozinha enquanto está aberta. */
  pixMinutes: 24 * 60,
  /** Primeiro dia à venda em produção: o teste de 30 dias conta daqui (spec, "Teste de 30 dias"). */
  onSaleSince: "2026-11-19T03:00:00Z",
} as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** "R$ 120,00": o preço como aparece na página e no aviso de venda. */
export function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
