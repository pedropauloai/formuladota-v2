// /lobbies — lista de lobbies abertos com filtros + modal "Criar Lobby".
// Layout dentro do ClientShell. Visual inspirado em painéis de salas personalizadas
// de jogos competitivos (tabela com colunas + filtros + CTA criar).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { LobbiesContent } from "./lobbies-content";

export const metadata: Metadata = {
  title: "Salas Personalizadas — FORMULADOTA",
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

export default async function LobbiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lobbies } = await supabase
    .from("lobbies")
    .select("id, name, game_mode, status, max_players, created_at")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(100);

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
    <ClientShell
      currentRoute="/lobbies"
      wideRightSidebar
      centerHero="https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background2.png"
      rightSidebar={<LobbiesContent lobbies={lobbyList} />}
    >
      {null}
    </ClientShell>
  );
}
