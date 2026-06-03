// /lobbies — Navegar pelas salas personalizadas abertas (estilo "Salas Personalizadas"
// do Dota 2). Liberado pro usuário (Pedro 2026-06-03). Criar/entrar exige permissão
// (gate na RLS + pop-up de perguntas); navegar é livre pra quem está logado.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { fetchOpenLobbies } from "./fetch-actions";

export const metadata: Metadata = { title: "Salas — FORMULADOTA" };

const GAME_MODE_LABELS: Record<string, string> = {
  all_pick: "Escolha livre",
  captains_mode: "Modo Capitães",
  random_draft: "Seleção aleatória",
  single_draft: "Escolha única",
};

export default async function LobbiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const lobbies = await fetchOpenLobbies();

  return (
    <ClientShell currentRoute="/lobbies">
      <div className="px-6 py-8 xl:px-12 xl:py-10 space-y-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              FORMULADOTA · Salas Personalizadas
            </p>
            <h1 className="mt-2 font-display text-3xl xl:text-4xl uppercase tracking-tight text-text-display">
              Salas abertas
            </h1>
          </div>
          <Link
            href="/criar-lobby"
            className="inline-flex items-center gap-2 rounded-md border-2 border-brand-primary/60 bg-brand-primary/15 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-brand-primary hover:bg-brand-primary/25 transition-colors"
          >
            <Plus size={16} aria-hidden="true" />
            Criar sala
          </Link>
        </header>
        <div className="brand-divider" />

        {lobbies.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-black/30 p-12 text-center">
            <Compass size={32} className="mx-auto mb-3 text-text-faded" aria-hidden="true" />
            <p className="font-display text-base uppercase tracking-wide text-text-muted">
              Nenhuma sala aberta agora
            </p>
            <p className="mt-2 font-body text-sm text-text-faded">
              Seja o primeiro — crie uma sala e o bot convida a galera.
            </p>
            <Link
              href="/criar-lobby"
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-brand-primary/60 bg-brand-primary/10 px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-brand-primary hover:bg-brand-primary/20 transition-colors"
            >
              <Plus size={14} aria-hidden="true" />
              Criar a primeira sala
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lobbies.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/lobbies/${l.id}`}
                  className="flex flex-col gap-3 rounded-md border border-border-subtle bg-bg-elevated/60 p-4 transition-colors hover:border-brand-primary/50 hover:bg-bg-elevated"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-text-display leading-tight truncate">
                      {l.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-sm px-2 py-0.5 font-display text-sm font-bold uppercase tracking-wide ${
                        l.status === "open"
                          ? "bg-play-primary/15 text-play-primary"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {l.status === "open" ? "Aberta" : "Em jogo"}
                    </span>
                  </div>
                  <p className="font-body text-sm text-text-muted">
                    {GAME_MODE_LABELS[l.game_mode] ?? l.game_mode}
                  </p>
                  <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-text-faded">
                    <Users size={14} aria-hidden="true" />
                    Até {l.max_players} jogadores
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ClientShell>
  );
}
