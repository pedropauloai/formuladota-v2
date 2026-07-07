"use client";

// Botão admin "Finalizar partida" — puxa o resultado do OpenDota (stats por jogador
// + MMR) e fecha o lobby. Só aparece pra admin numa partida com dota_match_id.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Flag, Loader2 } from "lucide-react";
import { finalizeLobbyMatch } from "@/app/partida/finalize-actions";

export function FinalizeMatchButton({ lobbyId }: { lobbyId: string }) {
  const t = useTranslations("scoreboard");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      const res = await finalizeLobbyMatch(lobbyId);
      if (res.success) {
        setMsg(t("matchFinalized"));
        router.refresh();
      } else {
        setMsg(res.error ?? t("failedShort"));
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md border border-play-primary bg-play-primary/15 px-3 py-2 font-display text-sm font-bold uppercase tracking-wide text-play-primary transition-colors hover:bg-play-primary/25 disabled:opacity-60"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} aria-hidden="true" />}
        {t("finalizeMatch")}
      </button>
      {msg && <span className="font-display text-xs font-semibold text-text-muted">{msg}</span>}
    </div>
  );
}
