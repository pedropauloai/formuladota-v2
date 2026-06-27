"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { discardMatch } from "@/app/partida/actions";

// Botão "Descartar partida" (uso restrito a admin — o gate fica em quem renderiza).
// Confirmação inline em 2 cliques (sem window.confirm nativo). Ao confirmar: seta
// status='cancelled' (o bot finaliza o lobby Steam + a fila é limpa na action).
// redirectTo: pra onde ir após sucesso. null = só atualiza a tela atual (router.refresh),
// usado na auditoria /admin/partidas pra recarregar a lista sem sair dela.
export function DiscardMatchButton({
  lobbyId,
  redirectTo = "/",
}: {
  lobbyId: string;
  redirectTo?: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    start(async () => {
      const res = await discardMatch(lobbyId);
      if (res.success) {
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        setError(res.error ?? "Erro.");
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 font-display text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-60 ${
          confirming
            ? "border-error bg-error/15 text-error hover:bg-error/25"
            : "border-border-subtle text-text-muted hover:border-error/50 hover:text-error"
        }`}
      >
        <Trash2 size={15} aria-hidden="true" />
        {confirming ? "Confirmar descarte?" : "Descartar partida"}
      </button>
      {error && <p className="font-mono text-xs text-error">{error}</p>}
    </div>
  );
}
