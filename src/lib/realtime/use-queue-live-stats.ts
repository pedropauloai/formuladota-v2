"use client";

// useQueueLiveStats — agregados da fila AO VIVO (push, sem polling).
//
// match_queue é RLS self → o cliente não conta a fila inteira. A migration 061
// mantém public.queue_live_stats (1 linha 'singleton') recalculada por trigger e
// publicada no supabase_realtime. Aqui: snapshot inicial via server actions (já
// tipadas, service client) + atualização pelo payload de cada postgres_changes.
//
// Consumido por MatchQueuePill (waitingCount) e PlayMenu (demand). Substitui os
// setInterval de 8s / 4s. Cleanup automático ao desmontar.

import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getMatchSearchingCount,
  getRoleDemand,
  type RoleDemand,
} from "@/app/queue/actions";

export interface QueueLiveStats {
  waitingCount: number;
  demand: RoleDemand;
}

const EMPTY_DEMAND: RoleDemand = {
  safelane: 0,
  midlane: 0,
  offlane: 0,
  support: 0,
  support_dedicated: 0,
};

// Extrai a demanda do objeto roles do payload (valores podem vir como string).
function parseDemand(roles: unknown): RoleDemand {
  const demand: RoleDemand = { ...EMPTY_DEMAND };
  const obj = (roles ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(demand) as (keyof RoleDemand)[]) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) demand[k] = v;
  }
  return demand;
}

export function useQueueLiveStats(): QueueLiveStats {
  const [stats, setStats] = useState<QueueLiveStats>({
    waitingCount: 0,
    demand: { ...EMPTY_DEMAND },
  });
  // Canal único por instância do hook (MatchQueuePill e PlayMenu coexistem).
  const channelId = useId();

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    // Snapshot inicial (postgres_changes só entrega MUDANÇAS, não o estado atual).
    void Promise.all([getMatchSearchingCount(), getRoleDemand()]).then(
      ([count, rd]) => {
        if (alive) setStats({ waitingCount: count, demand: rd.demand });
      }
    );

    const channel = supabase
      .channel(`queue-live-stats-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_live_stats",
          filter: "id=eq.singleton",
        },
        (payload) => {
          const row = payload.new as {
            waiting_count?: number | string | null;
            roles?: unknown;
          };
          setStats({
            waitingCount: Number(row.waiting_count) || 0,
            demand: parseDemand(row.roles),
          });
        }
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [channelId]);

  return stats;
}
