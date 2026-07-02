// Right Sidebar — coluna direita contextual (estilo cliente Dota 2). Repovoada com
// conteúdo REAL do sistema (Pedro 2026-07-02): últimas partidas, top do ranking,
// temporada e Mural da Vergonha — além de comunidade + doutrina. PROs/fila ficam
// SOMENTE no center (sem duplicação). Conteúdo é 100% público (visitante vê igual).
//
// Server Component ASYNC: fetcha via getSidebarData() e renderiza cards puros.

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  MessageSquare,
  BookOpen,
  History,
  Trophy,
  CalendarClock,
  Gavel,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSidebarData, type SidebarRankRow } from "@/lib/queries/sidebar";
import type { HistoryMatch } from "@/lib/queries/matches-feed";
import type { WallEntry } from "@/lib/queries/wall-of-shame";
import { getHeroById } from "@/lib/queries/heroes";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { DotaRankMedal } from "@/components/ui/dota-rank-medal";
import { mmrToDotaRank } from "@/components/queue/queue-helpers";
import { mmrToTier, IMMORTAL_FLOOR, IMMORTAL_LEADERBOARD_TOP } from "@/lib/mmr";

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";

interface Props {
  floating?: boolean;
  /** Feature flag: mostra o card "Boost de MMR / Ranked com PRO". Off = esconde. */
  showRankedComPro?: boolean;
}

export async function DashboardRightSidebar({ floating, showRankedComPro = false }: Props) {
  const t = await getTranslations("shell");
  const { recentMatches, topRanking, bans, season } = await getSidebarData();

  // pr-10 (2.5rem) = mesma margem direita do botão "Jogar Dota" (marginRight 2.5rem
  // no play-menu) → a borda direita dos cards alinha com a do botão (Pedro 2026-07-02).
  const wrapperCls = floating
    ? "flex w-full flex-col gap-3 py-3 pl-3 pr-10 overflow-y-auto"
    : "hidden lg:flex flex-col gap-3 bg-gradient-to-l from-black/70 via-black/40 to-transparent pl-4 pr-10 pt-4 pb-[80px] xl:pb-[96px] 2xl:pb-[112px] backdrop-blur-sm overflow-y-auto";

  return (
    <aside className={wrapperCls}>
      {/* Card "Boost de MMR / Ranked com PRO" — some quando a feature flag está off. */}
      {showRankedComPro && (
        <NewsCard
          eyebrow={t("newsEyebrow")}
          title={t("newsTitle")}
          description={t("newsDescription")}
          bg={HEROES_FULL_BG}
          href="/codigo-de-conduta"
          cta={t("newsCta")}
        />
      )}

      <RecentMatchesCard
        matches={recentMatches}
        title={t("sidebar.recentTitle")}
        cta={t("sidebar.recentCta")}
        empty={t("sidebar.recentEmpty")}
      />

      <RankingCard
        rows={topRanking}
        title={t("sidebar.rankingTitle")}
        cta={t("sidebar.rankingCta")}
        empty={t("sidebar.rankingEmpty")}
      />

      {season && (
        <SeasonCard
          name={season.name}
          daysLeftLabel={t("sidebar.seasonDaysLeft", { days: season.daysLeft })}
          title={t("sidebar.seasonTitle")}
          cta={t("sidebar.seasonCta")}
        />
      )}

      <MuralCard
        bans={bans}
        title={t("sidebar.muralTitle")}
        count={t("sidebar.muralCount", { count: bans.length })}
        cta={t("sidebar.muralCta")}
        empty={t("sidebar.muralEmpty")}
        bannedLabel={t("sidebar.banned")}
        suspendedLabel={t("sidebar.suspended")}
      />

      <article className="rounded-md border border-border-subtle bg-bg-elevated/80 backdrop-blur-sm overflow-hidden">
        <p className="border-b border-border-subtle px-3 py-2 font-display text-sm text-text-display">
          {t("community")}
        </p>
        <div className="space-y-1 p-2">
          <CommunityLink
            icon={MessageSquare}
            label={t("discordOfficial")}
            href="https://discord.com/invite/USntaFRS6x"
            external
          />
          <CommunityLink icon={BookOpen} label={t("codeOfConduct")} href="/codigo-de-conduta" />
        </div>
      </article>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Card: Últimas partidas — tira de heróis + placar, linka pro histórico. */
/* ------------------------------------------------------------------ */
function CardHeader({ icon: Icon, title }: { icon: typeof History; title: string }) {
  return (
    <p className="flex items-center gap-2 border-b border-border-subtle px-3 py-2 font-display text-sm text-text-display">
      <Icon size={14} className="text-brand-primary" aria-hidden="true" />
      {title}
    </p>
  );
}

function CardCta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block border-t border-border-subtle px-3 py-2 text-center font-body text-sm text-brand-primary transition-colors hover:bg-bg-elevated hover:text-text-display"
    >
      {label} →
    </Link>
  );
}

