// /admin/users — lista users com filtros. Phase 8 H6.2.

import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { TierBadge } from "@/components/dota/tier-badge";

export const metadata: Metadata = { title: "Admin Users — FORMULADOTA" };

export default async function AdminUsersPage() {
  const supabase = createServiceClient();

  // 100 users mais recentes
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, email, role, behavior_status, created_at, is_admin")
    .order("created_at", { ascending: false })
    .limit(100);

  // Subscription status por user (batch)
  const userIds = (profiles ?? []).map((p) => p.id);
  const { data: subs } = userIds.length > 0
    ? await supabase
        .from("subscriptions")
        .select("user_id, status")
        .in("user_id", userIds)
        .in("status", ["authorized", "pending", "cancelled"])
    : { data: [] };
  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s.status]));

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
          {profiles?.length ?? 0} users mais recentes
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full">
          <thead className="border-b border-[var(--color-border)]">
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Mensalidade</Th>
              <Th>Cadastro</Th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-background)]/30">
                <Td>
                  <div className="font-medium text-[var(--color-foreground)]">{p.username ?? "—"}</div>
                  <div className="font-mono text-xs text-[var(--color-muted-foreground)]">{p.email ?? "—"}</div>
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
                  <SubBadge status={subMap.get(p.id) ?? null} />
                </Td>
                <Td>
                  <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--color-text-faded)]">TierBadge V2 — quando MMR estiver presente, exibir <TierBadge mmr={1000} size="sm" /></p>
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
    ok: { label: "OK", cls: "border-[var(--color-success)]/40 text-[var(--color-success)]" },
    warned: { label: "Advertido", cls: "border-[var(--color-warning)]/40 text-[var(--color-warning)]" },
    suspended: { label: "Suspenso", cls: "border-[var(--color-warning)]/60 text-[var(--color-warning)]" },
    banned: { label: "Banido", cls: "border-[var(--color-danger)]/60 text-[var(--color-danger)]" },
  };
  const conf = map[status] ?? { label: status, cls: "border-[var(--color-border)] text-[var(--color-muted-foreground)]" };
  return (
    <span className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${conf.cls}`}>
      {conf.label}
    </span>
  );
}

function SubBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="font-mono text-xs text-[var(--color-text-faded)]">—</span>;
  }
  const map: Record<string, { label: string; cls: string }> = {
    authorized: { label: "Ativa", cls: "border-[var(--color-success)]/40 text-[var(--color-success)]" },
    pending: { label: "Pendente", cls: "border-[var(--color-warning)]/40 text-[var(--color-warning)]" },
    cancelled: { label: "Cancelada", cls: "border-[var(--color-border)] text-[var(--color-muted-foreground)]" },
  };
  const conf = map[status] ?? { label: status, cls: "border-[var(--color-border)] text-[var(--color-muted-foreground)]" };
  return (
    <span className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${conf.cls}`}>
      {conf.label}
    </span>
  );
}
