// Preço do pedido da loja: unidade vezes quantidade, ou o trecho de MMR no boost. Regra pura,
// sem dependência de servidor: o formulário mostra a mesma conta que o servidor cobra.

export const MMR_STEP = 100;

/** Faixa do boost: até `upTo` de MMR, cada 100 pontos custam `centsPer100`. */
export interface MmrTier {
  upTo: number;
  centsPer100: number;
}

/** Lê store_products.mmr_tiers; null quando o formato não serve (faixas fora de ordem, valor zerado). */
export function parseMmrTiers(value: unknown): MmrTier[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const tiers: MmrTier[] = [];
  let previous = 0;
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const { up_to: upTo, cents_per_100: centsPer100 } = raw as Record<string, unknown>;
    if (typeof upTo !== "number" || typeof centsPer100 !== "number") return null;
    if (!Number.isInteger(upTo) || !Number.isInteger(centsPer100)) return null;
    if (upTo <= previous || centsPer100 <= 0) return null;
    tiers.push({ upTo, centsPer100 });
    previous = upTo;
  }
  return tiers;
}

export function mmrCeiling(tiers: readonly MmrTier[]): number {
  return tiers[tiers.length - 1]?.upTo ?? 0;
}

export type BoostQuote =
  | { ok: true; cents: number; mmr: number; parts: Array<{ from: number; to: number; cents: number }> }
  | { ok: false; reason: "ordem" | "minimo" | "teto" };

/** Valor do boost de `from` até `to`: cada faixa cobra, ponto a ponto, o trecho que cai nela. */
export function boostQuote(from: number, to: number, tiers: readonly MmrTier[]): BoostQuote {
  if (to <= from) return { ok: false, reason: "ordem" };
  if (to - from < MMR_STEP) return { ok: false, reason: "minimo" };
  if (to > mmrCeiling(tiers)) return { ok: false, reason: "teto" };
  const parts: Array<{ from: number; to: number; cents: number }> = [];
  let floor = 0;
  for (const tier of tiers) {
    const start = Math.max(from, floor);
    const end = Math.min(to, tier.upTo);
    if (end > start) parts.push({ from: start, to: end, cents: Math.round(((end - start) * tier.centsPer100) / MMR_STEP) });
    floor = tier.upTo;
  }
  return { ok: true, cents: parts.reduce((sum, p) => sum + p.cents, 0), mmr: to - from, parts };
}

const MMR_FORMAT = new Intl.NumberFormat("pt-BR");

export function formatMmr(value: number): string {
  return MMR_FORMAT.format(value);
}

/** "1 partida", "3 partidas" quando a unidade é "por partida"; senão "3 × Rótulo". */
export function quantityLabel(quantity: number, priceUnit: string, fallback: string): string {
  const noun = priceUnit.startsWith("por ") ? priceUnit.slice(4).trim() : "";
  if (!noun) return quantity === 1 ? fallback : `${quantity} × ${fallback}`;
  return `${quantity} ${quantity === 1 ? noun : `${noun}s`}`;
}

export interface PriceableProduct {
  maxQuantity: number;
  priceUnit: string;
  mmrTiers: MmrTier[] | null;
}

export interface PriceableInput {
  quantity?: number;
  mmr_atual?: number;
  mmr_alvo?: number;
}

export type OrderPrice =
  | { ok: true; amountCents: number; quantity: number; label: string }
  | { ok: false; field: "quantity" | "mmr_alvo"; message: string };

const BOOST_MESSAGES: Record<"ordem" | "minimo" | "teto", (ceiling: number) => string> = {
  ordem: () => "O MMR alvo precisa ser maior que o atual.",
  minimo: () => `O boost começa em ${MMR_STEP} MMR.`,
  teto: (ceiling) => `O boost vai até ${formatMmr(ceiling)} de MMR.`,
};

/** Quanto o pedido custa e como ele aparece no pedido e no aviso de venda. */
export function priceOrder(product: PriceableProduct, variant: { label: string; priceCents: number }, input: PriceableInput): OrderPrice {
  if (product.mmrTiers) {
    const from = input.mmr_atual ?? 0;
    const to = input.mmr_alvo ?? 0;
    const quote = boostQuote(from, to, product.mmrTiers);
    if (!quote.ok) return { ok: false, field: "mmr_alvo", message: BOOST_MESSAGES[quote.reason](mmrCeiling(product.mmrTiers)) };
    return { ok: true, amountCents: quote.cents, quantity: 1, label: `${formatMmr(from)} → ${formatMmr(to)} MMR` };
  }
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.maxQuantity) {
    return { ok: false, field: "quantity", message: `Escolha de 1 a ${product.maxQuantity}.` };
  }
  return {
    ok: true,
    amountCents: variant.priceCents * quantity,
    quantity,
    label: quantityLabel(quantity, product.priceUnit, variant.label),
  };
}
