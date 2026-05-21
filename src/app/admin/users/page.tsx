// /admin/users — lista users + saldo de fichas + ajuste admin.

import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { AdjustFichasModal } from "./adjust-fichas-modal";

export const metadata: Metadata = { title: "Admin Users — FORMULADOTA" };

export default async function AdminUsersPage() {
  const supabase = createServiceClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, email, role, behavior_status, created_at, is_admin")
    .order("created_at", { ascending: false })
    .limit(100);

  // Saldo de fichas por user (batch)
  const userIds = (profiles ?? []).map((p) => p.id);
  const { data: fichas } = userIds.length > 0
    ? await supabase
        .from("user_fichas")
        .select("user_id, balance")
        .in("user_id", userIds)
    : { data: [] };
  const balanceMap = new Map(
    (fichas ?? []).map((f) => [f.user_id, f.balance])
  );

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Users
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
          Comunidade
        </h1>
        <div className="mt-4 brand-divider" />
        <p className="mt-3 font-sans text-sm text-[var(--color-muted-foreground)]">
          {profiles?.length ?? 0} users mais recentes · clique em "Ajustar" pra mexer no saldo de fichas
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full">
          <thead className="border-b border-[var(--color-border)]">
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Saldo</Th>
              <Th>Cadastro</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => {
              const balance = balanceMap.get(p.id) ?? 0;
              return (
                <tr
                  key={p.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-background)]/30"
                >
                  <Td>
                    <div className="font-medium text-[var(--color-foreground)]">
                      {p.username ?? "—"}
                      {p.is_admin && (
                        <span className="ml-1.5 text-yellow-500">★</span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-[var(--color-muted-foreground)]">
                      {p.email ?? "—"}
                    </div>
                  </Td>
                  <Td>
                    <span className="rounded-md border border-[var(--color-border)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
                      {p.role}
                    </span>
                  </Td>
                  <Td>
                    <BehaviorBadge status={p.behavior_status} />
                  </Td>
                  <Td>
                    <span
                      className={`font-display text-lg ${
                        balance > 0 ? "text-emerald-400" : "text-white/40"
                      }`}
                    >
                      {balance}
                    </span>
                    <span className="ml-1 font-mono text-[10px] text-white/40 uppercase tracking-widest">
                      {balance === 1 ? "ficha" : "fichas"}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </Td>
                  <Td>
                    <AdjustFichasModal
                      userId={p.id}
                      username={p.username ?? p.email ?? "(sem nome)"}
                      currentBalance={balance}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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

function BehaviorBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "OK", cls: "border-emerald-500/40 text-emerald-400" },
    warned: { label: "Advertido", cls: "border-amber-500/40 text-amber-400" },
    suspended: { label: "Suspenso", cls: "border-amber-600/60 text-amber-500" },
    banned: { label: "Banido", cls: "border-red-500/60 text-red-400" },
  };
  const conf =
    map[status] ??
    { label: status, cls: "border-[var(--color-border)] text-[var(--color-muted-foreground)]" };
  return (
    <span
      className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${conf.cls}`}
    >
      {conf.label}
    </span>
  );
}
