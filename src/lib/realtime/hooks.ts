"use client";
/**
 * Hooks Realtime — FormulaDota V2.5 (stubs Supabase-ready)
 *
 * Hooks preparados para integrar Supabase Realtime quando o bot Steam estiver pronto.
 * Por enquanto retornam mock data — interfaces e assinaturas já definidas para o futuro.
 *
 * TODO: substituir retornos mock por subscriptions reais nos comentários marcados com [REALTIME].
 *
 * Referência de arquitetura: ARCHITECTURE.md — seção Realtime (a criar).
 */

import { useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Estado de presença do coach (Pedro) em tempo real. */
export interface CoachPresence {
  /** true quando o coach está acessível (online ou em partida) */
  online: boolean;
  /** Status detalhado de presença */
  status: "online" | "offline" | "in-match";
  /** Última vez visto — null quando nunca visto ou offline há muito tempo */
  lastSeenAt: Date | null;
}

/** Estatísticas da comunidade em tempo real. */
export interface CommunityStats {
  /** Alunos que jogaram ao menos uma partida nos últimos 7 dias */
  weekActiveStudents: number;
  /** Tempo até a próxima vaga disponível — null se não há vaga prevista */
  nextSlotIn: { hours: number; minutes: number } | null;
  /** Usuários com sessão ativa agora */
  onlineNow: number;
}

// ---------------------------------------------------------------------------
// useCoachPresence
// ---------------------------------------------------------------------------

/**
 * Hook stub — retorna mock presence do Pedro.
 *
 * [REALTIME] TODO: integrar com Supabase Realtime channel "coach-presence"
 * quando bot Steam estiver pronto. Exemplo de integração futura:
 *
 * ```ts
 * const channel = supabase.channel("coach-presence")
 *   .on("presence", { event: "sync" }, () => {
 *     const state = channel.presenceState();
 *     // mapear state → CoachPresence
 *   })
 *   .subscribe();
 * return () => supabase.removeChannel(channel);
 * ```
 */
export function useCoachPresence(): CoachPresence {
  // Mock: Pedro online — substituir por subscription real
  return {
    online: true,
    status: "online",
    lastSeenAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// useCommunityStats
// ---------------------------------------------------------------------------

/**
 * Hook stub — retorna mock community stats.
 *
 * [REALTIME] TODO: integrar com Supabase queries reais:
 *   - weekActiveStudents: COUNT de sessions nos últimos 7 dias
 *   - nextSlotIn: próximo slot livre da tabela queue
 *   - onlineNow: Realtime presence count no channel "lobby"
 */
export function useCommunityStats(): CommunityStats {
  return {
    weekActiveStudents: 12,
    nextSlotIn: { hours: 2, minutes: 14 },
    onlineNow: 4,
  };
}

// ---------------------------------------------------------------------------
// useInterval
// ---------------------------------------------------------------------------

/**
 * Hook genérico — executa callback a cada N milissegundos.
 *
 * Útil para countdown components que precisam recalcular a cada intervalo.
 * Cleanup automático no unmount — sem memory leaks.
 *
 * @param callback Função a executar no intervalo (deve ser estável — memoizar com useCallback)
 * @param ms       Intervalo em milissegundos
 *
 * @example
 * // Recalcular countdown a cada minuto
 * useInterval(recalcularCountdown, 60_000);
 */
export function useInterval(callback: () => void, ms: number): void {
  useEffect(() => {
    const id = setInterval(callback, ms);
    return () => clearInterval(id);
  }, [callback, ms]);
}

// ---------------------------------------------------------------------------
// useCountdown
// ---------------------------------------------------------------------------

/**
 * Hook de countdown — retorna dias/horas/minutos restantes até uma data alvo.
 * Recalcula automaticamente a cada minuto.
 *
 * @param endsAt Data de fim do countdown
 * @returns      Objeto com dias/horas/minutos ou null se a data já passou
 */
export function useCountdown(
  endsAt: Date
): { days: number; hours: number; minutes: number } | null {
  const calcRemaining = (): { days: number; hours: number; minutes: number } | null => {
    const diffMs = endsAt.getTime() - Date.now();
    if (diffMs <= 0) return null;

    const totalMinutes = Math.floor(diffMs / 60_000);
    const days    = Math.floor(totalMinutes / (60 * 24));
    const hours   = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    return { days, hours, minutes };
  };

  const [remaining, setRemaining] = useState<
    { days: number; hours: number; minutes: number } | null
  >(calcRemaining);

  useEffect(() => {
    // Recalcular a cada minuto (60_000ms)
    const id = setInterval(() => {
      setRemaining(calcRemaining());
    }, 60_000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt.getTime()]);

  return remaining;
}
