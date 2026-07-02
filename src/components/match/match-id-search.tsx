"use client";

// Busca de partida por ID (dota_match_id) — leva direto pro placar do histórico.
// Fica no topo da rota /partidas. Aceita só dígitos (o ID da Valve é numérico).

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function MatchIdSearch() {
  const t = useTranslations("matchesFeed");
  const router = useRouter();
  const [value, setValue] = useState("");

  function go() {
    const id = value.replace(/\D/g, "").trim(); // só dígitos
    if (id.length < 6) return; // dota_match_id tem 8-12 dígitos
    router.push(`/partida/historico/${id}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-elevated/40 p-2 backdrop-blur-sm"
    >
      <Search size={16} className="ml-1 shrink-0 text-text-muted" aria-hidden="true" />
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchByIdPlaceholder")}
        aria-label={t("searchByIdPlaceholder")}
        className="min-w-0 flex-1 bg-transparent px-1 py-1 font-mono text-sm tabular-nums text-text-display placeholder:font-body placeholder:text-text-faded focus:outline-none"
      />
      <button
        type="submit"
        disabled={value.replace(/\D/g, "").length < 6}
        className="shrink-0 rounded-sm border border-border-strong bg-bg-surface px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-text-body transition-colors hover:border-brand-primary/60 hover:text-text-display disabled:opacity-50"
      >
        {t("searchByIdButton")}
      </button>
    </form>
  );
}
