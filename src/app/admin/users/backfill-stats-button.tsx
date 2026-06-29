"use client";

// Botão admin "Sincronizar stats" — dispara o backfill de carreira + KDA/GPM/XPM
// de todos os usuários com Steam (OpenDota/STRATZ → cache user_stats_extended).
// Pode levar ~1.2s por usuário (throttle de rate limit); mostra o resultado.

import { useState, useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { backfillAllPlayerStats } from "./stats-actions";

export function BackfillStatsButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      try {
        const r = await backfillAllPlayerStats();
        setMsg(`${r.synced}/${r.total} sincronizados${r.failed ? ` · ${r.failed} falharam` : ""}`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Falhou");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md border border-brand-primary/60 bg-brand-primary/10 px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw size={14} aria-hidden="true" />
        )}
        Sincronizar stats (OpenDota/STRATZ)
      </button>
      {msg && (
        <span className="font-display text-sm font-semibold text-text-muted">{msg}</span>
      )}
    </div>
  );
}
