"use client";

// Indicadores da comunidade no topbar (estilo GamersClub): total ONLINE + total
// BANIDO. O de banidos é clicável → /mural. Recebe os valores iniciais do SSR
// (shell) e faz polling leve (45s) pra ficar vivo. Também pinga o próprio heartbeat
// de last_seen_at (60s) — como o topbar está SEMPRE montado, garante que todo
// logado conta como online mesmo com o painel de amigos fechado.

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
      try {
        const c = await getCommunityCounters();
        if (alive) setCounters(c);
      } catch {
        /* best-effort */
      }
    };
    const pollId = setInterval(refresh, POLL_MS);

    // Heartbeat próprio (garante last_seen_at fresco → o próprio user conta como online).
    let beatId: ReturnType<typeof setInterval> | null = null;
    if (isLoggedIn) {
      const beat = () => void updateLastSeen().catch(() => {});
      beat();
      beatId = setInterval(beat, HEARTBEAT_MS);
    }
    return () => {
      alive = false;
      clearInterval(pollId);
      if (beatId) clearInterval(beatId);
    };
  }, [isLoggedIn]);

  return (
    <div className="flex items-center gap-2">
      {/* ONLINE — ponto verde pulsante + total */}
      <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-1">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <span className="font-display text-sm font-semibold tabular-nums text-success/90">
          {t("onlineCount", { count: counters.online })}
        </span>
      </div>

      {/* BANIDOS — clicável → /mural (accountability pública, anti-anonimato) */}
      <Link
        href="/mural"
        aria-label={t("bannedCountAria", { count: counters.banned })}
        className="flex items-center gap-1.5 rounded-md border border-error/30 bg-error/5 px-3 py-1 text-error/90 transition-colors hover:border-error/60 hover:bg-error/10 hover:text-error"
      >
        <Ban size={12} aria-hidden="true" />
        <span className="font-display text-sm font-semibold tabular-nums">
          {t("bannedCount", { count: counters.banned })}
        </span>
      </Link>
    </div>
  );
}
