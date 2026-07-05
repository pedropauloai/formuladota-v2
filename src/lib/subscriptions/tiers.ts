// Tiers de assinatura Plus/Premium — Pedro 2026-07-04.
//
// Modelo freemium matchmaking: FREE = jogar (fila, ranking, doutrina).
// Pagos = Plus e Premium. Fichas avulsas NÃO são vendidas (ranked-com-pro é
// feature flag desligada). Preço por REGIÃO de jogo (profiles.region):
// BR paga em BRL via Mercado Pago (Pix Automático); LATAM/EU via Stripe.
//
// Benefícios decididos por Pedro (2026-07-04, AskUserQuestion):
//   Plus:    criar salas · XP boost no passe · cosméticos exclusivos · flair de assinante
//   Premium: tudo do Plus + lobby elite Imortal (mantém gates de skill) ·
//            XP boost maior · cosméticos tier Godlike · prioridade/análise com PRO
//
// REGRA INEGOCIÁVEL: nada aqui compra VANTAGEM competitiva (MMR, fila, medalha,
// permissão de partida). Assinatura compra conveniência, cosmético e acesso —
// nunca resultado. A cultura é o produto.

import type { GameRegion } from "@/lib/regions";

export const SUBSCRIPTION_TIERS = ["plus", "premium"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export type TierCurrency = "BRL" | "USD" | "EUR";

export interface TierPrice {
  amount: number;
  currency: TierCurrency;
}

// Preço por região — VALORES DECIDIDOS POR PEDRO (mudança = aprovação dele).
export const TIER_PRICES: Record<GameRegion, Record<SubscriptionTier, TierPrice>> = {
  BR: {
    plus: { amount: 27.9, currency: "BRL" },
    premium: { amount: 97.9, currency: "BRL" },
  },
  LATAM: {
    plus: { amount: 4.99, currency: "USD" },
    premium: { amount: 17.99, currency: "USD" },
  },
  EU: {
    plus: { amount: 6.99, currency: "EUR" },
    premium: { amount: 19.99, currency: "EUR" },
  },
};

// Provedor de pagamento BASE por região: BR = Mercado Pago (Pix), resto = Stripe.
// PURO (sem env) — pode rodar no client. Para a decisão EFETIVA no server (com a flag
// PAYMENTS_MP_ENABLED que pode rotear o BR pro Stripe), use `resolvePaymentProvider`
// de "@/lib/subscriptions/payment-provider" — ele delega a este e aplica a flag.
export function providerForRegion(region: GameRegion): "mp" | "stripe" {
  return region === "BR" ? "mp" : "stripe";
}

// Chaves i18n dos benefícios (namespace billing.tier*) — a UI resolve o texto.
export const TIER_BENEFIT_KEYS: Record<SubscriptionTier, string[]> = {
  plus: [
    "benefitCreateLobbies",
    "benefitXpBoost",
    "benefitCosmetics",
    "benefitFlair",
  ],
  premium: [
    "benefitAllPlus",
    "benefitEliteLobby",
    "benefitXpBoostMax",
    "benefitCosmeticsGodlike",
    "benefitProAccess",
  ],
};

export function isSubscriptionTier(v: string | null | undefined): v is SubscriptionTier {
  return !!v && (SUBSCRIPTION_TIERS as readonly string[]).includes(v);
}

// Formata o preço na moeda da região, no locale da UI do usuário.
export function formatTierPrice(price: TierPrice, locale: string): string {
  const intlLocale = locale === "pt" ? "pt-BR" : locale === "es" ? "es-419" : "en-US";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: price.currency,
  }).format(price.amount);
}
