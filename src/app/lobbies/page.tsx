// Página /lobbies — lista lobbies abertos pra entrar.
// Phase 5 — Server Component dark fantasy.

import type { Metadata } from "next";
import Link from "next/link";
import { Users, Clock, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Lobbies — FORMULADOTA",
  description: "Lobbies in-house abertos. Entre em uma partida com a comunidade alinhada.",
};

interface LobbyRow {
  id: string;
  name: string;
  game_mode: string;
  status: string;
  max_players: number;
  created_at: string;
  player_count: number;
}

const GAME_MODE_LABELS: Record<string, string> = {
  all_pick: "All Pick",
  captains_mode: "Captains",
  random_draft: "Random Draft",
  single_draft: "Single Draft",
};

export default async function LobbiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Lista lobbies open + in_progress (ignora pending/completed/cancelled)
  const { data: lobbies } = await supabase
    .from("lobbies")
    .select("id, name, game_mode, status, max_players, created_at")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(50);

  const lobbyList: LobbyRow[] = (lobbies ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    game_mode: l.game_mode,
    status: l.status,
    max_players: l.max_players,
    created_at: l.created_at,
    player_count: 0, // TODO Phase 6 — JOIN count(lobby_players)
  }));

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-end justify-between">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
              Lobbies
            </p>
            <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-[var(--color-foreground)] md:text-5xl">
              Partidas abertas
            </h1>
            <div className="mt-6 brand-divider" />
          </div>
          <Link
            href="/criar-lobby"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-brand-red)]"
          >
            Criar lobby
          </Link>
        </header>

        {lobbyList.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4">
            {lobbyList.map((lobby) => (
              <LobbyRowCard key={lobby.id} lobby={lobby} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function LobbyRowCard({ lobby }: { lobby: LobbyRow }) {
  const isInProgress = lobby.status === "in_progress";
  return (
    <article className="flex items-center justify-between gap-6 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6 transition-colors hover:border-[var(--color-brand-red)]/60">
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-xl uppercase tracking-wide text-[var(--color-foreground)] truncate">
          {lobby.name}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
          <span className="inline-flex items-center gap-1">
            <Users size={12} aria-hidden="true" />
            {lobby.player_count}/{lobby.max_players}
          </span>
          <span>{GAME_MODE_LABELS[lobby.game_mode] ?? lobby.game_mode}</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {new Date(lobby.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isInProgress && (
            <span className="font-sans font-semibold text-[var(--color-warning)] uppercase">
              Em andamento
            </span>
          )}
        </div>
      </div>
      <Link
        href={`/lobbies/${lobby.id}`}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] hover:border-[var(--color-brand-red)] transition-colors whitespace-nowrap"
      >
        <Lock size={14} aria-hidden="true" />
        Entrar
      </Link>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center space-y-4">
      <h2 className="font-display text-2xl uppercase tracking-wide text-[var(--color-foreground)]">
        Nenhum lobby aberto
      </h2>
      <p className="font-sans text-[var(--color-muted-foreground)]">
        Que tal abrir o primeiro? Bot Steam cria em segundos.
      </p>
    </div>
  );
}
