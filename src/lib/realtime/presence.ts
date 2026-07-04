"use client";
// Hook REAL de presence (Phase 9 — D-34/D-35/D-36/D-37).
// Substitui o stub useCoachPresence em src/lib/realtime/hooks.ts.
//
// ATENÇÃO: NÃO deletar src/lib/realtime/hooks.ts — useCoachPresence/useCommunityStats
// continuam em uso no HeroState. Este arquivo é paralelo, não substituto direto.
//
// Pitfalls cobertos (RESEARCH):
//   - Pitfall 2: cleanup obrigatório com supabase.removeChannel
//   - Pitfall 3: presenceState retorna arrays — flatten pra Record<key, payload>
//
// Heartbeat de last_seen_at: REMOVIDO daqui (perf 2026-07-03). O topbar
// (CommunityCountersBar, sempre montado) já pinga updateLastSeen a cada 60s —
// manter outro aqui dobrava as escritas em profiles pra todo usuário logado.

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type PresenceStatus = "online" | "in-queue" | "in-match";

export interface UserPresencePayload {
  userId: string;
  status: PresenceStatus;
  joinedAt: string; // ISO timestamp
}

/**
 * Hook de presence channel.
 *
 * @param currentUserId  UUID do user logado. Passar `null` se visitante (hook no-op).
 * @returns presenceMap  Record<userId, UserPresencePayload> dos users online.
 */
export function usePresenceChannel(
  currentUserId: string | null
): Record<string, UserPresencePayload> {
  const [presenceMap, setPresenceMap] = useState<
    Record<string, UserPresencePayload>
  >({});
  // Ref pra supabase client estável (evita re-criar channel a cada render)
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = supabaseRef.current;
    const channel = supabase.channel("online-users", {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<UserPresencePayload>();
        // Pitfall 3: state value é PresencePayload[] — múltiplas tabs do mesmo user
        const flat: Record<string, UserPresencePayload> = {};
        Object.entries(state).forEach(([key, payloads]) => {
          const last = payloads.at(-1); // pega entry mais recente
          if (last) flat[key] = last;
        });
        setPresenceMap(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUserId,
            status: "online" as PresenceStatus,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      // Pitfall 2: cleanup obrigatório
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return presenceMap;
}

/**
 * Helper: dado um userId e o presenceMap, retorna PresenceStatus ou "offline".
 */
export function getPresenceStatus(
  userId: string,
  presenceMap: Record<string, UserPresencePayload>
): PresenceStatus | "offline" {
  return presenceMap[userId]?.status ?? "offline";
}

/**
 * Formata "visto há Xh" / "visto há Xmin" / "visto há N dias" em PT-BR
 * a partir de last_seen_at ISO timestamp. Retorna null se nunca visto.
 */
export function formatLastSeen(lastSeenISO: string | null): string | null {
  if (!lastSeenISO) return null;
  const diffMs = Date.now() - new Date(lastSeenISO).getTime();
  if (diffMs < 0) return "Visto agora";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Visto agora";
  if (minutes < 60) return `Visto há ${minutes}min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Visto há ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Visto há 1 dia";
  return `Visto há ${days} dias`;
}
