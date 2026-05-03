// Página /criar-lobby — Server Component cyberpunk dark fantasy FORMULADOTA.
// Phase 5 H3.3 — usuário com subscription ativa cria lobby in-house.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CriarLobbyForm } from "./criar-lobby-form";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";

export const metadata: Metadata = {
  title: "Criar Lobby — FORMULADOTA",
  description: "Crie um lobby Dota 2 in-house FORMULADOTA. Senha gerada automaticamente, bot cria no Steam, players entram e competem.",
};

export default async function CriarLobbyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verifica subscription ativa (helper SQL Phase 4)
  const { data: hasSub } = await supabase.rpc("has_active_subscription");
  const subscriptionActive = hasSub === true;

  return (
    <main className="relative min-h-screen px-6 py-16">
      <DotaBackdrop />
      <div className="relative z-10 mx-auto max-w-2xl">
        <header className="mb-12 text-center">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            Criar Lobby
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-[var(--color-foreground)] md:text-5xl">
            Lobby in-house
          </h1>
          <div className="mx-auto mt-6 brand-divider" />
          <p className="mx-auto mt-6 max-w-xl font-serif text-[var(--color-muted-foreground)]">
            Bot Steam cria o lobby no Dota 2. Senha auto-gerada, válida por 30min. Compartilhe com 9 jogadores e jogue.
          </p>
        </header>

        {!subscriptionActive ? (
          <SubscriptionRequiredState />
        ) : (
          <CriarLobbyForm />
        )}
      </div>
    </main>
  );
}

function SubscriptionRequiredState() {
  return (
    <div className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-card)] p-8 text-center space-y-4">
      <h2 className="font-display text-2xl uppercase tracking-wide text-[var(--color-foreground)]">
        Mensalidade necessária
      </h2>
      <p className="font-sans text-[var(--color-muted-foreground)]">
        Pra criar lobbies in-house você precisa ter mensalidade FORMULADOTA ativa.
      </p>
      <a
        href="/assinatura"
        className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-brand-red)]"
      >
        Iniciar mensalidade R$ 47
      </a>
    </div>
  );
}
