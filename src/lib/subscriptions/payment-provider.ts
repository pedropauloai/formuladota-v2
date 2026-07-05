// Resolvedor de provedor de pagamento — SERVER-ONLY (lê env). Pedro 2026-07-05.
//
// Decisão de negócio: Stripe é o gateway primário das 3 regiões; o Mercado Pago
// fica vivo no BR (Pix) atrás da flag PAYMENTS_MP_ENABLED como rede de segurança.
//
// `providerForRegion` (tiers.ts) é PURO (BR=mp, resto=stripe) e pode rodar no client.
// `resolvePaymentProvider` é a decisão EFETIVA: delega a base pro providerForRegion e
// aplica a flag — MP só quando region=BR E a flag ligada; senão Stripe. Como lê env,
// os call sites de checkout/assinatura (server) devem usar ESTE, não o puro.
//
// IMPORTANTE: isto NÃO gateia os webhooks. /api/webhooks/mercadopago e /stripe
// processam SEMPRE, independente da flag — pra não perder pagamento em andamento.

import { serverEnv } from "@/lib/env";
import type { GameRegion } from "@/lib/regions";
import { providerForRegion } from "@/lib/subscriptions/tiers";

export type PaymentProvider = "mp" | "stripe";

// --- Helpers PUROS (testáveis sem env) ------------------------------------

/** Interpreta o valor cru da flag: ligado por padrão; só "false" desliga. */
export function mpEnabledFromRaw(raw: string | undefined): boolean {
  return raw !== "false";
}

/** Decisão pura: MP só quando a base é 'mp' (BR) E a flag está ligada; senão Stripe. */
export function resolveProviderFromFlag(
  region: GameRegion,
  mpEnabled: boolean
): PaymentProvider {
  if (providerForRegion(region) === "mp" && mpEnabled) return "mp";
  return "stripe";
}

// --- Wrappers que leem o env (server-only) --------------------------------

/** MP ligado no BR? Default = ligado; só desliga com PAYMENTS_MP_ENABLED="false". */
export function isMpEnabled(): boolean {
  return mpEnabledFromRaw(serverEnv.PAYMENTS_MP_ENABLED);
}

/** Provedor efetivo da região, já com a flag aplicada. */
export function resolvePaymentProvider(region: GameRegion): PaymentProvider {
  return resolveProviderFromFlag(region, isMpEnabled());
}
