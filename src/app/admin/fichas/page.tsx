// /admin/fichas — log de ajustes admin de fichas (source = admin_grant | admin_debit).
// Mostra quem fez, em quem, quanto, por quê e quando.

import type { Metadata } from "next";
import { Plus, Minus, Coins } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Log de fichas — Admin" };

export default async function AdminFichasPage() {
  const supabase = createServiceClient();

  // Últimos 200 ajustes admin
  const { data: ledger } = await supabase
    .from("ficha_ledger")
    .select("id, user_id, delta, source, reason, admin_user_id, created_at")
    .in("source", ["admin_grant", "admin_debit"])
    .order("created_at", { ascending: false })
    .limit(200);

  // Resolver nomes dos users envolvidos (alvo + admin)
  const ids = new Set<string>();
  for (const e of ledger ?? []) {
    if (e.user_id) ids.add(e.user_id);
    if (e.admin_user_id) ids.add(e.admin_user_id);
  }
  const { data: profiles } = ids.size > 0
    ? await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", Array.from(ids))
    : { data: [] };
  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.username ?? p.email ?? p.id.slice(0, 8)])
  );

  // Resumo agregado
  const totalGrants = (ledger ?? [])
    .filter((e) => e.source === "admin_grant")
    .reduce((acc, e) => acc + e.delta, 0);
  const totalDebits = (ledger ?? [])
    .filter((e) => e.source === "admin_debit")
    .reduce((acc, e) => acc + Math.abs(e.delta), 0);

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Fichas · Log Admin
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
          Movimentações admin
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Plus}
          label="Total concedido"
          value={totalGrants}
          color="emerald"
        />
        <StatCard
          icon={Minus}
          label="Total removido"
          value={totalDebits}
          color="amber"
        />
        <StatCard
          icon={Coins}
          label="Total de eventos"
          value={ledger?.length ?? 0}
          color="brand"
        />
      </div>

      {/* Tabela log */}
      <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full">
          <thead className="border-b border-[var(--color-border)]">
            <tr>
              <Th>Quando</Th>
              <Th>Tipo</Th>
              <Th>Alvo</Th>
              <Th>Delta</Th>
              <Th>Admin</Th>
              <Th>Razão</Th>
            </tr>
          </thead>
          <tbody>
            {(ledger ?? []).map((e) => (
              <tr
                key={e.id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-background)]/30"
              >
                <Td>
                  <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </span>
                </Td>
                <Td>
                  <SourceBadge source={e.source} />
                </Td>
                <Td>
                  <span className="font-sans text-sm text-white">
                    {nameMap.get(e.user_id) ?? e.user_id.slice(0, 8)}
                  </span>
                </Td>
                <Td>
                  <span
                    className={`font-display text-base ${
                      e.delta > 0 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {e.delta > 0 ? "+" : ""}
                    {e.delta}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                    {e.admin_user_id
                      ? nameMap.get(e.admin_user_id) ?? e.admin_user_id.slice(0, 8)
                      : "—"}
                  </span>
                </Td>
                <Td>
                  <span className="font-sans text-xs text-white/70">
                    {e.reason ?? "—"}
                  </span>
                </Td>
              </tr>
            ))}
            {(!ledger || ledger.length === 0) && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center font-mono text-xs text-[var(--color-muted-foreground)]"
                >
                  Nenhum ajuste registrado ainda. Vá em &ldquo;Users&rdquo; pra ajustar fichas de alguém.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Plus;
  label: string;
  value: number;
  color: "emerald" | "amber" | "brand";
}) {
  const colors = {
    emerald: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/40 bg-amber-500/5 text-amber-400",
    brand: "border-[var(--color-brand-red)]/40 bg-[var(--color-brand-red)]/5 text-[var(--color-brand-red)]",
  };
  return (
    <article className={`rounded-md border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} aria-hidden="true" />
        <p className="font-sans text-[10px] font-semibold uppercase tracking-widest">
          {label}
        </p>
      </div>
      <p className="mt-2 font-display text-3xl text-white">{value}</p>
    </article>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm">{children}</td>;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "admin_grant") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400">
        <Plus size={9} />
        Grant
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-400">
      <Minus size={9} />
      Debit
    </span>
  );
}
