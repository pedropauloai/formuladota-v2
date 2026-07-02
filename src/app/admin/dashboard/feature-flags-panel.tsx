"use client";

// Painel de feature flags no admin dashboard. Cada flag = um toggle que liga/desliga
// a feature pra todos (o admin continua enxergando). Otimista + useTransition.

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setFeatureFlag } from "@/app/admin/feature-flags-actions";
import type { FeatureFlagKey, FeatureFlags } from "@/lib/queries/feature-flags";

interface FlagDef {
  key: FeatureFlagKey;
  label: string;
  description: string;
}

const FLAG_DEFS: FlagDef[] = [
  {
    key: "ranked_com_pro",
    label: "Subir MMR / Ranked com PRO",
    description:
      "Aba do topbar, card da sidebar, modalidade no menu Jogar e a rota /ranked-com-pro. Desligado = some pros usuários (você, admin, continua vendo).",
  },
];

export function FeatureFlagsPanel({ initial }: { initial: FeatureFlags }) {
  const [flags, setFlags] = useState<FeatureFlags>(initial);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(key: FeatureFlagKey, next: boolean) {
    setError(null);
    setPendingKey(key);
    setFlags((f) => ({ ...f, [key]: next })); // otimista
    startTransition(async () => {
      const res = await setFeatureFlag(key, next);
      if (!res.success) {
        setFlags((f) => ({ ...f, [key]: !next })); // reverte
        setError(res.error);
      }
      setPendingKey(null);
    });
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-sm border border-error/40 bg-error/10 px-3 py-2 font-body text-sm text-error">
          {error}
        </p>
      )}
      {FLAG_DEFS.map((def) => {
        const on = flags[def.key];
        const loading = pendingKey === def.key;
        return (
          <div
            key={def.key}
            className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-4"
          >
            <div className="min-w-0">
              <p className="font-display text-sm font-bold uppercase tracking-wide text-text-display">
                {def.label}
              </p>
              <p className="mt-1 font-body text-sm leading-relaxed text-text-muted">
                {def.description}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              disabled={loading}
              onClick={() => toggle(def.key, !on)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                on ? "bg-play-primary" : "bg-bg-surface border border-border-strong"
              }`}
            >
              <span
                className={`inline-flex size-4 items-center justify-center rounded-full bg-white transition-transform ${
                  on ? "translate-x-6" : "translate-x-1"
                }`}
              >
                {loading && <Loader2 size={10} className="animate-spin text-bg-deep" aria-hidden="true" />}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
