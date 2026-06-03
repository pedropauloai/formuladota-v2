// /lobbies — Navegar pelas Salas Personalizadas abertas (estilo "Salas de Dota" do
// cliente, ref: lobbys criados.png). Liberado pro usuário (Pedro 2026-06-03).
// Criar/entrar exige permissão (gate na RLS + pop-up); navegar é livre pra logado.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { fetchOpenLobbies } from "./fetch-actions";
import { LobbyBrowser } from "./lobby-browser";

export const metadata: Metadata = { title: "Salas — FORMULADOTA" };

export default async function LobbiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const lobbies = await fetchOpenLobbies();

  return (
    <ClientShell currentRoute="/lobbies">
      <div className="mx-auto max-w-5xl px-6 py-8 xl:py-10 space-y-6">
        <header>
          <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            FORMULADOTA · Salas Personalizadas
          </p>
          <h1 className="mt-2 font-display text-3xl xl:text-4xl uppercase tracking-tight text-text-display">
            Salas abertas
          </h1>
          <div className="mt-4 brand-divider" />
        </header>

        <LobbyBrowser lobbies={lobbies} />
      </div>
    </ClientShell>
  );
}
