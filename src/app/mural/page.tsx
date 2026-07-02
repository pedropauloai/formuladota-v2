import type { Metadata } from "next";
import { ShieldX, Ban, Clock } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { getWallOfShame } from "@/lib/queries/wall-of-shame";

export const metadata: Metadata = {
  title: "Mural da Vergonha — FORMULADOTA",
  description: "Registro público de quebras de conduta na comunidade FormulaDota.",
};

export const dynamic = "force-dynamic";

// Mural da Vergonha (Eixo 4 — conduta). Público e factual: quem quebrou regra fica
// registrado com o princípio/anti-padrão violado. Contraponto do leaderboard —
// accountability nos dois extremos. Coerente com o anti-anonimato.
export default async function MuralPage() {
  const entries = await getWallOfShame();

  return (
    <ClientShell currentRoute="/mural">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
            <ShieldX className="size-4" aria-hidden="true" />
            Conduta
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-text-display">
            Mural da Vergonha
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-text-muted">
            Aqui não existe anonimato. Quem quebra as regras da comunidade fica registrado —
            com o princípio ou anti-padrão que violou. A responsabilidade é sempre sua.
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 px-6 py-12 text-center">
            <ShieldX className="mx-auto mb-3 size-8 text-text-faded" aria-hidden="true" />
            <p className="font-display text-sm font-bold uppercase tracking-wide text-text-muted">
              Mural limpo
            </p>
            <p className="mt-1 font-body text-sm text-text-faded">
              Nenhuma quebra de conduta registrada. Que continue assim.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const banned = e.status === "banned";
              return (
                <li
                  key={e.userId}
                  className={`flex items-start gap-3 rounded-[var(--radius-md)] border bg-bg-elevated/40 p-4 ${
                    banned ? "border-error/40" : "border-gold/30"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm ${
                      banned ? "bg-error/15 text-error" : "bg-gold/15 text-gold"
                    }`}
                  >
                    {banned ? <Ban size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-display text-base font-bold text-text-display">
                        {e.username ?? "Jogador"}
                      </span>
                      <span
                        className={`rounded-sm px-1.5 py-0.5 font-display text-[0.65rem] font-bold uppercase tracking-wide ${
                          banned ? "bg-error/15 text-error" : "bg-gold/15 text-gold"
                        }`}
                      >
                        {banned ? "Banido" : "Suspenso"}
                      </span>
                    </div>
                    {(e.principle || e.antipattern) && (
                      <p className="mt-1 font-display text-xs font-semibold uppercase tracking-wide text-brand-primary">
                        {e.antipattern ?? e.principle}
                      </p>
                    )}
                    {e.reason && (
                      <p className="mt-1 font-body text-sm text-text-muted">{e.reason}</p>
                    )}
                    <p className="mt-1.5 font-mono text-[0.7rem] tabular-nums text-text-faded">
                      {e.since
                        ? new Date(e.since).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                      {!banned && e.suspendedUntil
                        ? ` · até ${new Date(e.suspendedUntil).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ClientShell>
  );
}
