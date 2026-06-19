"use client";

// TeamColumn — coluna de time da sala (ref: lobby criado.png).
// 5 slots densos: ocupado = avatar QUADRADO + nome + medalha HONOR + MMR gold;
// vazio = botão [ENTRAR] (se pode trocar pra esse time) ou "VAZIO" esmaecido.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { Tooltip } from "@/components/ui/tooltip";
import { joinTeam } from "./actions";
import {
  SLOT_ROLE_LABELS,
  SLOT_ROLE_TOOLTIPS,
  type PlayerSlot,
} from "./lobby-types";
import type { SlotMove } from "./lobby-room";

// Acentos por time via tokens semânticos (zero hex/palette ad-hoc):
// Iluminados = verde (success/play), Temidos = vermelho de erro (NÃO o brand —
// o vermelho brand é reservado pro CTA Iniciar Partida).
const TEAM_ACCENTS = {
  radiant: {
    border: "border-success/40",
    text: "text-success",
    bg: "bg-success/[0.04]",
    headerBg: "bg-success/10",
    rowHover: "hover:bg-success/10",
  },
  dire: {
    border: "border-error/40",
    text: "text-error",
    bg: "bg-error/[0.04]",
    headerBg: "bg-error/10",
    rowHover: "hover:bg-error/10",
  },
} as const;

interface TeamColumnProps {
  label: string;
  team: "radiant" | "dire";
  players: PlayerSlot[];
  size: number;
  lobbyId: string;
  currentUserId: string;
  leaderId: string;
  currentTeam: string | null;
  disabled: boolean;
  onMutate?: () => void | Promise<void>;
  /** Aplica o movimento na UI ANTES do servidor confirmar (useOptimistic do pai). */
  applyMove?: (move: SlotMove) => void;
}

export function TeamColumn({
  label,
  team,
  players,
  size,
  lobbyId,
  currentUserId,
  leaderId,
  currentTeam,
  disabled,
  onMutate,
  applyMove,
}: TeamColumnProps) {
  const a = TEAM_ACCENTS[team];
  // Slots FIXOS por posição (Pedro 2026-06-11): cada índice é uma POS do Dota —
  // o jogador renderiza NO slot que escolheu, não preenchendo de cima pra baixo.
  const slots = Array.from(
    { length: size },
    (_, i) => players.find((p) => p.slot === i) ?? null
  );

  return (
    <section className={`flex flex-col ${a.bg}`}>
      <header
        className={`flex items-center justify-between border-b ${a.border} ${a.headerBg} px-3 py-1.5`}
      >
        <h2
          className={`font-display-condensed text-lg uppercase tracking-wide ${a.text}`}
        >
          {label}
        </h2>
        <span className="font-display text-sm font-semibold uppercase tracking-wide tabular-nums text-text-faded">
          {players.length}/{size}
        </span>
      </header>
      <ol>
        {slots.map((slot, i) => (
          <PlayerSlotRow
            key={i}
            slot={slot}
            slotIndex={i}
            team={team}
            lobbyId={lobbyId}
            currentUserId={currentUserId}
            leaderId={leaderId}
            currentTeam={currentTeam}
            disabled={disabled}
            onMutate={onMutate}
            applyMove={applyMove}
          />
        ))}
      </ol>
    </section>
  );
}

