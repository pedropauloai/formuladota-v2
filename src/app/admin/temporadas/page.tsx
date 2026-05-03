// /admin/temporadas — CRUD seasons. Phase 8 H6.3.

import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Admin Temporadas — FORMULADOTA" };

export default async function AdminTemporadasPage() {
  const supabase = createServiceClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("started_at", { ascending: false });

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Temporadas
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
          Seasons
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      <div className="space-y-3">
        {(seasons ?? []).map((s) => (
          <article
            key={s.id}
            className={`rounded-md border p-6 ${
              s.active
                ? "border-[var(--color-brand-red)]/60 bg-[var(--color-brand-red)]/5"
                : "border-[var(--color-border)] bg-[var(--color-card)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-[var(--color-brand-red)]" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-xl uppercase tracking-wide text-[var(--color-foreground)]">{s.name}</h3>
                  <p className="font-mono text-xs text-[var(--color-muted-foreground)]">
                    Iniciada em {new Date(s.started_at).toLocaleDateString("pt-BR")}
                    {s.ended_at && ` · Encerrada em ${new Date(s.ended_at).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              {s.active && (
                <span className="rounded-md border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-[var(--color-success)]">
                  Ativa
                </span>
              )}
            </div>
            {Number(s.prize_pool) > 0 && (
              <p className="mt-4 font-mono text-sm text-[var(--color-foreground)]">
                Prize pool: {s.prize_pool_currency} {Number(s.prize_pool).toLocaleString("pt-BR")}
              </p>
            )}
          </article>
        ))}
      </div>

      <p className="text-xs text-[var(--color-text-faded)]">
        Criação/encerramento manual de seasons via Server Actions — V2 expansão.
      </p>
    </div>
  );
}
