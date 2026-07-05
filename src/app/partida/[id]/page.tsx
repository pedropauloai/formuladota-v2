import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { MatchPasswordCard } from "./match-password-card";
import { MatchRoomStatus } from "@/components/match/match-room-status";
import { DiscardMatchButton } from "@/components/match/discard-match-button";
import { FinalizeMatchButton } from "@/components/match/finalize-match-button";
import { UserHoverCard } from "@/components/profile/user-hover-card";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { MedalPair } from "@/components/ui/medal-pair";
import { rankTierToDotaRank } from "@/components/profile/career-stats";
import { getGatedTierForLevel, xpProgress, mmrFromRankTier } from "@/lib/levels";
import type { DotaRank } from "@/components/ui/dota-rank-medal";
import type { HonorRank } from "@/components/ui/honor-rank-medal";

export const dynamic = "force-dynamic";

// pos = ícone da função (public/dota/positions/pos-N.png); key = nome via i18n
// (namespace playMenu — fonte única dos nomes em toda a plataforma).
const ROLE_META: Record<string, { pos: string; key: string }> = {
  safelane: { pos: "1", key: "roleSafelane" },
  midlane: { pos: "2", key: "roleMidlane" },
  offlane: { pos: "3", key: "roleOfflane" },
  support: { pos: "4", key: "roleSupport" },
  support_dedicated: { pos: "5", key: "roleSupportDedicated" },
};
const ROLE_ORDER = ["safelane", "midlane", "offlane", "support", "support_dedicated"];

type RawPlayer = {
  user_id: string;
  team: "radiant" | "dire" | "spectator";
  role: string | null;
};

type MatchPlayer = {
  user_id: string;
  team: "radiant" | "dire" | "spectator";
  role: string | null;
  name: string;
  avatar: string | null;
  level: number;
  xpPct: number;
  dotaRank: DotaRank;
  honorRank: HonorRank;
  /** Ícone da função (pos-N) e nome já resolvido via i18n. */
  rolePos: string | null;
  roleName: string | null;
};

