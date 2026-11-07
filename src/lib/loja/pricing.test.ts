import { describe, it, expect } from "vitest";
import { boostQuote, parseMmrTiers, priceOrder, quantityLabel, type MmrTier } from "./pricing";

// As faixas da versão B: R$ 99 a cada 100 MMR até 5 mil, R$ 149 de 5 mil a 6,5 mil.
const TIERS: MmrTier[] = [
  { upTo: 5000, centsPer100: 9900 },
  { upTo: 6500, centsPer100: 14900 },
];

describe("boostQuote", () => {
  it("cobra R$ 99 a cada 100 MMR abaixo de 5 mil", () => {
    const quote = boostQuote(3000, 3500, TIERS);
    expect(quote.ok && quote.cents).toBe(49500);
  });

  it("cobra R$ 149 a cada 100 MMR entre 5 mil e 6,5 mil", () => {
    const quote = boostQuote(5000, 5300, TIERS);
    expect(quote.ok && quote.cents).toBe(44700);
  });

  it("divide o pedido que cruza os 5 mil entre as duas faixas", () => {
    const quote = boostQuote(4800, 5200, TIERS);
    expect(quote).toEqual({
      ok: true,
      cents: 19800 + 29800,
      mmr: 400,
      parts: [
        { from: 4800, to: 5000, cents: 19800 },
        { from: 5000, to: 5200, cents: 29800 },
      ],
    });
  });

  it("cobra o trecho quebrado proporcional, sem arredondar para a centena", () => {
    const quote = boostQuote(4437, 5000, TIERS);
    expect(quote.ok && quote.cents).toBe(55737);
  });

  it("recusa alvo menor ou igual ao atual", () => {
    expect(boostQuote(4000, 4000, TIERS)).toEqual({ ok: false, reason: "ordem" });
    expect(boostQuote(4000, 3900, TIERS)).toEqual({ ok: false, reason: "ordem" });
  });

  it("recusa menos de 100 MMR", () => {
    expect(boostQuote(4000, 4099, TIERS)).toEqual({ ok: false, reason: "minimo" });
  });

  it("recusa alvo acima de 6.500", () => {
    expect(boostQuote(6000, 6501, TIERS)).toEqual({ ok: false, reason: "teto" });
    expect(boostQuote(6400, 6500, TIERS).ok).toBe(true);
  });
});

describe("parseMmrTiers", () => {
  it("lê o formato gravado no banco", () => {
    expect(parseMmrTiers([{ up_to: 5000, cents_per_100: 9900 }, { up_to: 6500, cents_per_100: 14900 }])).toEqual(TIERS);
  });

  it("recusa faixa fora de ordem, preço zerado ou formato estranho", () => {
    expect(parseMmrTiers([{ up_to: 6500, cents_per_100: 14900 }, { up_to: 5000, cents_per_100: 9900 }])).toBeNull();
    expect(parseMmrTiers([{ up_to: 5000, cents_per_100: 0 }])).toBeNull();
    expect(parseMmrTiers([{ up_to: "5000", cents_per_100: 9900 }])).toBeNull();
    expect(parseMmrTiers([])).toBeNull();
    expect(parseMmrTiers(null)).toBeNull();
  });
});

describe("quantityLabel", () => {
  it("usa o substantivo da unidade no singular e no plural", () => {
    expect(quantityLabel(1, "por partida", "Por partida")).toBe("1 partida");
    expect(quantityLabel(3, "por partida", "Por partida")).toBe("3 partidas");
  });

  it("sem unidade, repete o rótulo da opção", () => {
    expect(quantityLabel(1, "", "90 minutos")).toBe("90 minutos");
    expect(quantityLabel(2, "", "90 minutos")).toBe("2 × 90 minutos");
  });
});

describe("priceOrder", () => {
  const perMatch = { maxQuantity: 5, priceUnit: "por partida", mmrTiers: null };
  const variant = { label: "Por partida", priceCents: 2500 };

  it("multiplica o preço pela quantidade", () => {
    expect(priceOrder(perMatch, variant, { quantity: 3 })).toEqual({ ok: true, amountCents: 7500, quantity: 3, label: "3 partidas" });
  });

  it("sem quantidade informada, cobra uma unidade", () => {
    expect(priceOrder(perMatch, variant, {})).toEqual({ ok: true, amountCents: 2500, quantity: 1, label: "1 partida" });
  });

  it("recusa quantidade acima do limite do produto", () => {
    expect(priceOrder(perMatch, variant, { quantity: 6 })).toMatchObject({ ok: false, field: "quantity" });
    expect(priceOrder({ ...perMatch, maxQuantity: 1 }, variant, { quantity: 2 })).toMatchObject({ ok: false, field: "quantity" });
  });

  it("no boost, o preço sai das faixas e ignora o preço da opção", () => {
    const boost = { maxQuantity: 1, priceUnit: "a cada 100 MMR", mmrTiers: TIERS };
    expect(priceOrder(boost, { label: "A cada 100 MMR", priceCents: 9900 }, { mmr_atual: 4800, mmr_alvo: 5200 })).toEqual({
      ok: true,
      amountCents: 49600,
      quantity: 1,
      label: "4.800 → 5.200 MMR",
    });
  });

  it("no boost, alvo acima do teto vira erro no campo do alvo", () => {
    const boost = { maxQuantity: 1, priceUnit: "a cada 100 MMR", mmrTiers: TIERS };
    expect(priceOrder(boost, { label: "A cada 100 MMR", priceCents: 9900 }, { mmr_atual: 6000, mmr_alvo: 7000 })).toEqual({
      ok: false,
      field: "mmr_alvo",
      message: "O boost vai até 6.500 de MMR.",
    });
  });
});
