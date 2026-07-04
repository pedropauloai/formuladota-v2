"use client";

// Seletor de período + região do dashboard admin (FASE 5, 2026-07-04).
// Tudo via searchParams — a página é SSR e refaz as queries por range
// (mata o bug antigo de "só mês corrente").

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { GAME_REGIONS, REGION_LABELS } from "@/lib/regions";
import { PERIODS, PERIOD_LABELS, type Period } from "./period";

const BTN =
  "rounded-[2px] px-2.5 py-1 font-display text-[12px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50";
const BTN_ON = "bg-brand-primary text-text-display";
const BTN_OFF = "text-text-faded hover:text-text-body";

export function PeriodRegionFilter({
  period,
  region,
  from,
  to,
}: {
  period: Period;
  region: string; // 'all' | GameRegion
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function push(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.push(`/admin/dashboard?${next.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Período */}
      <div
        role="group"
        aria-label="Período"
        className="inline-flex items-center gap-0.5 rounded-sm border border-border-subtle bg-bg-base/60 p-0.5"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={pending}
            aria-pressed={p === period}
            onClick={() =>
              push(p === "custom" ? { period: p } : { period: p, from: null, to: null })
            }
            className={`${BTN} ${p === period ? BTN_ON : BTN_OFF}`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Range custom (só quando period=custom) */}
      {period === "custom" && (
        <div className="flex items-center gap-2 font-mono text-sm text-text-faded">
          <input
            type="date"
            defaultValue={from ?? ""}
            aria-label="De"
            onChange={(e) => e.target.value && push({ from: e.target.value })}
            className="rounded-sm border border-border-subtle bg-bg-base px-2 py-1 text-text-body"
          />
          <span>→</span>
          <input
            type="date"
            defaultValue={to ?? ""}
            aria-label="Até"
            onChange={(e) => e.target.value && push({ to: e.target.value })}
            className="rounded-sm border border-border-subtle bg-bg-base px-2 py-1 text-text-body"
          />
        </div>
      )}

      {/* Região */}
      <div
        role="group"
        aria-label="Região"
        className="inline-flex items-center gap-0.5 rounded-sm border border-border-subtle bg-bg-base/60 p-0.5"
      >
        {(["all", ...GAME_REGIONS] as const).map((r) => (
          <button
            key={r}
            type="button"
            disabled={pending}
            aria-pressed={r === region}
            onClick={() => push({ region: r === "all" ? null : r })}
            className={`${BTN} ${r === region ? BTN_ON : BTN_OFF}`}
          >
            {r === "all" ? "Todas" : REGION_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  );
}
