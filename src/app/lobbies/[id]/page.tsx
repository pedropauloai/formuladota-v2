// /lobbies/[id] — A sala personalizada (estilo Dota 2, ref: lobby criado.png):
// Os Iluminados × Os Temidos, slots, jogadores de fora, configurações, Iniciar Partida.
// Antes redirecionava pra um "PlayPanel" que nunca foi implementado (LobbyRoom ficava
// órfão); agora renderiza o LobbyRoom de verdade no centro do shell.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClientShell } from "@/components/client-shell/shell";
import { LobbyRoom } from "./lobby-room";
import { fetchLobbyRoom } from "../fetch-actions";

export const metadata: Metadata = { title: "Sala — FORMULADOTA" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LobbyDetailPage(props: PageProps) {
  const { id } = await props.params;
  const data = await fetchLobbyRoom(id);
  // null = não logado (middleware já barra antes) ou sala inexistente.
  if (!data) redirect("/lobbies");

  return (
    <ClientShell currentRoute="/lobbies">
      <div className="mx-auto max-w-2xl px-4 py-6 xl:py-8">
        <div className="overflow-hidden rounded-md border border-brand-primary/30 bg-bg-deep/80 shadow-2xl shadow-black/60">
          <LobbyRoom
            lobby={data.lobby}
            players={data.players}
            currentUserId={data.currentUserId}
            isLeader={data.isLeader}
            leaderUsername={data.leaderUsername}
          />
        </div>
      </div>
    </ClientShell>
  );
}
