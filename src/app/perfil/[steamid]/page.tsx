// Perfil público /perfil/[steamid64] — Phase 7 expandido.
// Server Component que une stats locais (player_season_mmr) + badges +
// stats externos (Stratz/OpenDota via fetchPlayerStats com fallback).
// Resilient a token ausente — placeholders quando sem dados externos.
//
// Refatorado para Design System V2.5 (Wave 8 — 2026-05-24):
//   - <UserAvatar> + <DotaRankMedal> + <HonorRankMedal> no hero
//   - <Card>/<CardContent> em vez de divs com CSS vars legacy
//   - <Button asLink> via wrapping em <Link> para "Voltar ao ranking"
//   - <EmptyState> para "sem stats" e "sem badges"
//   - Tokens semânticos: text-text-display/body/muted/faded, bg-bg-base/elevated, border-border-*

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { ArrowLeft, FileQuestion, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { syncPlayerStats } from "@/app/perfil/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DotaRankMedal,
  type DotaRank,
} from "@/components/ui/dota-rank-medal";
import {
  HonorRankMedal,
  type HonorRank,
} from "@/components/ui/honor-rank-medal";
import { EmptyState } from "@/components/ui/empty-state";

interface PageProps {
  params: Promise<{ steamid: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Perfil ${params.steamid} — FORMULADOTA`,
  };
}

// Helper — converte MMR Valve em DotaRank V2.5 (mesma escala do exemplar /coaches/[slug])
function mmrToDotaRank(mmr: number | null | undefined): DotaRank {
  if (mmr == null) return "herald";
  if (mmr >= 9000) return "immortal-top-100";
  if (mmr >= 6000) return "immortal";
  if (mmr >= 5000) return "divine";
  if (mmr >= 4000) return "ancient";
  if (mmr >= 3000) return "legend";
  if (mmr >= 2000) return "archon";
  if (mmr >= 1500) return "crusader";
  if (mmr >= 770) return "guardian";
  return "herald";
}

// Helper — string do RPC get_honor_tier → HonorRank tipado
function toHonorRank(tierStr: string | null | undefined): HonorRank {
  const allowed: HonorRank[] = [
    "aprendiz",
    "disciplinado",
    "confiavel",
    "respeitado",
    "honrado",
    "mestre",
    "lendario",
    "imortal-da-formula",
  ];
  const found = allowed.find((t) => t === tierStr);
  return found ?? "aprendiz";
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

  // HONOR público — RPC + graceful fallback
  const { data: honorScore } = await supabase.rpc("get_honor_score", {
    p_user_id: steamLink.user_id,
  });
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 1000,
  });
  const honorRank = toHonorRank(honorTierStr);

  // Stats externos via cache user_stats_extended (TTL 24h). Falha silenciosa.
  const syncResult = await syncPlayerStats({
    userId: steamLink.user_id,
  }).catch(() => null);
  const externalStats = syncResult?.success ? syncResult.data : null;

  const winRate =
    mmrRow && mmrRow.partidas_total > 0
      ? Math.round((mmrRow.vitorias / mmrRow.partidas_total) * 100)
      : null;

  const displayName = steamLink.persona ?? profile?.username ?? "Anônimo";
  const avatarSrc = steamLink.avatar_url ?? profile?.avatar_url ?? undefined;
  const dotaRank = mmrToDotaRank(mmrRow?.mmr);
  const calibrationStatus = mmrRow ? "ranqueado" : "visitante";

  return (
    <ClientShell currentRoute="/perfil">
      {/* ----------------------------------------------------------------
          Hero — Identidade pública do PRO com avatar XL + medalhas duplas
          ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-bg-deep">
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 px-6 pt-12 pb-8 sm:flex-row sm:items-end">
          <UserAvatar
            src={avatarSrc}
            alt={`Avatar de ${displayName}`}
            fallback={displayName.slice(0, 2).toUpperCase()}
            size="xl"
            ringColor={mmrRow ? "brand" : null}
          />

          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              Perfil público
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase tracking-tight text-text-display truncate">
              {displayName}
            </h1>

            {/* Par canônico: SKILL + HONOR lado a lado */}
            <div className="mt-3 flex flex-wrap items-center gap-6">
              <DotaRankMedal
                rank={dotaRank}
                size="md"
                showLabel
                glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
                calibrationStatus={calibrationStatus}
              />
              <HonorRankMedal
                rank={honorRank}
                size="md"
                showLabel
                calibrationStatus={mmrRow ? "ranqueado" : "visitante"}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 space-y-10">
        {/* Voltar — link textual leve (não é CTA primário) */}
        <Link
          href="/ranking"
          className="inline-flex items-center gap-2 font-sans text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar ao ranking
        </Link>

        {/* ----------------------------------------------------------------
            Stats locais — temporada atual
            ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
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

        {/* ----------------------------------------------------------------
            Stats externos — Stratz/OpenDota
            ---------------------------------------------------------------- */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
              Stats expandidos
            </h2>
            {externalStats && (
              <span className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
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
            <Card variant="flat">
              <CardContent>
                <EmptyState
                  title="Sem stats externos disponíveis"
                  description="Configure STRATZ_API_KEY ou OPENDOTA_API_KEY no .env, ou perfil Steam não tem partidas públicas."
                  icon={FileQuestion}
                />
              </CardContent>
            </Card>
          )}
        </section>

        {/* ----------------------------------------------------------------
            Top heróis — links externos OpenDota
            ---------------------------------------------------------------- */}
        {externalStats && externalStats.topHeroes.length > 0 && (
          <section>
            <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
              Heróis mais jogados
            </h2>
            <div className="grid gap-3 md:grid-cols-5">
              {externalStats.topHeroes.map((h) => (
                <a
                  key={h.heroId}
                  href={`https://www.opendota.com/heroes/${h.heroId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card variant="interactive">
                    <CardContent className="space-y-1">
                      <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
                        Herói #{h.heroId}
                      </p>
                      <p className="font-display text-2xl text-text-display">
                        {h.winRate}%
                      </p>
                      <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-muted">
                        {h.wins}V / {h.matches - h.wins}D em {h.matches}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------------
            Badges conquistadas
            ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
            Badges conquistadas{" "}
            <span className="text-text-faded">({userBadges.length})</span>
          </h2>
          {userBadges.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-4">
              {userBadges.map((b) => (
                <BadgeCard key={b.id} badge={b} />
              ))}
            </div>
          ) : (
            <Card variant="flat" className="border-dashed">
              <CardContent>
                <EmptyState
                  title="Nenhuma badge ainda"
                  description="Jogue partidas e demonstre conduta para conquistar badges."
                  icon={Trophy}
                />
              </CardContent>
            </Card>
          )}
        </section>

