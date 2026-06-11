"use client";

// LobbyRoom — sala ativa no estilo do cliente Dota 2 (ref: lobby criado.png):
// header (nome Teko + líder + badge do modo) → 2 colunas de times → JOGADORES
// DE FORA → CONFIGURAÇÕES DA SALA → rodapé [SAIR] ghost + [INICIAR] vermelho.
// Renderiza dentro do drawer "Jogar Dota" (PlayMenu) ou painel lateral.
//
// Orquestrador: a UI vive nos subcomponentes (room-header, team-column,
// spectator-row, settings-panel, room-actions). Mantém o export público.
//
// Mecânica: click slot vazio entra/troca; X no seu slot vira espectador; X no
// chip espectador sai do lobby. router.refresh() após cada Server Action
// sucesso pra re-fetch (revalidatePath sozinho não rerender client component).

import { RoomHeader } from "./room-header";
import { TeamColumn } from "./team-column";
import { SpectatorRow } from "./spectator-row";
import { SettingsPanel } from "./settings-panel";
import { RoomActions } from "./room-actions";
import type { LobbyData, PlayerSlot } from "./lobby-types";

interface Props {
  lobby: LobbyData;
  players: PlayerSlot[];
  currentUserId: string;
  isLeader: boolean;
  leaderUsername: string;
  /** Quando providenciado, mostra botão voltar no header (uso embedded no PlayPanel). */
  onBack?: () => void;
  /**
   * Callback após cada Server Action sucesso (join/leave/start). Usado quando
   * o LobbyRoom é embedded em PlayPanel (Client) — re-fetcha via fetch action
   * pq router.refresh sozinho não re-roda useEffect+SA.
   */
  onMutate?: () => void;
  /** Abre o popup de Configurações da Sala (editar). Só faz sentido pro líder. */
  onEdit?: () => void;
}

export function LobbyRoom({
  lobby,
  players,
  currentUserId,
  isLeader,
  leaderUsername,
  onBack,
  onMutate,
  onEdit,
}: Props) {
  const teamSize = Math.floor(lobby.maxPlayers / 2);
  const team1 = players.filter((p) => p.team === "radiant");
  const team2 = players.filter((p) => p.team === "dire");
  const spectators = players.filter((p) => p.team === "spectator");
  const inLobby = players.some((p) => p.userId === currentUserId);
  const myTeam = players.find((p) => p.userId === currentUserId)?.team ?? null;
  const canEdit = lobby.status === "open" || lobby.status === "pending";

  return (
    <div className="flex h-full flex-col">
      <RoomHeader lobby={lobby} leaderUsername={leaderUsername} onBack={onBack} />

      {/* Times — 2 colunas lado a lado, 5 slots cada */}
      <section className="grid grid-cols-2 divide-x divide-border-subtle border-b border-border-subtle">
        <TeamColumn
          label="Os Iluminados"
          team="radiant"
          players={team1}
          size={teamSize}
          lobbyId={lobby.id}
          currentUserId={currentUserId}
          leaderId={lobby.createdBy}
          currentTeam={myTeam}
          disabled={!canEdit}
          onMutate={onMutate}
        />
        <TeamColumn
          label="Os Temidos"
          team="dire"
          players={team2}
          size={teamSize}
          lobbyId={lobby.id}
          currentUserId={currentUserId}
          leaderId={lobby.createdBy}
          currentTeam={myTeam}
          disabled={!canEdit}
          onMutate={onMutate}
        />
      </section>

      <SpectatorRow
        spectators={spectators}
        lobbyId={lobby.id}
        currentUserId={currentUserId}
        currentTeam={myTeam}
        disabled={!canEdit}
        onMutate={onMutate}
      />

      <SettingsPanel lobby={lobby} isLeader={isLeader} onEdit={onEdit} />

      <RoomActions
        lobbyId={lobby.id}
        inLobby={inLobby}
        isLeader={isLeader}
        status={lobby.status}
      />
    </div>
  );
}
