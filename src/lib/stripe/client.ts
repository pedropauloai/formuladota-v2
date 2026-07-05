// Stripe — server-only (FASE 4, 2026-07-04).
//
// Cobre as assinaturas de LATAM (USD) e EU (EUR); o BR segue 100% no Mercado
// Pago (Pix Automático). Preços/produtos são criados uma única vez por
// scripts/stripe-setup.ts e referenciados aqui via env (STRIPE_PRICE_*).

import Stripe from "stripe";
import { requireServerEnv } from "@/lib/env";
import type { GameRegion } from "@/lib/regions";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

let singleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!singleton) {
    singleton = new Stripe(requireServerEnv("STRIPE_SECRET_KEY"));
  }
  return singleton;
}

// Price ID (env) da dupla região × tier. EU=EUR; LATAM=USD; BR=BRL (usado só quando
// PAYMENTS_MP_ENABLED=false roteia o BR pro Stripe — senão o BR fica no Mercado Pago).
export function stripePriceIdFor(region: GameRegion, tier: SubscriptionTier): string {
  if (region === "EU") {
    return requireServerEnv(
      tier === "premium" ? "STRIPE_PRICE_PREMIUM_EUR" : "STRIPE_PRICE_PLUS_EUR"
    );
  }
  if (region === "BR") {
    return requireServerEnv(
      tier === "premium" ? "STRIPE_PRICE_PREMIUM_BRL" : "STRIPE_PRICE_PLUS_BRL"
    );
  }
  return requireServerEnv(
    tier === "premium" ? "STRIPE_PRICE_PREMIUM_USD" : "STRIPE_PRICE_PLUS_USD"
  );
}

// Reverso: price ID → tier (webhook customer.subscription.updated pode trazer
// upgrade/downgrade feito no Customer Portal). null = price desconhecido.
export function tierFromStripePriceId(priceId: string): SubscriptionTier | null {
  const candidates: Array<[string, SubscriptionTier]> = [
    ["STRIPE_PRICE_PLUS_USD", "plus"],
    ["STRIPE_PRICE_PLUS_EUR", "plus"],
    ["STRIPE_PRICE_PLUS_BRL", "plus"],
    ["STRIPE_PRICE_PREMIUM_USD", "premium"],
    ["STRIPE_PRICE_PREMIUM_EUR", "premium"],
    ["STRIPE_PRICE_PREMIUM_BRL", "premium"],
  ];
  for (const [envKey, tier] of candidates) {
    if (process.env[envKey] === priceId) return tier;
  }
  return null;
}

// Fim do período atual da subscription (API Basil: mora no subscription item;
// fallback pro campo legado e, em último caso, +30d).
export function stripePeriodEndIso(sub: Stripe.Subscription): string {
  const itemEnd = sub.items?.data?.[0]?.current_period_end;
  const legacyEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
  const ts = itemEnd ?? legacyEnd;
  return ts
    ? new Date(ts * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}
