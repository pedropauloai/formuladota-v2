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

import { useOptimistic } from "react";
import { useTranslations } from "next-intl";
import { RoomHeader } from "./room-header";
import { TeamColumn } from "./team-column";
import { SpectatorRow } from "./spectator-row";
import { SettingsPanel } from "./settings-panel";
import { RoomActions } from "./room-actions";
import { useLobbyRealtime } from "./use-lobby-realtime";
import type { SignatureHero } from "@/components/dota/hero-video-backdrop";
import type { LobbyData, PlayerSlot } from "./lobby-types";

/** Movimento otimista de slot — aplicado na UI ANTES do servidor confirmar. */
export interface SlotMove {
  userId: string;
  team: "radiant" | "dire" | "spectator";
  slot: number | null;
}

interface Props {
  lobby: LobbyData;
  players: PlayerSlot[];
  currentUserId: string;
  isLeader: boolean;
  leaderUsername: string;
  /** Herói de assinatura do líder — backdrop vivo do room-header (opcional). */
  leaderHero?: SignatureHero | null;
  /** Quando providenciado, mostra botão voltar no header (uso embedded no PlayPanel). */
  onBack?: () => void;
  /**
   * Callback após cada Server Action sucesso (join/leave/start). Usado quando
   * o LobbyRoom é embedded em PlayPanel (Client) — re-fetcha via fetch action
   * pq router.refresh sozinho não re-roda useEffect+SA. Pode retornar Promise:
   * os filhos AGUARDAM dentro da transition pra reconciliar sem flicker.
   */
  onMutate?: () => void | Promise<void>;
  /** Abre o popup de Configurações da Sala (editar). Só faz sentido pro líder. */
  onEdit?: () => void;
}

export function LobbyRoom({
  lobby,
  players,
  currentUserId,
  isLeader,
  leaderUsername,
  leaderHero = null,
  onBack,
  onMutate,
  onEdit,
}: Props) {
  const t = useTranslations("lobbies");
  // OPTIMISTIC (Pedro 2026-06-11): a UI move o jogador NA HORA do clique; o
  // servidor confirma em paralelo. Se rejeitar (ex: slot tomado na corrida),
  // o useOptimistic reverte sozinho ao fim da transition — banco segue juiz.
  // Primeira entrada no lobby fica fora do optimistic (não temos o perfil do
  // viewer aqui); só MOVIMENTOS de quem já está na sala são antecipados.
  const [optimisticPlayers, applyMove] = useOptimistic(
    players,
    (state: PlayerSlot[], move: SlotMove) => {
      if (!state.some((p) => p.userId === move.userId)) return state;
      return state.map((p) =>
        p.userId === move.userId ? { ...p, team: move.team, slot: move.slot } : p
      );
    }
  );

  // REALTIME: push do banco quando QUALQUER jogador entra/troca/sai ou a sala
  // muda — todos na sala veem em ~100-300ms, sem polling.
  useLobbyRealtime(lobby.id, () => void onMutate?.());

  const teamSize = Math.floor(lobby.maxPlayers / 2);
  const team1 = optimisticPlayers.filter((p) => p.team === "radiant");
  const team2 = optimisticPlayers.filter((p) => p.team === "dire");
  const spectators = optimisticPlayers.filter((p) => p.team === "spectator");
  const inLobby = optimisticPlayers.some((p) => p.userId === currentUserId);
  const myTeam =
    optimisticPlayers.find((p) => p.userId === currentUserId)?.team ?? null;
  const canEdit = lobby.status === "open" || lobby.status === "pending";

  return (
    <div className="flex h-full flex-col">
      <RoomHeader
        lobby={lobby}
        leaderUsername={leaderUsername}
        leaderHero={leaderHero}
        onBack={onBack}
      />

      {/* Times — 2 colunas lado a lado, 5 slots cada */}
      <section className="grid grid-cols-2 divide-x divide-border-subtle border-b border-border-subtle">
        <TeamColumn
          label={t("teamRadiant")}
          team="radiant"
          players={team1}
          size={teamSize}
          lobbyId={lobby.id}
          currentUserId={currentUserId}
          leaderId={lobby.createdBy}
          currentTeam={myTeam}
          disabled={!canEdit}
          onMutate={onMutate}
          applyMove={applyMove}
        />
        <TeamColumn
          label={t("teamDire")}
          team="dire"
          players={team2}
          size={teamSize}
          lobbyId={lobby.id}
          currentUserId={currentUserId}
          leaderId={lobby.createdBy}
          currentTeam={myTeam}
          disabled={!canEdit}
          onMutate={onMutate}
          applyMove={applyMove}
        />
      </section>

      <SpectatorRow
        spectators={spectators}
        lobbyId={lobby.id}
        currentUserId={currentUserId}
        currentTeam={myTeam}
        disabled={!canEdit}
        onMutate={onMutate}
        applyMove={applyMove}
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
