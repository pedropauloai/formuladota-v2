// Perfil público /perfil/[steamid64] — Phase 7 expandido.
// Server Component que une stats locais (player_season_mmr) + badges +
// stats externos (Stratz/OpenDota via fetchPlayerStats com fallback).
// Resilient a token ausente — placeholders quando sem dados externos.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TierBadge } from "@/components/dota/tier-badge";
import { ClientShell } from "@/components/client-shell/shell";
import { syncPlayerStats } from "@/app/perfil/actions";

interface PageProps {
  params: Promise<{ steamid: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Perfil ${params.steamid} — FORMULADOTA`,
  };
}

export default async function PerfilPublicoPage(props: PageProps) {
  const params = await props.params;
  const supabase = await createClient();

  const { data: steamLink } = await supabase
    .from("steam_links")
    .select("user_id, persona, avatar_url, verified_at")
    .eq("steam_id_64", params.steamid)
    .single();

  if (!steamLink) {
    notFound();
  }

  // Profile + season + mmr + badges + stats_extended (paralelo)
  const [
    { data: profile },
    { data: season },
    { data: userBadgesRaw },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url, role")
      .eq("id", steamLink.user_id)
      .single(),
    supabase
      .from("seasons")
      .select("id, name")
      .eq("active", true)
      .limit(1)
      .single(),
    supabase
      .from("user_badges")
      .select("badge_id, earned_at")
      .eq("user_id", steamLink.user_id)
      .order("earned_at", { ascending: false }),
  ]);

  // MMR season (se tem season ativa)
  let mmrRow: {
    mmr: number;
    vitorias: number;
    derrotas: number;
    partidas_total: number;
    last_match_at: string | null;
  } | null = null;
  if (season) {
    const { data } = await supabase
      .from("player_season_mmr")
      .select("mmr, vitorias, derrotas, partidas_total, last_match_at")
      .eq("user_id", steamLink.user_id)
      .eq("season_id", season.id)
      .single();
    mmrRow = data;
  }

  // Badges — JOIN manual: pega badge details pelas IDs
  const badgeIds = (userBadgesRaw ?? []).map((b) => b.badge_id);
  const { data: badgesData } =
    badgeIds.length > 0
      ? await supabase
          .from("badges")
          .select("id, name, description, icon_lucide, tier")
          .in("id", badgeIds)
      : { data: [] };
  const badgeMap = new Map(
    (badgesData ?? []).map((b) => [b.id, b])
  );
  const userBadges = (userBadgesRaw ?? [])
    .map((ub) => {
      const badge = badgeMap.get(ub.badge_id);
      if (!badge) return null;
      return { ...badge, earned_at: ub.earned_at };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  // Stats externos via cache user_stats_extended (TTL 24h). Falha silenciosa.
  const syncResult = await syncPlayerStats({
    userId: steamLink.user_id,
  }).catch(() => null);
  const externalStats = syncResult?.success ? syncResult.data : null;

  const winRate =
    mmrRow && mmrRow.partidas_total > 0
      ? Math.round((mmrRow.vitorias / mmrRow.partidas_total) * 100)
      : null;

  return (
    <ClientShell currentRoute="/perfil">
      <section className="relative h-[40vh] overflow-hidden border-b border-[var(--color-border)] bg-black/60">
        <div className="relative z-10 mx-auto flex max-w-5xl items-end gap-6 px-6 pb-8 pt-12 h-full">
          {(steamLink.avatar_url ?? profile?.avatar_url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={steamLink.avatar_url ?? profile?.avatar_url ?? ""}
              alt=""
              className="size-24 rounded-md border-2 border-[var(--color-brand-red)]"
            />
          ) : null}
          <div className="flex-1 min-w-0">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
              Perfil público
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase tracking-tight text-white truncate">
              {steamLink.persona ?? profile?.username ?? "Anônimo"}
            </h1>
            {mmrRow && <TierBadge mmr={mmrRow.mmr} size="lg" showName />}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 space-y-10">
        <Link
          href="/ranking"
          className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar ao ranking
        </Link>

        {/* Stats locais grid */}
        <section>
          <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
            Temporada atual
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="MMR atual" value={mmrRow?.mmr ?? "—"} />
            <StatCard label="Vitórias" value={mmrRow?.vitorias ?? 0} />
            <StatCard label="Derrotas" value={mmrRow?.derrotas ?? 0} />
            <StatCard
              label="Win rate"
              value={winRate !== null ? `${winRate}%` : "—"}
            />
          </div>
        </section>

        {/* Stats externos (Stratz/OpenDota) */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
              Stats expandidos
            </h2>
            {externalStats && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                Fonte: {externalStats.source}
              </span>
            )}
          </div>
          {externalStats ? (
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="KDA médio" value={externalStats.avgKDA.toFixed(2)} />
              <StatCard label="GPM médio" value={Math.round(externalStats.avgGPM)} />
              <StatCard label="XPM médio" value={Math.round(externalStats.avgXPM)} />
            </div>
          ) : (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-white/40">
                Sem stats externos disponíveis
              </p>
              <p className="mt-2 font-sans text-xs text-white/50">
                Configure STRATZ_API_KEY ou OPENDOTA_API_KEY no .env, ou perfil
                Steam não tem partidas públicas.
              </p>
            </div>
          )}
        </section>

        {/* Top heróis */}
        {externalStats && externalStats.topHeroes.length > 0 && (
          <section>
            <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
              Heróis mais jogados
            </h2>
            <div className="grid gap-3 md:grid-cols-5">
              {externalStats.topHeroes.map((h) => (
                <a
                  key={h.heroId}
                  href={`https://www.opendota.com/heroes/${h.heroId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:border-[var(--color-brand-red)]/60 transition-colors"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Herói #{h.heroId}
                  </p>
                  <p className="mt-2 font-display text-2xl text-white">
                    {h.winRate}%
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                    {h.wins}V / {h.matches - h.wins}D em {h.matches}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Badges */}
        <section>
          <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
            Badges conquistadas{" "}
            <span className="text-white/40">({userBadges.length})</span>
          </h2>
          {userBadges.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-4">
              {userBadges.map((b) => (
                <BadgeCard key={b.id} badge={b} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-white/10 bg-[var(--color-card)] p-6 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-white/40">
                Nenhuma badge ainda
              </p>
            </div>
          )}
        </section>

        {/* Identidades vinculadas */}
        <section>
          <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
            Identidades vinculadas
          </h2>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-md border border-[var(--color-brand-red)]/40 bg-[var(--color-card)] px-4 py-2 font-mono text-xs">
              Steam: {params.steamid}
            </span>
            <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 font-mono text-xs text-[var(--color-muted-foreground)]">
              Discord: {profile?.username ?? "—"}
            </span>
          </div>
        </section>
      </div>
    </ClientShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1">
      <p className="font-sans text-xs uppercase tracking-widest text-[var(--color-text-faded)]">
        {label}
      </p>
      <p className="font-display text-3xl text-[var(--color-foreground)]">
        {value}
      </p>
    </div>
  );
}

const TIER_COLOR: Record<number, string> = {
  1: "border-amber-700/40 from-amber-700/10",
  2: "border-slate-400/40 from-slate-400/10",
  3: "border-amber-400/50 from-amber-400/10",
  4: "border-fuchsia-400/50 from-fuchsia-400/10",
};

function BadgeCard({
  badge,
}: {
  badge: {
    id: string;
    name: string;
    description: string;
    icon_lucide: string;
    tier: number;
    earned_at: string | null;
  };
}) {
  // Lookup do icon Lucide pelo nome (string → component)
  const IconComponent =
    (Icons[badge.icon_lucide as keyof typeof Icons] as
      | React.ComponentType<{ size?: number; className?: string }>
      | undefined) ?? Icons.Trophy;
  const tierCls = TIER_COLOR[badge.tier] ?? TIER_COLOR[1];

  return (
    <div
      className={`rounded-md border bg-gradient-to-b ${tierCls} to-black/60 p-4 space-y-2`}
    >
      <div className="flex items-start justify-between">
        <IconComponent size={20} className="text-white" />
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
          T{badge.tier}
        </span>
      </div>
      <p className="font-display text-sm uppercase tracking-wide text-white">
        {badge.name}
      </p>
      <p className="font-sans text-[11px] text-white/60 leading-relaxed">
        {badge.description}
      </p>
      {badge.earned_at && (
        <p className="font-mono text-[9px] uppercase tracking-widest text-white/30">
          {new Date(badge.earned_at).toLocaleDateString("pt-BR")}
        </p>
      )}
    </div>
  );
}
