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
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import * as Icons from "lucide-react";
import { ArrowLeft, FileQuestion, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  displayName as identityDisplayName,
  displayAvatar as identityDisplayAvatar,
} from "@/lib/identity";
import { ClientShell } from "@/components/client-shell/shell";
import { syncPlayerStats } from "@/app/perfil/actions";
import { getCareerStats } from "@/lib/queries/career";
import { getHeroById } from "@/lib/queries/heroes";
import {
  rankTierToDotaRank,
  CareerIdentityInline,
  SignatureHeroesStrip,
} from "@/components/profile/career-stats";
import { HeroVideoBackdrop } from "@/components/dota/hero-video-backdrop";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import {
  AddFriendButton,
  type FriendButtonState,
} from "@/components/profile/add-friend-button";
import {
  DotaRankMedal,
  type DotaRank,
} from "@/components/ui/dota-rank-medal";
import {
  HonorRankMedal,
  legacyHonorToBand,
  type HonorRank,
} from "@/components/ui/honor-rank-medal";
import { EmptyState } from "@/components/ui/empty-state";

interface PageProps {
  params: Promise<{ steamid: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("perfil");
  return {
    title: t("publicMetaTitle", { steamid: params.steamid }),
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
  // RPC get_honor_tier ainda retorna o modelo antigo (8 tiers) — mapeia pras 6 bandas.
  return legacyHonorToBand(tierStr ?? "aprendiz");
}

export default async function PerfilPublicoPage(props: PageProps) {
  const params = await props.params;
  const t = await getTranslations("perfil");
  const supabase = await createClient();

  const { data: steamLink } = await supabase
    .from("steam_links")
    .select("user_id, persona, avatar_url, verified_at")
    .eq("steam_id_64", params.steamid)
    .single();

  if (!steamLink) {
    notFound();
  }

  // Estado do botão [ADICIONAR AMIGO] decidido server-side (pacote social
  // 2026-06-12 — missão 3): logado + não-próprio + relação atual do par.
  // RLS de friendships só retorna rows em que o viewer participa.
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  let friendButtonState: FriendButtonState | null = null;
  if (viewer && viewer.id !== steamLink.user_id) {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("status")
      .or(
        `and(requester_id.eq.${viewer.id},addressee_id.eq.${steamLink.user_id}),` +
          `and(requester_id.eq.${steamLink.user_id},addressee_id.eq.${viewer.id})`
      )
      .maybeSingle();
    if (!friendship) friendButtonState = "none";
    else if (friendship.status === "accepted") friendButtonState = "friends";
    else if (friendship.status === "pending") friendButtonState = "pending";
    // blocked → null (botão oculto)
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

  // Carreira OpenDota (cache 24h, nunca lança) — bloco "Carreira" + backdrop
  // do herói nº 1 no hero de identidade. userId = dono do perfil público.
  const career = await getCareerStats(steamLink.user_id);
  const careerTopHeroStat = career?.topHeroes[0] ?? null;
  const careerTopHero = careerTopHeroStat
    ? getHeroById(careerTopHeroStat.heroId)
    : null;

  const winRate =
    mmrRow && mmrRow.partidas_total > 0
      ? Math.round((mmrRow.vitorias / mmrRow.partidas_total) * 100)
      : null;

  // Identidade canônica via lib/identity (anti-anonimato: Steam > Discord).
  const identitySrc = {
    steamPersona: steamLink.persona,
    steamAvatar: steamLink.avatar_url,
    discordUsername: profile?.username,
    discordAvatar: profile?.avatar_url,
  };
  const displayName = identityDisplayName(identitySrc);
  const avatarSrc = identityDisplayAvatar(identitySrc) ?? undefined;
  // Medalha do hero: a Valve REAL da carreira (STRATZ/OpenDota) quando existe;
  // fallback pra derivada do MMR local — sem duplicar medalha no header.
  const careerRank = career
    ? rankTierToDotaRank(career.rankTier, career.leaderboardRank)
    : null;
  const dotaRank = careerRank ?? mmrToDotaRank(mmrRow?.mmr);
  const calibrationStatus =
    careerRank !== null || mmrRow ? "ranqueado" : "visitante";

  return (
    <ClientShell currentRoute="/perfil">
      {/* ----------------------------------------------------------------
          Hero — Identidade pública do PRO com avatar XL + medalhas duplas
          ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-bg-deep">
        {/* Herói nº 1 da carreira como backdrop VIVO — atmosfera, não compete
            com o nome (opacidade baixa + gradiente pro bg-bg-deep). */}
        {careerTopHero && (
          <HeroVideoBackdrop
            heroSlug={careerTopHero.slug}
            heroName={careerTopHero.name_pt}
            gradientClass="bg-gradient-to-b from-bg-deep/50 via-bg-deep/25 to-bg-deep"
          />
        )}
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 px-6 pt-12 pb-8 sm:flex-row sm:items-end">
          <UserAvatar
            src={avatarSrc}
            alt={t("avatarAlt", { name: displayName })}
            fallback={displayName.slice(0, 2).toUpperCase()}
            size="xl"
            ringColor={mmrRow ? "brand" : null}
          />

          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              {t("publicKicker")}
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase tracking-tight text-text-display truncate">
              {displayName}
            </h1>

            {/* Par canônico: SKILL + HONOR lado a lado — CARREIRA ENCAIXADA
                na MESMA linha (winrate GOLD + badge TOP), sem seção nova */}
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
              {career && (
                <CareerIdentityInline career={career} showMedal={false} />
              )}
            </div>
          </div>

          {/* Ação social — Adicionar → Pendente → Amigos (server decide o estado) */}
          {friendButtonState && (
            <div className="shrink-0 sm:self-end">
              <AddFriendButton
                targetUserId={steamLink.user_id}
                initialState={friendButtonState}
              />
            </div>
          )}
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 space-y-10">
        {/* Voltar — link textual leve (não é CTA primário) */}
        <Link
          href="/ranking"
          className="inline-flex items-center gap-2 font-sans text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t("backToRanking")}
        </Link>

        {/* ----------------------------------------------------------------
            Stats locais — temporada atual + VETERANIA de carreira encaixada
            como células extras na MESMA linha (xl = 7 colunas, uma linha só).
            Carreira NÃO tem mais seção própria empilhada (Pedro 2026-06-11).
            ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
            {t("currentSeason")}
            {career && (
              <span className="ml-2 normal-case tracking-normal text-text-faded">
                {t("careerVeterancySuffix")}
              </span>
            )}
          </h2>
          <div
            className={`grid gap-4 grid-cols-2 md:grid-cols-4 ${
              career ? "xl:grid-cols-7" : ""
            }`}
          >
            <StatCard label={t("statMmrAtual")} value={mmrRow?.mmr ?? "—"} />
            <StatCard label={t("statVitorias")} value={mmrRow?.vitorias ?? 0} />
            <StatCard label={t("statDerrotas")} value={mmrRow?.derrotas ?? 0} />
            <StatCard
              label={t("statWinRate")}
              value={winRate !== null ? `${winRate}%` : "—"}
            />
            {career && (
              <>
                <StatCard
                  label={t("statKills")}
                  value={career.totals.kills.toLocaleString("pt-BR")}
                  gold
                />
                <StatCard
                  label={t("statAssists")}
                  value={career.totals.assists.toLocaleString("pt-BR")}
                  gold
                />
                <StatCard
                  label={t("statLastHits")}
                  value={career.totals.lastHits.toLocaleString("pt-BR")}
                  gold
                />
              </>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------
            Stats externos — Stratz/OpenDota
            ---------------------------------------------------------------- */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
              {t("expandedStats")}
            </h2>
            {externalStats && (
              <span className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
                {t("sourceLabel", { source: externalStats.source })}
              </span>
            )}
          </div>
          {externalStats ? (
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label={t("statAvgKda")} value={externalStats.avgKDA.toFixed(2)} />
              <StatCard label={t("statAvgGpm")} value={Math.round(externalStats.avgGPM)} />
              <StatCard label={t("statAvgXpm")} value={Math.round(externalStats.avgXPM)} />
            </div>
          ) : (
            <Card variant="flat">
              <CardContent>
                <EmptyState
                  title={t("noExternalStatsTitle")}
                  description={t("noExternalStatsDesc")}
                  icon={<FileQuestion />}
                />
              </CardContent>
            </Card>
          )}
        </section>

        {/* ----------------------------------------------------------------
            Top heróis — área ÚNICA (sem duplicar com "Carreira"):
            com carreira → heróis de assinatura VIVOS (HeroVideo, top 3);
            sem carreira → fallback antigo com cards OpenDota.
            ---------------------------------------------------------------- */}
        {career && career.topHeroes.length > 0 ? (
          <section>
            <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
              {t("signatureHeroes")}
              <span className="ml-2 normal-case tracking-normal">
                {t("signatureHeroesSource", {
                  date: new Date(career.syncedAt).toLocaleDateString("pt-BR"),
                })}
              </span>
            </h2>
            <SignatureHeroesStrip career={career} className="flex-wrap" />
          </section>
        ) : externalStats && externalStats.topHeroes.length > 0 ? (
          <section>
            <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
              {t("mostPlayedHeroes")}
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
                        {t("heroNumber", { id: h.heroId })}
                      </p>
                      <p className="font-display text-2xl text-text-display">
                        {h.winRate}%
                      </p>
                      <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-muted">
                        {t("heroRecord", {
                          wins: h.wins,
                          losses: h.matches - h.wins,
                          matches: h.matches,
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------------------
            Badges conquistadas
            ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
            {t("badgesEarned")}{" "}
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
                  title={t("noBadgesTitle")}
                  description={t("noBadgesDesc")}
                  icon={<Trophy />}
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
            {t("linkedIdentities")}
          </h2>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-md border border-border-brand bg-bg-elevated px-4 py-2 font-mono text-sm 2xl:text-base text-text-display">
              {t("steamLabel", { value: params.steamid })}
            </span>
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-bg-elevated px-4 py-2 font-display text-sm 2xl:text-base font-semibold text-text-body">
              {t("discordLabel", { value: profile?.username ?? "—" })}
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

// `gold` pinta o valor com o token de valor/progresso (números de carreira).
function StatCard({
  label,
  value,
  gold,
}: {
  label: string;
  value: string | number;
  gold?: boolean;
}) {
  return (
    <Card variant="flat">
      <CardHeader>
        <CardTitle
          className={`font-sans text-sm uppercase tracking-widest font-normal ${
            gold ? "text-gold-muted" : "text-text-faded"
          }`}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`font-display-condensed text-3xl tabular-nums ${
            gold ? "text-gold" : "text-text-display"
          }`}
        >
          {value}
        </p>
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
        <p className="font-display text-sm 2xl:text-base font-semibold text-text-body leading-relaxed">
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
