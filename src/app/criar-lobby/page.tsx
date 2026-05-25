// Página /criar-lobby — Server Component cyberpunk dark fantasy FORMULADOTA.
// Phase 5 H3.3 — usuário com subscription ativa cria lobby in-house.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CriarLobbyForm } from "./criar-lobby-form";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Criar Lobby — FORMULADOTA",
  description: "Crie um lobby Dota 2 in-house FORMULADOTA. Senha gerada automaticamente, bot cria no Steam, players entram e competem.",
};

export default async function CriarLobbyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Verifica subscription ativa (helper SQL Phase 4)
  const { data: hasSub } = await supabase.rpc("has_active_subscription");
  const subscriptionActive = hasSub === true;

  return (
    <ClientShell currentRoute="/criar-lobby">
      <div className="px-6 py-10 mx-auto max-w-2xl">
        <header className="mb-12 text-center">
          <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            Criar Lobby
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-text-display md:text-5xl">
            Lobby in-house
          </h1>
          <div className="mx-auto mt-6 brand-divider" />
          <p className="mx-auto mt-6 max-w-xl font-serif text-text-muted">
            Bot Steam cria o lobby no Dota 2. Senha auto-gerada, válida por 30min. Compartilhe com 9 jogadores e jogue.
          </p>
        </header>

        {!subscriptionActive ? (
          <SubscriptionRequiredState />
        ) : (
          <CriarLobbyForm />
        )}
      </div>
    </ClientShell>
  );
}

function SubscriptionRequiredState() {
  return (
    <Card variant="elevated" className="text-center">
      <CardContent className="space-y-4">
        <h2 className="font-display text-2xl uppercase tracking-wide text-text-display">
          Mensalidade necessária
        </h2>
        <p className="font-sans text-text-muted">
          Pra criar lobbies in-house você precisa ter mensalidade FORMULADOTA ativa.
        </p>
        <Link href="/assinatura" className="inline-block">
          <Button type="button" variant="primary" size="md">
            Iniciar mensalidade R$ 47
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
