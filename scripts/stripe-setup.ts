// One-off: cria os produtos e prices do Stripe (FASE 4, 2026-07-04).
//
// Uso (com a chave de TESTE primeiro; repetir com a live quando validado):
//   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
//
// Idempotente: prices têm lookup_key fixo — se já existirem, só imprime os IDs.
// Saída: as 4 linhas STRIPE_PRICE_* pra colar na Vercel/.env.local.
//
// Preços (decisão Pedro — mudança exige aprovação dele):
//   Plus:    R$ 27,90 (BR) · US$ 4,99 (LATAM) · € 6,99 (EU)
//   Premium: R$ 97,90 (BR) · US$ 17,99 (LATAM) · € 19,99 (EU)
// O BR só cobra via Stripe quando PAYMENTS_MP_ENABLED=false; senão fica no MP (Pix).

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Defina STRIPE_SECRET_KEY (sk_test_... primeiro; sk_live_... depois).");
  process.exit(1);
}
const stripe = new Stripe(key);

const PRODUCTS = [
  { name: "FORMULADOTA Plus", tier: "plus" },
  { name: "FORMULADOTA Premium", tier: "premium" },
] as const;

// unit_amount em CENTAVOS (Stripe), diferente do MP (reais float).
const PRICES = [
  { tier: "plus", currency: "brl", unitAmount: 2790, envKey: "STRIPE_PRICE_PLUS_BRL" },
  { tier: "premium", currency: "brl", unitAmount: 9790, envKey: "STRIPE_PRICE_PREMIUM_BRL" },
  { tier: "plus", currency: "usd", unitAmount: 499, envKey: "STRIPE_PRICE_PLUS_USD" },
  { tier: "premium", currency: "usd", unitAmount: 1799, envKey: "STRIPE_PRICE_PREMIUM_USD" },
  { tier: "plus", currency: "eur", unitAmount: 699, envKey: "STRIPE_PRICE_PLUS_EUR" },
  { tier: "premium", currency: "eur", unitAmount: 1999, envKey: "STRIPE_PRICE_PREMIUM_EUR" },
] as const;

async function main() {
  const mode = key!.startsWith("sk_test") ? "TESTE" : "LIVE";
  console.log(`Stripe em modo ${mode}\n`);

  // Produtos: reusa por nome se já existirem (busca ativa).
  const productIds: Record<string, string> = {};
  const existingProducts = await stripe.products.list({ active: true, limit: 100 });
  for (const p of PRODUCTS) {
    const found = existingProducts.data.find((e) => e.name === p.name);
    if (found) {
      productIds[p.tier] = found.id;
      console.log(`produto já existe: ${p.name} → ${found.id}`);
    } else {
      const created = await stripe.products.create({
        name: p.name,
        metadata: { tier: p.tier },
      });
      productIds[p.tier] = created.id;
      console.log(`produto criado: ${p.name} → ${created.id}`);
    }
  }

  // Prices recorrentes mensais, idempotentes por lookup_key.
  const envLines: string[] = [];
  for (const price of PRICES) {
    const lookupKey = `formuladota_${price.tier}_${price.currency}`;
    const existing = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    let priceId: string;
    if (existing.data.length > 0 && existing.data[0]) {
      priceId = existing.data[0].id;
      console.log(`price já existe: ${lookupKey} → ${priceId}`);
    } else {
      const created = await stripe.prices.create({
        product: productIds[price.tier]!,
        currency: price.currency,
        unit_amount: price.unitAmount,
        recurring: { interval: "month" },
        lookup_key: lookupKey,
        metadata: { tier: price.tier },
      });
      priceId = created.id;
      console.log(
        `price criado: ${lookupKey} (${price.currency.toUpperCase()} ${(price.unitAmount / 100).toFixed(2)}/mês) → ${priceId}`
      );
    }
    envLines.push(`${price.envKey}=${priceId}`);
  }

  console.log("\n=== Cole estas envs na Vercel (e .env.local) ===\n");
  for (const line of envLines) console.log(line);
}

main().catch((err) => {
  console.error("stripe-setup falhou:", err);
  process.exit(1);
});
