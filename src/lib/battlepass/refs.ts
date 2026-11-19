// Referência externa dos pagamentos do Battlepass no Mercado Pago: o webhook e a conferência sabem
// de quem é cada pagamento sem perguntar ao banco. A loja usa "loja-<uuid>", e nada se cruza.

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PIX = new RegExp(`^battlepass-pix-(${UUID})$`, "i");
const SUBSCRIPTION = new RegExp(`^battlepass-(${UUID})$`, "i");

export type BattlepassRef = { kind: "pix"; paymentId: string } | { kind: "assinatura"; subscriptionId: string };

/** Pix de 30 dias: aponta para a linha de subscription_payments. */
export const pixReference = (paymentId: string): string => `battlepass-pix-${paymentId}`;

/** Assinatura no cartão: aponta para a linha de subscriptions (as cobranças mensais herdam). */
export const subscriptionReference = (subscriptionId: string): string => `battlepass-${subscriptionId}`;

export function parseBattlepassReference(ref: string | null | undefined): BattlepassRef | null {
  if (!ref) return null;
  const pix = PIX.exec(ref.trim());
  if (pix?.[1]) return { kind: "pix", paymentId: pix[1].toLowerCase() };
  const sub = SUBSCRIPTION.exec(ref.trim());
  if (sub?.[1]) return { kind: "assinatura", subscriptionId: sub[1].toLowerCase() };
  return null;
}
