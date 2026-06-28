"use client";

// MatchQueuePill — indicador discreto no topbar: quantos jogadores estão buscando
// partida agora (match_queue waiting). Atualiza por PUSH (Supabase Realtime).
//
// match_queue tem RLS self → o cliente não conta a fila inteira. A contagem vem
// de public.queue_live_stats (agregado público recalculado por trigger, migration
// 061), assinado via useQueueLiveStats. Sem polling.

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useQueueLiveStats } from "@/lib/realtime/use-queue-live-stats";

export function MatchQueuePill() {
  const t = useTranslations("topbar");
  const { waitingCount } = useQueueLiveStats();

  if (waitingCount <= 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-1">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-info" />
      </span>
      <Search size={12} className="text-info/80" aria-hidden="true" />
      <span className="font-display text-sm font-semibold text-info/90">
        {t("inQueue", { count: waitingCount })}
      </span>
    </div>
  );
}
