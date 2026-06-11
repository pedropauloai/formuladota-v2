"use client";

// TeamColumn — coluna de time da sala (ref: lobby criado.png).
// 5 slots densos: ocupado = avatar QUADRADO + nome + medalha HONOR + MMR gold;
// vazio = botão [ENTRAR] (se pode trocar pra esse time) ou "VAZIO" esmaecido.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { joinTeam } from "./actions";
import type { PlayerSlot } from "./lobby-types";

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
  onMutate?: () => void;
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
}: TeamColumnProps) {
  const a = TEAM_ACCENTS[team];
  const slots = Array.from({ length: size }, (_, i) => players[i] ?? null);

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
            team={team}
            lobbyId={lobbyId}
            currentUserId={currentUserId}
            leaderId={leaderId}
            currentTeam={currentTeam}
            disabled={disabled}
            onMutate={onMutate}
          />
        ))}
      </ol>
    </section>
  );
}

function PlayerSlotRow({
  slot,
  team,
  lobbyId,
  currentUserId,
  leaderId,
  currentTeam,
  disabled,
  onMutate,
}: {
  slot: PlayerSlot | null;
  team: "radiant" | "dire";
  lobbyId: string;
  currentUserId: string;
  leaderId: string;
  currentTeam: string | null;
  disabled: boolean;
  onMutate?: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const a = TEAM_ACCENTS[team];

  const mutate = (target: "radiant" | "dire" | "spectator") => {
    startTransition(async () => {
      const result = await joinTeam({ lobbyId, team: target });
      if (!result.success) {
        toast({ type: "error", title: result.error });
        return;
      }
      router.refresh();
      onMutate?.();
    });
  };

  // Slot vazio — [ENTRAR] se pode trocar pra esse time, senão "VAZIO" esmaecido.
  if (!slot) {
    const showJoin = !disabled && currentTeam !== team;
    if (!showJoin) {
      return (
        <li className="flex h-10 items-center border-b border-border-subtle/60 px-3">
          <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-faded/60">
            Vazio
          </span>
        </li>
      );
    }
    return (
      <li className="border-b border-border-subtle/60">
        <button
          type="button"
          disabled={isPending}
          onClick={() => mutate(team)}
          className={`group flex h-10 w-full items-center justify-between px-3 text-left transition-colors ${a.rowHover} disabled:opacity-50`}
        >
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded/60">
            Vazio
          </span>
          <span
            className={`font-display text-sm font-bold uppercase tracking-[0.2em] ${a.text} opacity-60 group-hover:opacity-100 transition-opacity`}
          >
            {isPending ? "..." : "Entrar"}
          </span>
        </button>
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
      <p className="flex min-w-0 flex-1 items-center gap-1 font-body text-sm text-text-body">
        <span className="truncate">{slot.username}</span>
        {slotIsLeader && (
          <Crown size={11} className="shrink-0 text-gold" aria-label="Líder" />
        )}
      </p>
      <HonorRankMedal rank={slot.honorRank} size="sm" className="shrink-0" />
      <span
        className="w-10 shrink-0 text-right font-display text-sm font-semibold tabular-nums text-gold"
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
