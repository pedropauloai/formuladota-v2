// /admin/lobbies — lobbies ativos com bot status. Phase 8 H6.4.

import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";

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
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Lobbies
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Ativos
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      <Card variant="flat" className="overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-border-subtle">
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
              <tr key={l.id} className="border-b border-border-subtle last:border-0">
                <Td>
                  <div className="font-medium text-text-display">{l.name}</div>
                  <div className="font-display text-sm font-semibold text-text-body">
                    {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </Td>
                <Td>{l.game_mode}</Td>
                <Td><StatusBadge status={l.status} /></Td>
                <Td>
                  <span className="font-mono text-sm">{l.steam_lobby_id ?? "—"}</span>
                </Td>
                <Td>
                  <span className="font-mono text-sm">{l.dota_match_id ?? "—"}</span>
                </Td>
                <Td>
                  <span className="font-mono text-sm text-error">
                    {l.bot_error?.slice(0, 60) ?? "—"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm">{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeProps["variant"]> = {
    pending: "warning",
    open: "success",
    in_progress: "default",
    bot_unavailable: "error",
  };
  const variant = map[status] ?? "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
