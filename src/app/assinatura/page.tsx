// /assinatura — Status e gerenciamento da mensalidade HUB.
// Server Component: lê estado atual da subscription do DB.
// Client Component (assinatura-client.tsx): botões com Server Actions.
//
// 4 estados visuais:
//   A) Sem assinatura — CTA "Assinar HUB"
//   B) Authorized — mensalidade ativa, próxima cobrança
//   C) Cancelled + within period — cancelada mas ainda com acesso
//   D) Cancelled+expirado / Paused / sem subscription — "Sem acesso HUB" + CTA reativar

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssinaturaClient } from "./assinatura-client";

export const metadata: Metadata = {
  title: "Mensalidade — FORMULADOTA HUB",
  description: "Gerencie sua mensalidade de acesso ao HUB FORMULADOTA.",
};

// Tipo mínimo da subscription para evitar over-fetch
interface SubscriptionRow {
  id: string;
  status: string;
  started_at: string | null;
  next_payment_date: string | null;
  cancelled_at: string | null;
}

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string; error?: string; info?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;

  // Busca assinatura mais recente do user (pode ser null se nunca assinou)
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("id, status, started_at, next_payment_date, cancelled_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[/assinatura] erro ao buscar subscription:", error.message);
  }

  // Determina estado visual
  const state = resolveSubscriptionState(subscription ?? null);

  return (
    <AssinaturaClient
      state={state}
      subscription={subscription as SubscriptionRow | null}
      queryParams={{
        success: params.success === "1",
        cancelled: params.cancelled === "1",
        error: params.error,
        info: params.info,
      }}
    />
  );
}

// Estado derivado para o Client Component — evita lógica de datas no client
export type SubscriptionState =
  | "none"            // Nunca assinou
  | "pending"         // Preapproval criado, aguardando autorização MP
  | "authorized"      // Ativa
  | "cancelled_active" // Cancelada mas next_payment_date no futuro
  | "expired";        // Cancelada/paused e expirada, ou null

function resolveSubscriptionState(
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
