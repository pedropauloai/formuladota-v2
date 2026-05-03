// Página /assinatura — gerenciar mensalidade FORMULADOTA via Mercado Pago Pix Automático.
// Server Component. Phase 4 (2026-05-02).
//
// 4 estados visuais (paleta Phase 3.5: preto + vermelho + off-white):
// - Sem subscription: card com CTA "Iniciar mensalidade R$ 47"
// - status='authorized': card verde sutil com next_payment_date + botão Cancelar
// - status='cancelled' AND next_payment_date > now(): "Cancelada — acesso até X" + botão Reativar
// - status='cancelled'+expirado OR 'paused' OR 'pending': estados especiais

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssinaturaCard } from "./assinatura-card";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";

export const metadata: Metadata = {
  title: "Assinatura — FORMULADOTA",
  description: "Gerencie sua mensalidade FORMULADOTA HUB.",
};

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca subscription mais recente do user (não bloqueia se não existir).
  // Sem .maybeSingle() para evitar erro 406 quando filtra in() sem rows.
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "id, status, started_at, next_payment_date, cancelled_at, mp_preapproval_id, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const subscription = subscriptions?.[0] ?? null;

  return (
    <main className="relative min-h-screen px-6 py-16">
      <DotaBackdrop />
      <div className="relative z-10 mx-auto max-w-3xl">
        <header className="mb-12 text-center">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            Assinatura
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-[var(--color-foreground)] md:text-5xl">
            Mensalidade HUB
          </h1>
          <div className="mx-auto mt-6 brand-divider" />
          <p className="mx-auto mt-6 max-w-xl font-serif text-[var(--color-muted-foreground)]">
            Pix Automático recorrente via Mercado Pago. Autorização única, renovação mensal automática. Cancele quando quiser.
          </p>
        </header>

        <AssinaturaCard subscription={subscription} />

        <p className="mt-8 text-center text-xs text-[var(--color-text-faded)]">
          Pagamento processado pelo Mercado Pago. Você autoriza o Pix Automático
          uma vez e o débito mensal é feito direto na sua conta bancária.
        </p>
      </div>
    </main>
  );
}
