// /admin/lobbies — lobbies ativos com bot status. Phase 8 H6.4.

import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Admin Lobbies — FORMULADOTA" };

export default async function AdminLobbiesPage() {
  const supabase = createServiceClient();
  const { data: lobbies } = await supabase
    .from("lobbies")
    .select("*")
    .in("status", ["pending", "open", "in_progress", "bot_unavailable"])
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Lobbies
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
          Ativos
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full">
          <thead className="border-b border-[var(--color-border)]">
            <tr>
              <Th>Nome</Th>
              <Th>Modo</Th>
              <Th>Status</Th>
              <Th>Steam Lobby</Th>
              <Th>Match ID</Th>
              <Th>Erro Bot</Th>
            </tr>
          </thead>
          <tbody>
            {(lobbies ?? []).map((l) => (
              <tr key={l.id} className="border-b border-[var(--color-border)] last:border-0">
                <Td>
                  <div className="font-medium text-[var(--color-foreground)]">{l.name}</div>
                  <div className="font-mono text-xs text-[var(--color-muted-foreground)]">
                    {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </Td>
                <Td>{l.game_mode}</Td>
                <Td><StatusBadge status={l.status} /></Td>
                <Td>
                  <span className="font-mono text-xs">{l.steam_lobby_id ?? "—"}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs">{l.dota_match_id ?? "—"}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-[var(--color-danger)]">
                    {l.bot_error?.slice(0, 60) ?? "—"}
                  </span>
                </Td>
              </tr>
            ))}
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-[var(--color-warning)]/40 text-[var(--color-warning)]",
    open: "border-[var(--color-success)]/40 text-[var(--color-success)]",
    in_progress: "border-[var(--color-brand-red)]/40 text-[var(--color-brand-red)]",
    bot_unavailable: "border-[var(--color-danger)]/60 text-[var(--color-danger)]",
  };
  const cls = map[status] ?? "border-[var(--color-border)] text-[var(--color-muted-foreground)]";
  return (
    <span className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${cls}`}>
      {status}
    </span>
  );
}
