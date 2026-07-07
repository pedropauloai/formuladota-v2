"use client";

// MatchRoomStatus — faixa de status da sala ENQUANTO o bot Steam ainda não criou o
// lobby no Dota (status='open', sem dota_match_id). Duas situações:
//   - aguardando: spinner + auto-refresh (poll do dota_match_id → navega pra URL
//     canônica assim que a sala fica pronta). Resolve o "fiquei sem saber se travou".
//   - erro do bot (lobbies.bot_error): mostra o erro e orienta o suporte.
// Pareado com o overlay de aceite (fix do "travou por completo" 2026-07-04).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, AlertTriangle } from "lucide-react";
import { getMatchRouteId } from "@/app/queue/ready-check-actions";

export function MatchRoomStatus({
  lobbyId,
  botError,
}: {
  lobbyId: string;
  botError: string | null;
}) {
  const t = useTranslations("scoreboard");
  const router = useRouter();

  // Poll resiliente do dota_match_id — quando o bot grava, navega pra URL canônica.
  // Erro transitório NUNCA para o loop (mesmo princípio do overlay).
  useEffect(() => {
    if (botError) return; // erro terminal — não fica repolling
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const { routeId } = await getMatchRouteId(lobbyId);
        if (!alive) return;
        if (routeId) {
          router.push(`/partida/${routeId}`);
          return;
        }
      } catch {
        // transitório — segue tentando
      }
      if (!alive) return;
      timer = setTimeout(poll, 4000);
    };
    timer = setTimeout(poll, 4000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [lobbyId, botError, router]);

  if (botError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-error/50 bg-error/10 px-4 py-3"
      >
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-error" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-error">
            {t("roomStatusError")}
          </p>
          <p className="mt-0.5 break-words font-body text-sm text-text-muted">{botError}</p>
          <p className="mt-1 font-body text-xs text-text-faded">
            {t("roomStatusErrorHelp")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-gold/40 bg-gold/[0.06] px-4 py-3">
      <Loader2 size={18} className="shrink-0 animate-spin text-gold" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-gold">
          {t("roomStatusWaiting")}
        </p>
        <p className="mt-0.5 font-body text-xs text-text-faded">
          {t("roomStatusWaitingBody")}
        </p>
      </div>
    </div>
  );
}
