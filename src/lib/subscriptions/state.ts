// Estado derivado da assinatura — lib PURA (usada por /planos e componentes).
// Extraído de src/app/assinatura/page.tsx quando /assinatura foi fundida em
// /planos (2026-07-04, rota canônica = /planos dentro do ClientShell).

export interface SubscriptionRow {
  id: string;
  status: string;
  started_at: string | null;
  next_payment_date: string | null;
  cancelled_at: string | null;
  tier: string | null;
  provider?: string | null;
}

export type SubscriptionState =
  | "none" // Nunca assinou
  | "pending" // Preapproval criado, aguardando autorização MP
  | "authorized" // Ativa
  | "cancelled_active" // Cancelada mas next_payment_date no futuro
  | "expired"; // Cancelada/paused e expirada, ou null

export function resolveSubscriptionState(
  subscription: SubscriptionRow | null
): SubscriptionState {
  if (!subscription) return "none";

  if (subscription.status === "authorized") return "authorized";
  if (subscription.status === "pending") return "pending";

  if (
    (subscription.status === "cancelled" || subscription.status === "paused") &&
    subscription.next_payment_date &&
    new Date(subscription.next_payment_date) > new Date()
  ) {
    return "cancelled_active";
  }

  return "expired";
}