function PlayerSlotRow({
  slot,
  slotIndex,
  team,
  lobbyId,
  currentUserId,
  leaderId,
  currentTeam: _currentTeam,
  disabled,
  onMutate,
  applyMove,
}: {
  slot: PlayerSlot | null;
  /** Posição fixa desta linha (0-based) — define a POS e o destino do ENTRAR. */
  slotIndex: number;
  team: "radiant" | "dire";
  lobbyId: string;
  currentUserId: string;
  leaderId: string;
  currentTeam: string | null;
  disabled: boolean;
  onMutate?: () => void | Promise<void>;
  applyMove?: (move: SlotMove) => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const a = TEAM_ACCENTS[team];
  const roleLabel = SLOT_ROLE_LABELS[slotIndex] ?? `POS ${slotIndex + 1}`;
  // Hover educacional — papel da POS na metodologia (fonte: lobby-types.ts).
  const roleTip = SLOT_ROLE_TOOLTIPS[slotIndex] ?? null;

  const mutate = (target: "radiant" | "dire" | "spectator", targetSlot?: number) => {
    startTransition(async () => {
      // 1) UI move NA HORA (0ms percebido). Se o servidor rejeitar, o
      //    useOptimistic do pai reverte sozinho quando a transition termina.
      applyMove?.({ userId: currentUserId, team: target, slot: targetSlot ?? null });
      const result = await joinTeam({ lobbyId, team: target, slot: targetSlot });
      if (!result.success) {
        toast({ type: "error", title: result.error });
        return;
      }
      // 2) Aguarda o refetch DENTRO da transition: o estado novo chega antes
      //    do optimistic soltar — reconciliação sem flicker.
      await onMutate?.();
      router.refresh();
    });
  };

  // Slot vazio — clicável pra entrar NESTA posição específica (pode ser do
  // próprio time: trocar de POS sem trocar de time).
  if (!slot) {
    const isMySlot = false;
    const showJoin = !disabled && !isMySlot;
    if (!showJoin) {
      return (
        <li className="flex h-10 items-center border-b border-border-subtle/60 px-3">
          <Tooltip content={roleTip} side="top" align="start">
            <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-faded/60">
              {roleLabel}
            </span>
          </Tooltip>
        </li>
      );
    }
    return (
      <li className="border-b border-border-subtle/60">
        {/* Tooltip envolve o botão inteiro — hover/focus em qualquer ponto da
            linha ensina o papel da POS antes do clique em ENTRAR. */}
        <Tooltip
          content={roleTip}
          side="top"
          align="start"
          focusable={false}
          className="w-full"
        >
          <button
            type="button"
            disabled={isPending}
            onClick={() => mutate(team, slotIndex)}
            className={`group flex h-10 w-full items-center justify-between px-3 text-left transition-colors ${a.rowHover} disabled:opacity-50`}
          >
            <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded/60">
              {roleLabel}
            </span>
            <span
              className={`font-display text-sm font-bold uppercase tracking-[0.2em] ${a.text} opacity-60 group-hover:opacity-100 transition-opacity`}
            >
              {isPending ? "..." : "Entrar"}
            </span>
          </button>
        </Tooltip>
      </li>
    );
  }

  const slotIsLeader = slot.userId === leaderId;
  const isCurrent = slot.userId === currentUserId;

  return (
    <li
      className={`flex h-10 items-center gap-2 border-b border-border-subtle/60 px-3 ${
        isCurrent ? "bg-bg-elevated/50" : ""
      }`}
    >
      {/* Número da POS — identifica a posição fixa do slot ocupado.
          Hover educacional: papel da POS na metodologia. */}
      <Tooltip content={roleTip} side="top" align="start" className="shrink-0">
        <span
          className={`w-4 text-center font-display-condensed text-sm 2xl:text-base ${a.text} opacity-70`}
          aria-label={roleLabel}
        >
          {slotIndex + 1}
        </span>
      </Tooltip>
      {/* Avatar SEMPRE quadrado (rounded-sm) — padrão Steam/Dota */}
      {slot.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.avatarUrl}
          alt=""
          className="size-7 shrink-0 rounded-sm border border-border-strong"
        />
      ) : (
        <div className="size-7 shrink-0 rounded-sm border border-border-strong bg-bg-elevated" />
      )}
      <p className="flex min-w-0 flex-1 items-center gap-1 font-body text-sm 2xl:text-base text-text-body">
        <span className="truncate">{slot.username}</span>
        {slotIsLeader && (
          <Crown size={11} className="shrink-0 text-gold" aria-label="Líder" />
        )}
      </p>
      <HonorRankMedal rank={slot.honorRank} size="sm" className="shrink-0" />
      <span
        className="w-10 shrink-0 text-right font-display text-sm 2xl:text-base font-semibold tabular-nums text-gold"
        title="MMR"
      >
        {slot.mmr ?? "—"}
      </span>
      {isCurrent && !disabled && (
        <button
          type="button"
          onClick={() => mutate("spectator")}
          disabled={isPending}
          aria-label="Sair do slot"
          title="Sair do slot (vira espectador)"
          className="shrink-0 text-text-faded hover:text-text-body transition-colors disabled:opacity-30"
        >
          {isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <X size={13} />
          )}
        </button>
      )}
    </li>
  );
}
