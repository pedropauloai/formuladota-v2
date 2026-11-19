"use client";

// Mantém a fila da página em dia: consulta a cada 3 s quando a pessoa está na fila ou com Pix
// pendente, a cada 8 s no resto, para enquanto a aba está escondida e consulta na hora ao voltar.
// O celular derruba conexão aberta com a aba no fundo; consulta curta volta sozinha.

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueView } from "@/lib/loja/fila/model";

const FAST_MS = 3000;
const SLOW_MS = 8000;

function isUrgent(view: QueueView): boolean {
  const mine = view.mine;
  if (!mine) return false;
  return mine.pending !== null || mine.entries.some((e) => e.state === "aguardando" || e.state === "na_party");
}

export function useQueueView(initial: QueueView, loggedIn: boolean) {
  const [view, setView] = useState(initial);
  const urgent = useRef(isUrgent(initial));

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(loggedIn ? "/api/party/fila/minha" : "/api/party/fila", { cache: "no-store" });
      if (!response.ok) return;
      const data: unknown = await response.json();
      const next = (loggedIn ? data : { queue: data, mine: null }) as QueueView;
      urgent.current = isUrgent(next);
      setView(next);
    } catch {
      // Sem rede por um instante: a próxima consulta tenta de novo.
    }
  }, [loggedIn]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const schedule = () => {
      timer = setTimeout(tick, urgent.current ? FAST_MS : SLOW_MS);
    };
    const tick = async () => {
      if (stopped) return;
      if (!document.hidden) await refresh();
      if (!stopped) schedule();
    };
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  return { view, refresh };
}
