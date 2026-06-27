import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { MatchPasswordCard } from "./match-password-card";

export const dynamic = "force-dynamic";

const ROLE_META: Record<string, { pos: string; name: string }> = {
  safelane: { pos: "1", name: "Hard Carry" },
  midlane: { pos: "2", name: "Meio" },
  offlane: { pos: "3", name: "Offlane" },
  support: { pos: "4", name: "Suporte" },
  support_dedicated: { pos: "5", name: "Suporte Total" },
};
const ROLE_ORDER = ["safelane", "midlane", "offlane", "support", "support_dedicated"];

type ProfileEmbed = { username: string | null; avatar_url: string | null };
type MatchPlayer = {
  user_id: string;
  team: "radiant" | "dire" | "spectator";
  role: string | null;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

function prof(p: MatchPlayer): ProfileEmbed | null {
  if (!p.profiles) return null;
  return Array.isArray(p.profiles) ? (p.profiles[0] ?? null) : p.profiles;
}

export default async function PartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("id, name, password, status, game_mode, tier, created_by")
    .eq("id", id)
    .maybeSingle();

  if (!lobby) notFound();

  // `role` é coluna nova (migration 059) — ainda não nos tipos gerados; cast no acesso.
  const lobbyPlayers = supabase.from("lobby_players") as unknown as {
    select: (q: string) => {
      eq: (c: string, v: string) => PromiseLike<{ data: MatchPlayer[] | null }>;
    };
  };
  const { data: playersData } = await lobbyPlayers
    .select("user_id, team, role, profiles(username, avatar_url)")
    .eq("lobby_id", id);
  const players: MatchPlayer[] = playersData ?? [];

  // canEdit: criador da sala ou admin
  let canEdit = !!user && user.id === (lobby.created_by as string);
  if (user && !canEdit) {
    const adminRes = await supabase.rpc("is_admin" as never);
    canEdit = (adminRes as { data?: unknown }).data === true;
  }

  const teamOf = (team: "radiant" | "dire") =>
    players
      .filter((p) => p.team === team)
      .sort(
        (a, b) =>
          ROLE_ORDER.indexOf(a.role ?? "z") - ROLE_ORDER.indexOf(b.role ?? "z")
      );

  return (
    <ClientShell currentRoute={`/partida/${id}`}>
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="mb-6">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-text-muted">
            Partida FormulaDota
          </p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-text-display">
            {lobby.name}
          </h1>
          <p className="mt-1 font-body text-sm text-text-muted">
            Modo: {lobby.game_mode} · Status: {lobby.status}
          </p>
        </header>

        <div className="mb-6">
          <MatchPasswordCard
            lobbyId={lobby.id}
            initialPassword={lobby.password as string}
            canEdit={canEdit}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TeamColumn title="Iluminados" accent="text-[#00C466]" players={teamOf("radiant")} />
          <TeamColumn title="Temidos" accent="text-brand-primary" players={teamOf("dire")} />
        </div>
      </div>
    </ClientShell>
  );
}

function TeamColumn({
  title,
  accent,
  players,
}: {
  title: string;
  accent: string;
  players: MatchPlayer[];
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-4">
      <h2 className={`mb-3 font-display text-lg font-bold uppercase tracking-wide ${accent}`}>
        {title}
      </h2>
      <ul className="space-y-2">
        {players.length === 0 && (
          <li className="font-body text-sm text-text-muted">Sem jogadores ainda.</li>
        )}
        {players.map((p) => {
          const meta = p.role ? ROLE_META[p.role] : null;
          const info = prof(p);
          return (
            <li
              key={p.user_id}
              className="flex items-center gap-3 rounded-sm border border-border-subtle bg-bg-surface px-3 py-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-bg-elevated font-display text-sm font-bold text-text-muted">
                {meta?.pos ?? "-"}
              </span>
              {info?.avatar_url ? (
                <Image
                  src={info.avatar_url}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 rounded-sm object-cover"
                  unoptimized
                />
              ) : (
                <span className="size-7 rounded-sm bg-bg-elevated" aria-hidden="true" />
              )}
              <span className="flex-1 truncate font-body text-sm text-text-body">
                {info?.username ?? "Jogador"}
              </span>
              <span className="font-display text-xs uppercase tracking-wide text-text-muted">
                {meta?.name ?? "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
