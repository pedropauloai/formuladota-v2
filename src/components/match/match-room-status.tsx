"use client";

// MatchRoomStatus — faixa de status da sala ENQUANTO o bot Steam ainda não criou o
// lobby no Dota (status='open', sem dota_match_id). Estados:
//   - erro do bot (lobbies.bot_error): mostra o erro e orienta o suporte.
//   - na FILA do bot (bot ocupado com outra partida): "posição N, criamos em até M:SS"
//     com contador regressivo (só há 1 conta Steam → partidas são serializadas).
//   - criando agora (é a vez do meu lobby): "confira o convite no Dota 2".
//   - aguardando genérico (fallback enquanto a fila ainda não respondeu).
// Em todos, faz poll do dota_match_id e navega pra URL canônica quando a sala fica pronta.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import {
  getMatchRouteId,
  getLobbyQueueStatus,
  type LobbyQueueStatus,
} from "@/app/queue/ready-check-actions";

const POLL_MS = 4000;

function fmtMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function MatchRoomStatus({
  lobbyId,
  botError,
}: {
  lobbyId: string;
  botError: string | null;
}) {
  const t = useTranslations("scoreboard");
  const router = useRouter();
  const [queue, setQueue] = useState<LobbyQueueStatus | null>(null);

  // Poll resiliente: navega pra URL canônica quando o bot grava o dota_match_id; senão
  // atualiza a posição na fila. Erro transitório NUNCA para o loop.
  useEffect(() => {
    if (botError) return; // erro terminal — não fica repolling
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const [{ routeId }, q] = await Promise.all([
          getMatchRouteId(lobbyId),
          getLobbyQueueStatus(lobbyId),
        ]);
        if (!alive) return;
        if (routeId) {
          router.push(`/partida/${routeId}`);
          return;
        }
        setQueue(q);
      } catch {
        // transitório — segue tentando
      }
      if (!alive) return;
      timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [lobbyId, botError, router]);

  // Contador regressivo: um "relógio" que avança 1x/s; o restante é DERIVADO no render
  // (evita setState síncrono em effect). O interval só atualiza o instante atual.
  const estReadyAt = queue?.estReadyAt ?? null;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remainingSec = estReadyAt ? (new Date(estReadyAt).getTime() - nowMs) / 1000 : null;

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
          <p className="mt-1 font-body text-xs text-text-faded">{t("roomStatusErrorHelp")}</p>
        </div>
      </div>
    );
  }

  // Na fila atrás de outra partida: mostra posição + tempo máximo (pior caso).
  if (queue?.inQueue && !queue.creatingNow && queue.position > 1) {
    const soon = remainingSec !== null && remainingSec <= 0;
    return (
      <div className="flex items-center gap-3 rounded-md border border-gold/40 bg-gold/[0.06] px-4 py-3">
        <Clock size={18} className="shrink-0 text-gold" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-gold">
            {t("roomStatusQueued")}
          </p>
          <p className="mt-0.5 font-body text-xs text-text-faded">
            {soon || remainingSec === null
              ? t("roomStatusQueuedSoon")
              : t("roomStatusQueuedBody", {
                  position: queue.position,
                  time: fmtMMSS(remainingSec),
                })}
          </p>
        </div>
      </div>
    );
  }

  // É a vez do meu lobby — bot montando agora.
  if (queue?.creatingNow) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-play-primary/40 bg-play-primary/[0.06] px-4 py-3">
        <Loader2 size={18} className="shrink-0 animate-spin text-play-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-play-primary">
            {t("roomStatusCreating")}
          </p>
          <p className="mt-0.5 font-body text-xs text-text-faded">{t("roomStatusCreatingBody")}</p>
        </div>
      </div>
    );
  }

  // Fallback: fila ainda não respondeu — aguardando genérico.
  return (
    <div className="flex items-center gap-3 rounded-md border border-gold/40 bg-gold/[0.06] px-4 py-3">
      <Loader2 size={18} className="shrink-0 animate-spin text-gold" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-gold">
          {t("roomStatusWaiting")}
        </p>
        <p className="mt-0.5 font-body text-xs text-text-faded">{t("roomStatusWaitingBody")}</p>
      </div>
    </div>
  );
}
