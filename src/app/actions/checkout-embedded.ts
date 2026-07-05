"use server";

// Checkout EMBUTIDO (Stripe Embedded Checkout, ui_mode: "embedded") — Pedro 2026-07-05.
//
// Renderiza o pagamento DENTRO do FORMULADOTA (sem redirect externo). Dois métodos:
//   - card: assinatura RECORRENTE (mode: subscription, Stripe Billing). Todas as regiões.
//   - pix:  pagamento AVULSO que concede 30 dias (mode: payment). BR apenas. O Pix da
//           Stripe é invite-only p/ conta BR — se não estiver ativo, a Stripe rejeita a
//           sessão e devolvemos "pix_unavailable" (o código NÃO quebra).
//
// Só Stripe. Quando a região é MP (BR + PAYMENTS_MP_ENABLED), a UI usa o fluxo MP
// (createSubscription, redirect) — este action nem é chamado.

import { createClient } from "@/lib/supabase/server";
import { getStripe, stripePriceIdFor } from "@/lib/stripe/client";
import { isGameRegion, type GameRegion } from "@/lib/regions";
import {
  TIER_PRICES,
  isSubscriptionTier,
  type SubscriptionTier,
} from "@/lib/subscriptions/tiers";

export type CheckoutMethod = "card" | "pix";
export type EmbeddedCheckoutResult =
  | { clientSecret: string }
  | { error: string };

export async function createEmbeddedCheckout(
  tierInput: string,
  method: CheckoutMethod
): Promise<EmbeddedCheckoutResult> {
  const tier: SubscriptionTier = isSubscriptionTier(tierInput) ? tierInput : "plus";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: prof } = await supabase
    .from("profiles")
    .select("region")
    .eq("id", user.id)
    .maybeSingle();
  const region: GameRegion = isGameRegion(prof?.region) ? prof.region : "BR";

  // Já tem assinatura ativa? bloqueia (não duplicar).
  const { data: active } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "authorized")
    .maybeSingle();
  if (active) return { error: "already_active" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://formuladota.com";
  const returnUrl = `${siteUrl}/planos?checkout=return&session_id={CHECKOUT_SESSION_ID}`;
  const stripe = getStripe();

  try {
    if (method === "pix") {
      if (region !== "BR") return { error: "pix_br_only" };
      const price = TIER_PRICES.BR[tier]; // BRL
      const session = await stripe.checkout.sessions.create({
        ui_mode: "embedded_page",
        mode: "payment",
        payment_method_types: ["pix"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: Math.round(price.amount * 100),
              product_data: {
                name:
                  tier === "premium"
                    ? "FORMULADOTA Premium — 30 dias (Pix)"
                    : "FORMULADOTA Plus — 30 dias (Pix)",
              },
            },
          },
        ],
        // Pix = avulso: o webhook concede 30 dias (kind pix_30d).
        metadata: { user_id: user.id, tier, kind: "pix_30d" },
        customer_email: user.email ?? undefined,
        return_url: returnUrl,
      });
      return session.client_secret
        ? { clientSecret: session.client_secret }
        : { error: "no_client_secret" };
    }

    // card → assinatura recorrente (Stripe Billing).
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceIdFor(region, tier), quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id, tier } },
      metadata: { user_id: user.id, tier },
      return_url: returnUrl,
    });
    return session.client_secret
      ? { clientSecret: session.client_secret }
      : { error: "no_client_secret" };
  } catch (err) {
    console.error("[checkout-embedded] falhou:", err);
    // Pix não habilitado na conta (invite-only) → Stripe rejeita 'pix' aqui.
    return { error: method === "pix" ? "pix_unavailable" : "payment_failed" };
  }
}
