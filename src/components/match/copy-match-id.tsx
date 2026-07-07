"use client";
// ID da partida exposto + botão de copiar. Jogadores usam esse ID pra assistir/
// rever a partida DENTRO do próprio Dota 2 (Assistir → buscar por ID).

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

export function CopyMatchId({ matchId }: { matchId: string }) {
  const t = useTranslations("scoreboard");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(matchId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (contexto inseguro) — silencioso.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={t("copyMatchIdTitle")}
      className="inline-flex items-center gap-1.5 rounded-sm bg-bg-surface px-2 py-1 font-mono text-xs tabular-nums text-text-muted transition-colors hover:text-text-display"
    >
      <span className="normal-case text-text-faded">ID</span>
      <span>{matchId}</span>
      {copied ? (
        <Check className="size-3.5 text-[#00C466]" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied && <span className="normal-case text-[#00C466]">{t("copyMatchIdCopied")}</span>}
    </button>
  );
}
