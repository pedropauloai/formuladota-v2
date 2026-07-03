"use client";

// Botão admin no placar: re-busca a partida na OpenDota e regrava os dados
// (usado quando o enrich rodou antes do replay ser parseado → abas vazias).
// Pedro 2026-07-03.

import { useState, useTransition } from "react";
import { RefreshCw, Loader2, Check, AlertCircle } from "lucide-react";
import { reprocessMatchOpenDota } from "@/app/admin/pros/actions";

export function ReprocessMatchButton({
  matchId,
  dotaMatchId,
}: {
  matchId: string;
  dotaMatchId: string;
}) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setState("idle");
    setMsg(null);
    startTransition(async () => {
      const res = await reprocessMatchOpenDota(matchId, dotaMatchId);
      if (res.success) {
        setState("ok");
        setMsg(`Atualizado (${res.data?.updated ?? 0} jogadores). Recarregue a página.`);
      } else {
        setState("error");
        setMsg(res.error);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-bg-surface px-2 py-1 font-display text-xs uppercase tracking-wide text-text-muted transition-colors hover:border-brand-primary/50 hover:text-text-display disabled:opacity-50"
        title="Re-buscar dados da OpenDota (corrige abas vazias quando o replay foi parseado depois do enrich)"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        Reprocessar OpenDota
      </button>
      {msg && (
        <span
          className={`inline-flex items-center gap-1 font-mono text-xs ${
            state === "ok" ? "text-emerald-400" : "text-error"
          }`}
        >
          {state === "ok" ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
          {msg}
        </span>
      )}
    </span>
  );
}
