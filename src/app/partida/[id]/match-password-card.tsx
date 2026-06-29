"use client";

// Senha do lobby Steam — SOMENTE LEITURA: é definida pelo bot ao criar o lobby,
// não é editável (Pedro 2026-06-29). Só exibe + copia.

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function MatchPasswordCard({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard?.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-play-primary/40 bg-bg-elevated p-4">
      <p className="mb-1.5 font-display text-xs uppercase tracking-[0.2em] text-text-muted">
        Senha do lobby Steam
      </p>
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-bold tracking-[0.3em] text-text-display">
          {password}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar senha"
          className="flex size-10 items-center justify-center rounded-sm border border-border-subtle text-text-muted transition-colors hover:text-text-body"
        >
          {copied ? <Check size={16} className="text-play-primary" /> : <Copy size={16} />}
        </button>
      </div>
      <p className="mt-3 font-body text-sm text-text-muted">
        O convite chega no seu Dota 2 — é só aceitar. Se não chegar, entre no lobby pela senha acima.
      </p>
    </div>
  );
}
