// /admin/lobbies — lobbies ativos: select explícito (inclui league_id e status),
// ocupação por time (lobby_players agrupado), idade da sala e ação admin
// "Encerrar sala" (motivo obrigatório + audit log em ./actions.ts).
//
// Gate: layout /admin valida is_admin; revalidamos aqui (defesa em camadas).

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CloseLobbyModal } from "./close-lobby-modal";
import { AdminLobbiesLive } from "./live-refresh";

export const metadata = { title: "Admin Lobbies — FORMULADOTA" };
export const revalidate = 0;

interface TeamCounts {
  radiant: number;
  dire: number;
}

// Helper externo — isola Date.now() do contexto de render do component
// (mesmo padrão de /admin/users/[id]).
function getNowMs(): number {
  return Date.now();
}

/** Idade relativa da sala — "3d 4h", "2h 15m", "8m". */
function formatAge(createdAt: string, nowMs: number): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 60_000));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${rest}m`;
  return `${rest}m`;
}

export default async function AdminLobbiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) redirect("/dashboard");

  const t = await getTranslations("misc2");
  const service = createServiceClient();
  const { data: lobbies } = await service
    .from("lobbies")
    .select(
      "id, name, game_mode, tier, status, league_id, max_players, created_at, steam_lobby_id, dota_match_id, bot_error"
    )
    .in("status", ["pending", "open", "in_progress", "bot_unavailable"])
    .order("created_at", { ascending: false })
    .limit(50);

  // Ocupação por time — 1 query pra todos os lobbies listados, agregada em JS.
  const lobbyIds = (lobbies ?? []).map((l) => l.id);
  const { data: players } = lobbyIds.length
    ? await service
        .from("lobby_players")
        .select("lobby_id, team")
        .in("lobby_id", lobbyIds)
    : { data: [] };

  const countsByLobby = new Map<string, TeamCounts>();
  for (const p of players ?? []) {
    const c = countsByLobby.get(p.lobby_id) ?? { radiant: 0, dire: 0 };
    if (p.team === "radiant") c.radiant += 1;
    if (p.team === "dire") c.dire += 1;
    countsByLobby.set(p.lobby_id, c);
  }

  const nowMs = getNowMs();

  return (
    <div className="p-8 space-y-6">
      {/* Assina lobbies postgres_changes → router.refresh ao vivo (sem polling). */}
      <AdminLobbiesLive />
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Lobbies
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          {t("lobbiesActive")}
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      <Card variant="flat" className="overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-border-subtle">
            <tr>
              <Th>{t("colName")}</Th>
              <Th>{t("colMode")}</Th>
              <Th>Status</Th>
              <Th>{t("colLeague")}</Th>
              <Th>{t("colOccupancy")}</Th>
              <Th>{t("colAge")}</Th>
              <Th>Steam Lobby</Th>
              <Th>Match ID</Th>
              <Th>{t("colBotError")}</Th>
              <Th>{t("colActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {(lobbies ?? []).length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center font-mono text-sm text-text-faded">
                  {t("lobbiesEmpty")}
                </td>
              </tr>
            )}
            {(lobbies ?? []).map((l) => {
              const teamSize = Math.floor(l.max_players / 2);
              const counts = countsByLobby.get(l.id) ?? { radiant: 0, dire: 0 };
              return (
                <tr key={l.id} className="border-b border-border-subtle last:border-0">
                  <Td>
                    <div className="font-medium text-text-display">{l.name}</div>
                    <div className="font-display text-sm font-semibold text-text-body">
                      {new Date(l.created_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {l.tier === "elite" && (
                        <span className="ml-2 uppercase tracking-wide text-gold">elite</span>
                      )}
                    </div>
                  </Td>
                  <Td>{l.game_mode}</Td>
                  <Td>
                    <StatusBadge status={l.status} />
                  </Td>
                  <Td>
                    <span className="font-mono text-sm tabular-nums">
                      {l.league_id ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-sm tabular-nums text-gold whitespace-nowrap">
                      RAD {counts.radiant}/{teamSize} · DIRE {counts.dire}/{teamSize}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-sm tabular-nums">
                      {formatAge(l.created_at, nowMs)}
                    </span>
                  </Td>
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
                  <Td>
                    <CloseLobbyModal lobbyId={l.id} lobbyName={l.name} />
                  </Td>
                </tr>
              );
            })}
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
  return <td className="px-4 py-3 text-sm align-top">{children}</td>;
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
