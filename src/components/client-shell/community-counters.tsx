"use client";

// Indicador sutil da comunidade no topbar (ao lado da Conduta): online + banidos
// EMPILHADOS num só componente. O bloco INTEIRO é clicável → /mural (accountability).
// Recebe os valores iniciais do SSR (shell) e faz polling leve (45s). Também pinga o
// próprio heartbeat de last_seen_at (60s) — como o topbar está SEMPRE montado, garante
// que todo logado conta como online mesmo com o painel de amigos fechado.

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getCommunityCounters, type CommunityCounters } from "@/actions/community";
import { updateLastSeen } from "@/actions/profile";

const POLL_MS = 45_000;
const HEARTBEAT_MS = 60_000;

export function CommunityCountersBar({
  initial,
  isLoggedIn,
}: {
  initial: CommunityCounters;
  isLoggedIn: boolean;
}) {
  const t = useTranslations("topbar");
  const [counters, setCounters] = useState<CommunityCounters>(initial);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      // Aba oculta não paga poll — refetch imediato ao voltar (onWake abaixo).
      if (document.visibilityState === "hidden") return;
      try {
        const c = await getCommunityCounters();
        if (alive) setCounters(c);
      } catch {
        /* best-effort */
      }
    };
    const pollId = setInterval(refresh, POLL_MS);
    // Ao voltar pra aba, atualiza na hora (mesmo padrão onWake do play-menu).
    const onWake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onWake);

    // Heartbeat próprio (garante last_seen_at fresco → o próprio user conta como
    // online). ÚNICA fonte de heartbeat do app (o de presence.ts foi removido —
    // era escrita duplicada em profiles a cada 60s).
    let beatId: ReturnType<typeof setInterval> | null = null;
    if (isLoggedIn) {
      const beat = () => void updateLastSeen().catch(() => {});
      beat();
      beatId = setInterval(beat, HEARTBEAT_MS);
    }
    return () => {
      alive = false;
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", onWake);
      if (beatId) clearInterval(beatId);
    };
  }, [isLoggedIn]);

  return (
    <Link
      href="/mural"
      aria-label={t("communityStatsAria", {
        online: counters.online,
        banned: counters.banned,
      })}
      className="hidden md:flex flex-col justify-center gap-0.5 rounded-md px-2 py-0.5 leading-none text-text-faded transition-colors hover:bg-white/5 hover:text-text-muted"
    >
      {/* Online — ponto verde pulsante + total */}
      <span className="flex items-center gap-1.5">
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-success" />
        </span>
        <span className="font-display text-[0.7rem] font-semibold uppercase tracking-wide tabular-nums">
          {t("onlineCount", { count: counters.online })}
        </span>
      </span>
      {/* Banidos — ícone + total (clique no bloco leva pro Mural) */}
      <span className="flex items-center gap-1.5">
        <Ban size={10} className="text-error/70" aria-hidden="true" />
        <span className="font-display text-[0.7rem] font-semibold uppercase tracking-wide tabular-nums">
          {t("bannedCount", { count: counters.banned })}
        </span>
      </span>
    </Link>
  );
}
