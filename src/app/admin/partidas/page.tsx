// /admin/partidas — HISTÓRICO de partidas (read-only, auditoria).
// Lista TODAS as lobbies (qualquer status) com o máximo de dados: timestamps,
// modo/tier, steam_lobby_id, dota_match_id, e os jogadores (identidade Steam,
// role e time). Segue o padrão de /admin/lobbies (admin-gate + service client + tabela).

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";

export const metadata = { title: "Admin Partidas — FORMULADOTA" };
export const revalidate = 0;

const ROLE_POS: Record<string, string> = {
  safelane: "1",
  midlane: "2",
  offlane: "3",
  support: "4",
  support_dedicated: "5",
};

// Linha de lobby_players (role/team são colunas fora dos tipos gerados — cast no acesso).
type RawLobbyPlayer = {
  lobby_id: string;
  user_id: string;
  team: string | null;
  role: string | null;
};

function fmt(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminPartidasPage() {
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

  const service = createServiceClient();
  const { data: lobbies } = await service
    .from("lobbies")
    .select(
      "id, name, game_mode, tier, status, league_id, max_players, created_at, started_at, ended_at, steam_lobby_id, dota_match_id, bot_account_name, bot_error"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const lobbyIds = (lobbies ?? []).map((l) => l.id);

  // Jogadores de todas as partidas listadas (1 query). role/team fora dos tipos → cast.
  const lobbyPlayers = service.from("lobby_players") as unknown as {
    select: (q: string) => {
      in: (c: string, v: string[]) => PromiseLike<{ data: RawLobbyPlayer[] | null }>;
    };
  };
  const { data: playersData } = lobbyIds.length
    ? await lobbyPlayers.select("lobby_id, user_id, team, role").in("lobby_id", lobbyIds)
    : { data: [] as RawLobbyPlayer[] };
  const players: RawLobbyPlayer[] = playersData ?? [];

  // Identidade Steam (definitiva) + fallback username (Discord) por user_id.
  const userIds = [...new Set(players.map((p) => p.user_id))];
  const steamById = new Map<string, { persona: string | null; steam_id_64: string }>();
  const nameById = new Map<string, string | null>();
  if (userIds.length) {
    const [{ data: links }, { data: profs }] = await Promise.all([
      service.from("steam_links").select("user_id, persona, steam_id_64").in("user_id", userIds),
      service.from("profiles").select("id, username").in("id", userIds),
    ]);
    for (const l of links ?? []) steamById.set(l.user_id, l);
    for (const pr of profs ?? []) nameById.set(pr.id, pr.username);
  }

  const playersByLobby = new Map<string, RawLobbyPlayer[]>();
  for (const p of players) {
    const arr = playersByLobby.get(p.lobby_id) ?? [];
    arr.push(p);
    playersByLobby.set(p.lobby_id, arr);
  }

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Auditoria
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Histórico de partidas
        </h1>
        <p className="mt-2 font-body text-sm text-text-muted">
          Todas as partidas (lobbies), as 100 mais recentes. Somente leitura.
        </p>
        <div className="mt-4 brand-divider" />
      </header>

      <Card variant="flat" className="overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-border-subtle">
            <tr>
              <Th>Partida</Th>
              <Th>Status</Th>
              <Th>Modo / Tier</Th>
              <Th>Criada</Th>
              <Th>Início</Th>
              <Th>Fim</Th>
              <Th>Steam Lobby</Th>
              <Th>Match ID</Th>
              <Th>Jogadores</Th>
            </tr>
          </thead>
          <tbody>
            {(lobbies ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center font-mono text-sm text-text-faded">
                  Nenhuma partida registrada.
                </td>
              </tr>
            )}
            {(lobbies ?? []).map((l) => {
              const lps = (playersByLobby.get(l.id) ?? []).sort(
                (a, b) => (ROLE_POS[a.role ?? ""] ?? "9").localeCompare(ROLE_POS[b.role ?? ""] ?? "9")
              );
              return (
                <tr key={l.id} className="border-b border-border-subtle align-top last:border-0">
                  <Td>
                    <div className="font-medium text-text-display">{l.name}</div>
                    <div className="font-mono text-xs text-text-faded">{l.id}</div>
                    {l.bot_error && (
                      <div className="mt-1 font-mono text-xs text-error">{l.bot_error.slice(0, 80)}</div>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={l.status} />
                  </Td>
                  <Td>
                    <div className="text-sm">{l.game_mode}</div>
                    <div className="font-display text-xs uppercase tracking-wide text-text-faded">
                      {l.tier}
                      {l.league_id ? ` · liga ${l.league_id}` : ""}
                    </div>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs whitespace-nowrap">{fmt(l.created_at)}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs whitespace-nowrap">{fmt(l.started_at)}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs whitespace-nowrap">{fmt(l.ended_at)}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">{l.steam_lobby_id ?? "—"}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">{l.dota_match_id ?? "—"}</span>
                  </Td>
                  <Td>
                    {lps.length === 0 ? (
                      <span className="font-mono text-xs text-text-faded">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {lps.map((p) => {
                          const sl = steamById.get(p.user_id);
                          const name = sl?.persona || nameById.get(p.user_id) || "Jogador";
                          return (
                            <li key={p.user_id} className="whitespace-nowrap text-xs">
                              <span className="font-display text-text-faded">
                                {ROLE_POS[p.role ?? ""] ?? "-"}
                              </span>{" "}
                              <span className="text-text-body">{name}</span>{" "}
                              <span className="font-mono text-text-faded">
                                {sl?.steam_id_64 ?? "sem-steam"}
                              </span>{" "}
                              <span
                                className={
                                  p.team === "radiant"
                                    ? "text-[#00C466]"
                                    : p.team === "dire"
                                      ? "text-brand-primary"
                                      : "text-text-faded"
                                }
                              >
                                {p.team ?? "—"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
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
    completed: "default",
    cancelled: "secondary",
    bot_unavailable: "error",
  };
  const variant = map[status] ?? "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
