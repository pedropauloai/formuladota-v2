// /criar-lobby — Configurações da Sala (estilo Dota 2, ref: configuração lobby.png).
// Pedro 2026-06-03: removido o gate de MENSALIDADE — criar sala livre é gateado por
// PERMISSÃO (5 acertos), aplicada na RLS dentro da action createLobby. Sempre mostra o form.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CriarLobbyForm } from "./criar-lobby-form";
import { ClientShell } from "@/components/client-shell/shell";

export const metadata: Metadata = {
  title: "Criar Sala — FORMULADOTA",
  description:
    "Monte uma sala personalizada FORMULADOTA. Quando o bot Steam estiver no ar, ele cria a sala no Dota 2 e convida os jogadores.",
};

export default async function CriarLobbyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <ClientShell currentRoute="/criar-lobby">
      <div className="mx-auto max-w-4xl px-6 py-8 xl:py-10 space-y-6">
        <header>
          <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            FORMULADOTA · Salas Personalizadas
          </p>
          <h1 className="mt-2 font-display text-3xl xl:text-4xl uppercase tracking-tight text-text-display">
            Configurações da sala
          </h1>
          <div className="mt-4 brand-divider" />
        </header>

        <CriarLobbyForm />
      </div>
    </ClientShell>
  );
}
