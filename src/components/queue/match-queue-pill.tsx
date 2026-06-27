"use client";

// MatchQueuePill — indicador discreto no topbar: quantos jogadores estão buscando
// partida agora (match_queue waiting). Atualiza por POLLING leve (8s).
//
// Por que polling e não realtime: match_queue NÃO está na publication supabase_realtime
// e tem RLS self (cada user só vê a própria entry), então o postgres_changes do client
// não enxergaria a fila inteira. A contagem global vem de uma server action que usa
// service client. Auto-busca no mount (não precisa de prop initial do shell).

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { getMatchSearchingCount } from "@/app/queue/actions";

const POLL_MS = 8000;

export function MatchQueuePill() {
  const t = useTranslations("topbar");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      const n = await getMatchSearchingCount();
      if (active) setCount(n);
    };
    void tick();
    const iv = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, []);

  if (!count || count <= 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-1">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-info" />
      </span>
      <Search size={12} className="text-info/80" aria-hidden="true" />
      <span className="font-display text-sm font-semibold text-info/90">
        {t("inQueue", { count })}
      </span>
    </div>
  );
}
