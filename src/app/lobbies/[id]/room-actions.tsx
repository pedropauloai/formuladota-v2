"use client";

// RoomActions — rodapé de CTAs da sala (ref: lobby criado.png):
// [SAIR DA SALA] ghost + [INICIAR PARTIDA] em VERMELHO brand.
//
// ATENÇÃO (decisão deliberada): INICIAR PARTIDA é o ÚNICO CTA vermelho do
// sistema — no client do Dota o iniciar do lobby é vermelho (estado
// comprometido), diferente do verde "buscar partida". Todos veem o botão;
// só o líder vê habilitado.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Play } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { leaveLobby, startMatch, cancelLobby } from "./actions";
import { Button } from "@/components/ui/button";

interface RoomActionsProps {
  lobbyId: string;
  inLobby: boolean;
  isLeader: boolean;
  status: string;
}

export function RoomActions({ lobbyId, inLobby, isLeader, status }: RoomActionsProps) {
  const t = useTranslations("lobbies");
  return (
    <div className="mt-auto border-t border-border-subtle bg-bg-base p-3">
      {!inLobby && (
        <p className="pb-2 text-center font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
          {t("notInLobby")}
        </p>
      )}

      {isLeader && (
        <div className="pb-2 text-right">
          <EndLobbyLink lobbyId={lobbyId} />
        </div>
      )}

      <div className="flex items-center gap-2">
        {inLobby && <LeaveLobbyButton lobbyId={lobbyId} isLeader={isLeader} />}
        <StartMatchButton
          lobbyId={lobbyId}
          isLeader={isLeader}
          disabled={!isLeader || status !== "open"}
        />
      </div>
    </div>
  );
}

function LeaveLobbyButton({
  lobbyId,
  isLeader,
}: {
  lobbyId: string;
  isLeader: boolean;
}) {
  const t = useTranslations("lobbies");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (isLeader && !confirm(t("confirmLeaveLeader"))) {
      e.preventDefault();
    }
  };

  return (
    <form action={leaveLobby} onSubmit={handleSubmit} className="flex-1">
      <input type="hidden" name="lobbyId" value={lobbyId} />
      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center rounded-sm font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-muted hover:bg-bg-elevated hover:text-text-body transition-colors"
      >
        {t("leaveLobbyAction")}
      </button>
    </form>
  );
}

// Encerrar = ação destrutiva secundária do líder — link discreto, não compete
// com o CTA vermelho de Iniciar Partida.
function EndLobbyLink({ lobbyId }: { lobbyId: string }) {
  const t = useTranslations("lobbies");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(t("confirmEndLobby"))) {
      e.preventDefault();
    }
  };

  return (
    <form action={cancelLobby} onSubmit={handleSubmit} className="inline">
      <input type="hidden" name="lobbyId" value={lobbyId} />
      <button
        type="submit"
        className="font-display text-sm font-semibold uppercase tracking-widest text-text-faded underline-offset-2 hover:text-error hover:underline transition-colors"
      >
        {t("endLobby")}
      </button>
    </form>
  );
}

function StartMatchButton({
  lobbyId,
  isLeader,
  disabled,
}: {
  lobbyId: string;
  isLeader: boolean;
  disabled: boolean;
}) {
  const { toast } = useToast();
  const t = useTranslations("lobbies");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleStart = () => {
    startTransition(async () => {
      const r = await startMatch({ lobbyId });
      if (!r.success) {
        toast({ type: "error", title: r.error });
        return;
      }
      toast({ type: "success", title: t("matchStarted") });
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="primary"
      size="md"
      onClick={handleStart}
      disabled={disabled || isPending}
      title={isLeader ? undefined : t("onlyLeaderStarts")}
      className="flex-1 tracking-[0.25em]"
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <Play size={14} fill="currentColor" aria-hidden="true" />
      )}
      <span>{isPending ? t("startingMatch") : t("startMatch")}</span>
    </Button>
  );
}
