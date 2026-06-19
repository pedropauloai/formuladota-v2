"use client";

// SpectatorRow — "JOGADORES DE FORA" (ref: lobby criado.png): linha compacta de
// chips com quem está no lobby sem time. X no próprio chip = sair do lobby.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { joinTeam, leaveLobby } from "./actions";
import type { PlayerSlot } from "./lobby-types";
import type { SlotMove } from "./lobby-room";

interface SpectatorRowProps {
  spectators: PlayerSlot[];
  lobbyId: string;
  currentUserId: string;
  currentTeam: string | null;
  disabled: boolean;
  onMutate?: () => void | Promise<void>;
  /** Aplica o movimento na UI antes do servidor confirmar (useOptimistic do pai). */
  applyMove?: (move: SlotMove) => void;
}

export function SpectatorRow({
  spectators,
  lobbyId,
  currentUserId,
  currentTeam,
  disabled,
  onMutate,
  applyMove,
}: SpectatorRowProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSpectate = () => {
    startTransition(async () => {
      // Optimistic: vira espectador na hora; reverte sozinho se o servidor negar.
      applyMove?.({ userId: currentUserId, team: "spectator", slot: null });
      const r = await joinTeam({ lobbyId, team: "spectator" });
      if (!r.success) {
        toast({ type: "error", title: r.error });
        return;
      }
      await onMutate?.();
      router.refresh();
    });
  };

  const handleLeaveLobby = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("lobbyId", lobbyId);
      await leaveLobby(fd);
      await onMutate?.();
      router.refresh();
    });
  };

  const iAmSpectator = currentTeam === "spectator";

  return (
    <section className="border-b border-border-subtle bg-bg-base/60">
      <header className="flex items-center justify-between border-b border-border-subtle/60 px-3 py-1.5">
        <h3 className="font-display-condensed text-lg uppercase tracking-wide text-text-muted">
          Jogadores de fora
        </h3>
        {!disabled && !iAmSpectator && currentTeam !== null && (
          <button
            type="button"
            onClick={handleSpectate}
            disabled={isPending}
            className="font-display text-sm font-semibold uppercase tracking-widest text-text-faded hover:text-text-body transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Assistir"}
          </button>
        )}
      </header>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 px-3 py-1.5">
        {spectators.length === 0 ? (
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded/60">
            Nenhum
          </span>
        ) : (
          spectators.map((s) => {
            const isCurrent = s.userId === currentUserId;
            return (
              <span
                key={s.userId}
                className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 ${
                  isCurrent
                    ? "border-gold/50 bg-bg-elevated"
                    : "border-border-subtle bg-bg-deep"
                }`}
              >
                {s.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatarUrl} alt="" className="size-3.5 rounded-sm" />
                ) : null}
                <span className="font-body text-sm 2xl:text-base text-text-body">
                  {s.username}
                </span>
                {isCurrent && !disabled && (
                  <button
                    type="button"
                    onClick={handleLeaveLobby}
                    disabled={isPending}
                    aria-label="Sair do lobby"
                    title="Sair do lobby"
                    className="ml-0.5 text-text-faded hover:text-text-body transition-colors disabled:opacity-30"
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            );
          })
        )}
      </div>
    </section>
  );
}
