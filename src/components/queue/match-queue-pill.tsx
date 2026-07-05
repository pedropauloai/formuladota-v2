"use client";

// MatchQueuePill — indicador discreto no topbar: quantos jogadores estão buscando
// partida agora (match_queue waiting). Atualiza por PUSH (Supabase Realtime).
// Hover: mostra QUEM está na fila (nome + função + medalha com nº do leaderboard).
//
// match_queue tem RLS self → o cliente não conta a fila inteira. A contagem vem
// de public.queue_live_stats (agregado público, migration 061). A LISTA vem do RPC
// get_queue_searchers (só ao abrir o hover).

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useQueueLiveStats } from "@/lib/realtime/use-queue-live-stats";
import { getQueueSearchers } from "@/app/queue/actions";
import { getSeasonPositions } from "@/actions/topbar-hovers";
import { PlayersHover, type HoverPlayer } from "@/components/topbar/players-hover";

export function MatchQueuePill() {
  const t = useTranslations("topbar");
  const { waitingCount } = useQueueLiveStats();

  if (waitingCount <= 0) return null;

  const load = async (): Promise<HoverPlayer[]> => {
    const searchers = await getQueueSearchers();
    const positions = await getSeasonPositions(searchers.map((s) => s.userId));
    return searchers.map((s) => ({
      userId: s.userId,
      name: s.name,
      avatar: s.avatar,
      mmr: s.mmr,
      level: s.level,
      xpPct: s.xpPct,
      seasonPos: positions[s.userId] ?? null,
      roles: s.roles,
    }));
  };

  return (
    <PlayersHover load={load} title={t("inQueueTitle")} emptyText={t("inQueueEmpty")}>
      <div className="flex cursor-default items-center gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-1">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-info" />
        </span>
        <Search size={12} className="text-info/80" aria-hidden="true" />
        <span className="font-display text-sm font-semibold text-info/90">
          {t("inQueue", { count: waitingCount })}
        </span>
      </div>
    </PlayersHover>
  );
}