        {/* ----------------------------------------------------------------
            Identidades vinculadas — Steam + Discord como cards compactos
            ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
            Identidades vinculadas
          </h2>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-md border border-border-brand bg-bg-elevated px-4 py-2 font-mono text-sm text-text-display">
              Steam: {params.steamid}
            </span>
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-bg-elevated px-4 py-2 font-display text-sm font-semibold text-text-body">
              Discord: {profile?.username ?? "—"}
            </span>
          </div>
        </section>
      </div>
    </ClientShell>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes locais — usam primitives V2.5
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant="flat">
      <CardHeader>
        <CardTitle className="font-sans text-sm uppercase tracking-widest text-text-faded font-normal">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl text-text-display">{value}</p>
      </CardContent>
    </Card>
  );
}

// Cor por tier de badge — gradiente sutil. Mantém esquema cromático original
// (bronze → prata → ouro → fucsia) porém em tokens utilitários Tailwind.
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

  // Card flat com borda customizada por tier + gradiente leve
  return (
    <Card
      variant="flat"
      className={`bg-gradient-to-b ${tierCls} to-bg-deep/60`}
    >
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between">
          <IconComponent size={20} className="text-text-display" />
          <span className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
            T{badge.tier}
          </span>
        </div>
        <p className="font-display text-sm uppercase tracking-wide text-text-display">
          {badge.name}
        </p>
        <p className="font-display text-sm font-semibold text-text-body leading-relaxed">
          {badge.description}
        </p>
        {badge.earned_at && (
          <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
            {new Date(badge.earned_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