function HeroStrip({ match, team }: { match: HistoryMatch; team: "radiant" | "dire" }) {
  const heroes = match.players
    .filter((p) => p.team === team)
    .map((p) => (p.heroId ? getHeroById(p.heroId) : null));
  return (
    <span className={`flex items-center gap-0.5 ${team === "dire" ? "flex-row-reverse" : ""}`}>
      {heroes.slice(0, 5).map((h, i) =>
        h ? (
          <Image
            key={i}
            src={h.image_icon}
            alt={h.name_pt}
            width={16}
            height={16}
            unoptimized
            className="size-4 rounded-sm object-cover"
          />
        ) : (
          <span key={i} className="size-4 rounded-sm bg-bg-surface" aria-hidden="true" />
        )
      )}
    </span>
  );
}

function RecentMatchesCard({
  matches,
  title,
  cta,
  empty,
}: {
  matches: HistoryMatch[];
  title: string;
  cta: string;
  empty: string;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-bg-elevated/80 backdrop-blur-sm overflow-hidden">
      <CardHeader icon={History} title={title} />
      {matches.length === 0 ? (
        <p className="px-3 py-4 text-center font-body text-sm text-text-faded">{empty}</p>
      ) : (
        <ul className="divide-y divide-border-subtle/40">
          {matches.map((m) => (
            <li key={m.dotaMatchId}>
              <Link
                href={`/partida/historico/${m.dotaMatchId}`}
                className="flex items-center gap-1.5 px-3 py-2 transition-colors hover:bg-bg-elevated"
              >
                <span className="flex-1">
                  <HeroStrip match={m} team="radiant" />
                </span>
                <span className="flex shrink-0 items-center gap-1 font-display text-sm font-bold tabular-nums">
                  <span className={m.radiantWin ? "text-play-primary" : "text-text-muted"}>
                    {m.radiantScore ?? 0}
                  </span>
                  <span className="text-text-faded">:</span>
                  <span className={m.radiantWin === false ? "text-brand-primary" : "text-text-muted"}>
                    {m.direScore ?? 0}
                  </span>
                </span>
                <span className="flex flex-1 justify-end">
                  <HeroStrip match={m} team="dire" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CardCta href="/partidas" label={cta} />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Card: Top do ranking — pódio top 3 (avatar + medalha + nick + MMR).    */
/* ------------------------------------------------------------------ */
function RankingCard({
  rows,
  title,
  cta,
  empty,
}: {
  rows: SidebarRankRow[];
  title: string;
  cta: string;
  empty: string;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-bg-elevated/80 backdrop-blur-sm overflow-hidden">
      <CardHeader icon={Trophy} title={title} />
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-center font-body text-sm text-text-faded">{empty}</p>
      ) : (
        <ul className="divide-y divide-border-subtle/40">
          {rows.map((r, i) => (
            <li key={r.userId}>
              <Link
                href={`/perfil/u/${r.userId}`}
                className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-bg-elevated"
              >
                <span className="w-4 shrink-0 text-center font-display text-sm font-bold tabular-nums text-text-faded">
                  {i + 1}
                </span>
                <XpAvatarRing
                  src={r.avatar ?? undefined}
                  alt={r.name}
                  fallback={r.name.slice(0, 2).toUpperCase()}
                  level={r.level}
                  pct={0}
                  size={28}
                />
                <DotaRankMedal
                  rank={
                    r.mmr >= IMMORTAL_FLOOR && i + 1 <= IMMORTAL_LEADERBOARD_TOP
                      ? "immortal-leaderboard"
                      : mmrToDotaRank(r.mmr)
                  }
                  stars={mmrToTier(r.mmr).stars}
                  leaderboardNumber={
                    r.mmr >= IMMORTAL_FLOOR && i + 1 <= IMMORTAL_LEADERBOARD_TOP ? i + 1 : undefined
                  }
                  crown={i === 0 && r.mmr >= IMMORTAL_FLOOR}
                  variant="formuladota"
                  size="sm"
                  tooltip={false}
                  glow={r.mmr >= IMMORTAL_FLOOR}
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1 truncate font-body text-sm text-text-body">
                  {r.name}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-gold">{r.mmr}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CardCta href="/ranking" label={cta} />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Card: Temporada — nome + contagem regressiva pro fim.                 */
/* ------------------------------------------------------------------ */
function SeasonCard({
  name,
  daysLeftLabel,
  title,
  cta,
}: {
  name: string;
  daysLeftLabel: string;
  title: string;
  cta: string;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-bg-elevated/80 backdrop-blur-sm overflow-hidden">
      <CardHeader icon={CalendarClock} title={title} />
      <div className="px-3 py-3">
        <p className="font-display text-base leading-tight text-text-display">{name}</p>
        <p className="mt-1 font-display text-sm font-bold uppercase tracking-wide text-gold">
          {daysLeftLabel}
        </p>
      </div>
      {/* CTA leva pro guia do MMR (ponto de entrada pro /mmr, Pedro 2026-07-02). */}
      <CardCta href="/mmr" label={cta} />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Card: Mural da Vergonha — contagem + punição mais recente.            */
/* ------------------------------------------------------------------ */
function MuralCard({
  bans,
  title,
  count,
  cta,
  empty,
  bannedLabel,
  suspendedLabel,
}: {
  bans: WallEntry[];
  title: string;
  count: string;
  cta: string;
  empty: string;
  bannedLabel: string;
  suspendedLabel: string;
}) {
  return (
    <article className="rounded-md border border-error/30 bg-error/5 backdrop-blur-sm overflow-hidden">
      <p className="flex items-center gap-2 border-b border-error/25 px-3 py-2 font-display text-sm text-error">
        <Gavel size={14} aria-hidden="true" />
        {title}
      </p>
      {bans.length === 0 ? (
        <p className="px-3 py-4 text-center font-body text-sm text-text-faded">{empty}</p>
      ) : (
        <>
          <p className="px-3 pt-2 font-display text-sm font-bold tabular-nums text-error">{count}</p>
          <ul className="space-y-0.5 px-2 pb-1 pt-1">
            {bans.slice(0, 3).map((b) => (
              <li key={b.userId} className="flex items-center gap-2 rounded px-1 py-1">
                <span
                  className={`shrink-0 rounded-sm px-1 py-px font-display text-[0.6rem] font-bold uppercase tracking-wide ${
                    b.status === "banned"
                      ? "bg-error/20 text-error"
                      : "bg-warning/20 text-warning"
                  }`}
                >
                  {b.status === "banned" ? bannedLabel : suspendedLabel}
                </span>
                <span className="min-w-0 flex-1 truncate font-body text-sm text-text-body">
                  {b.username ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link
        href="/mural"
        className="block border-t border-error/25 px-3 py-2 text-center font-body text-sm text-error transition-colors hover:bg-error/10"
      >
        {cta} →
      </Link>
    </article>
  );
}

function NewsCard({
  eyebrow,
  title,
  description,
  bg,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bg: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-bg-elevated/80 overflow-hidden backdrop-blur-sm">
      <div
        className="relative h-32 overflow-hidden"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-body text-sm text-brand-primary">{eyebrow}</p>
          <p className="mt-1 font-display text-lg text-text-display drop-shadow-md leading-tight">
            {title}
          </p>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="font-sans text-sm leading-relaxed text-text-body">{description}</p>
        <Link
          href={href}
          className="inline-block font-body text-sm text-brand-primary hover:text-text-display transition-colors"
        >
          {cta} →
        </Link>
      </div>
    </article>
  );
}

function CommunityLink({
  icon: Icon,
  label,
  href,
  external,
}: {
  icon: typeof MessageSquare;
  label: string;
  href: string;
  external?: boolean;
}) {
  const cls =
    "flex items-center gap-2 rounded px-2 py-2 font-sans text-sm text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        <Icon size={14} aria-hidden="true" />
        {label}
        <span className="ml-auto text-sm text-text-faded">↗</span>
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}