export default async function PartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("playMenu");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // URL canônica = dota_match_id (ID real da Valve, gravado pelo bot junto com o
  // steam_lobby_id). Resolve por ele primeiro; cai pra steam_lobby_id (legado) e,
  // se o param tem cara de UUID, pro id interno.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const cols = "id, name, password, status, game_mode, tier, created_by, dota_match_id, bot_error";
  let { data: lobby } = await supabase
    .from("lobbies")
    .select(cols)
    .eq("dota_match_id", id)
    .maybeSingle();
  if (!lobby) {
    ({ data: lobby } = await supabase
      .from("lobbies")
      .select(cols)
      .eq("steam_lobby_id", id)
      .maybeSingle());
  }
  if (!lobby && isUuid) {
    ({ data: lobby } = await supabase
      .from("lobbies")
      .select(cols)
      .eq("id", id)
      .maybeSingle());
  }

  if (!lobby) notFound();
  const lobbyUuid = lobby.id;

  // `role` é coluna nova (migration 059) — ainda não nos tipos gerados; cast no acesso.
  const lobbyPlayers = supabase.from("lobby_players") as unknown as {
    select: (q: string) => {
      eq: (c: string, v: string) => PromiseLike<{ data: RawPlayer[] | null }>;
    };
  };
  const { data: playersData } = await lobbyPlayers
    .select("user_id, team, role")
    .eq("lobby_id", lobbyUuid);
  const raw: RawPlayer[] = playersData ?? [];

  // Identidade (Steam) + nível/XP + rank Valve, tudo em batch (sem N+1). steam_links,
  // user_levels e user_stats_extended têm SELECT público; profiles é fallback de nome.
  const userIds = raw.map((p) => p.user_id);
  const steamById = new Map<string, { persona: string | null; avatar_url: string | null }>();
  const profById = new Map<string, { username: string | null; avatar_url: string | null }>();
  const levelById = new Map<string, { current_level: number; total_xp_earned: number }>();
  const careerById = new Map<string, { rankTier: number | null; leaderboardRank: number | null }>();
  if (userIds.length) {
    const [{ data: links }, { data: profs }, { data: levels }, { data: stats }] =
      await Promise.all([
        supabase.from("steam_links").select("user_id, persona, avatar_url").in("user_id", userIds),
        // View pública (Discord-first) em vez de `profiles` direto — a RLS de profiles
        // esconde username de não-admin (viravam "anônimo"). A view expõe só identidade.
        supabase.from("public_player_identities").select("id, username, avatar_url").in("id", userIds),
        supabase.from("user_levels").select("user_id, current_level, total_xp_earned").in("user_id", userIds),
        supabase.from("user_stats_extended").select("user_id, career").in("user_id", userIds),
      ]);
    for (const l of links ?? []) steamById.set(l.user_id, l);
    for (const pr of profs ?? []) profById.set(pr.id, pr);
    for (const lv of levels ?? []) levelById.set(lv.user_id, lv);
    for (const s of stats ?? []) {
      const c = (s.career ?? null) as { rankTier?: number | null; leaderboardRank?: number | null } | null;
      careerById.set(s.user_id, {
        rankTier: c?.rankTier ?? null,
        leaderboardRank: c?.leaderboardRank ?? null,
      });
    }
  }

  const players: MatchPlayer[] = raw.map((p) => {
    const sl = steamById.get(p.user_id);
    const pr = profById.get(p.user_id);
    const lv = levelById.get(p.user_id);
    const car = careerById.get(p.user_id) ?? { rankTier: null, leaderboardRank: null };
    const level = lv?.current_level ?? 1;
    const meta = p.role ? ROLE_META[p.role] : null;
    return {
      user_id: p.user_id,
      team: p.team,
      role: p.role,
      name: sl?.persona || pr?.username || "Jogador",
      avatar: sl?.avatar_url || pr?.avatar_url || null,
      level,
      xpPct: xpProgress(lv?.total_xp_earned ?? 0).pct,
      // Medalha SKILL = rank Valve real → fallback Herald. HONRA = nível (gated por rank).
      dotaRank: rankTierToDotaRank(car.rankTier, car.leaderboardRank) ?? "herald",
      honorRank: getGatedTierForLevel(level, mmrFromRankTier(car.rankTier)),
      rolePos: meta?.pos ?? null,
      roleName: meta ? t(meta.key) : null,
    };
  });

  // isAdmin (is_admin RPC). DESCARTAR = só admin.
  let isAdmin = false;
  if (user) {
    const adminRes = await supabase.rpc("is_admin" as never);
    isAdmin = (adminRes as { data?: unknown }).data === true;
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
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.25em] text-text-muted">
              Partida FormulaDota
            </p>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-text-display">
              {lobby.name}
            </h1>
            <p className="mt-1 font-body text-sm text-text-muted">
              Modo: {lobby.game_mode} · Status: {lobby.status}
            </p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 flex-col items-end gap-2">
              {/* Finalizar: só quando o bot já registrou o dota_match_id e ainda não fechou. */}
              {lobby.dota_match_id && lobby.status !== "completed" && (
                <FinalizeMatchButton lobbyId={lobbyUuid} />
              )}
              <DiscardMatchButton lobbyId={lobby.id} />
            </div>
          )}
        </header>

        {/* Enquanto o bot não criou a sala no Dota (status 'open' sem dota_match_id)
            OU deu erro: faixa de status com auto-refresh. Some quando a partida vai
            ao ar. Fix do "travou por completo" (2026-07-04). */}
        {(lobby.bot_error || (lobby.status === "open" && !lobby.dota_match_id)) && (
          <div className="mb-4">
            <MatchRoomStatus
              lobbyId={lobbyUuid}
              botError={(lobby.bot_error as string | null) ?? null}
            />
          </div>
        )}

        <div className="mb-6">
          <MatchPasswordCard password={lobby.password as string} />
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
        {players.map((p) => (
          <li
            key={p.user_id}
            className="flex items-center gap-3 rounded-sm border border-border-subtle bg-bg-surface px-3 py-2.5"
          >
            <UserHoverCard
              userId={p.user_id}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              {/* Avatar com anel de XP + badge de nível (centralizado embaixo). */}
              <XpAvatarRing
                src={p.avatar}
                alt={p.name}
                fallback={p.name.slice(0, 2).toUpperCase()}
                level={p.level}
                pct={p.xpPct}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-medium text-text-display">
                  {p.name}
                </p>
                {/* Função: ícone (pos-N) + nome correto via i18n. */}
                <span className="mt-0.5 flex items-center gap-1.5">
                  {p.rolePos && (
                    <Image
                      src={`/dota/positions/pos-${p.rolePos}.png`}
                      alt=""
                      width={16}
                      height={16}
                      className="size-4 shrink-0 object-contain"
                      aria-hidden="true"
                    />
                  )}
                  <span className="font-display text-xs uppercase tracking-wide text-text-muted">
                    {p.roleName ?? "—"}
                  </span>
                </span>
              </div>
            </UserHoverCard>
            {/* Par de medalhas SKILL + HONRA ao lado do nome. */}
            <MedalPair dotaRank={p.dotaRank} honorRank={p.honorRank} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}
