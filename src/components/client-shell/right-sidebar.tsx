// Right Sidebar — coluna direita contextual (estilo cliente Dota 2). Repovoada com
// conteúdo REAL do sistema (Pedro 2026-07-02): últimas partidas, top do ranking,
// temporada e Mural da Vergonha — além de comunidade + doutrina. PROs/fila ficam
// SOMENTE no center (sem duplicação). Conteúdo é 100% público (visitante vê igual).
// Com a flag enquete_liga ligada, a enquete da Liga ocupa o lugar do Top do ranking.
// Desde 24/11/2026 (PPA): o primeiro card são as partidas que ele registra com o ID no painel da
// fila depois de jogar com a galera (party_participacoes), com o resultado e o placar que o cron
// resume no cache (store_owner_proof); o Mural só aparece com a fila competitiva (a liga) ligada.
//
// Server Component ASYNC: fetcha via getSidebarData() e renderiza cards puros.

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  MessageSquare,
  BookOpen,
  History,
  Swords,
  Trophy,
  Gavel,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { panel, textLink } from "@/components/v2";
import { getSidebarData, type SidebarRankRow } from "@/lib/queries/sidebar";
import type { WallEntry } from "@/lib/queries/wall-of-shame";
import { getOwnerProof } from "@/lib/loja/owner-proof";
import { getRegisteredPartyMatches, type RegisteredPartyMatch } from "@/lib/loja/fila/party-matches";
import type { PartyMatchSummary } from "@/lib/loja/fila/party-match";
import { UserAvatar } from "@/components/ui/avatar";
import { getHeroById } from "@/lib/queries/heroes";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { DotaRankMedal } from "@/components/ui/dota-rank-medal";
import { mmrToDotaRank } from "@/components/queue/queue-helpers";
import { mmrToTier, IMMORTAL_FLOOR, IMMORTAL_ELITE_TOP, IMMORTAL_LEADERBOARD_TOP } from "@/lib/mmr";
import { lerEnqueteDeQuemVe } from "@/lib/enquete/server";
import { CardHeader } from "./sidebar-card-header";
import { EnqueteLigaCard } from "./enquete-liga-card";

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";

interface Props {
  floating?: boolean;
  /** Feature flag: mostra o card "Boost de MMR / Ranked com PRO". Off = esconde. */
  showRankedComPro?: boolean;
  /** Feature flag enquete_liga: a enquete da Liga no lugar do Top do ranking. Off = o ranking volta. */
  showEnqueteLiga?: boolean;
  /** Admin efetivo (fora do "ver como usuário comum"): a enquete mostra também Talvez e Não. */
  isAdmin?: boolean;
  /** Flag fila_competitiva (a liga): o Mural da Vergonha só aparece com ela ligada. */
  showMural?: boolean;
}

export async function DashboardRightSidebar({
  floating,
  showRankedComPro = false,
  showEnqueteLiga = false,
  isAdmin = false,
  showMural = false,
}: Props) {
  const [t, locale] = await Promise.all([getTranslations("shell"), getLocale()]);
  // Com a enquete no lugar, o ranking nem é buscado; sem a liga, o Mural também não.
  const [{ topRanking, bans, season }, enquete, owner, partyMatches] = await Promise.all([
    getSidebarData({ ranking: !showEnqueteLiga, mural: showMural }),
    showEnqueteLiga ? lerEnqueteDeQuemVe(isAdmin) : Promise.resolve(null),
    getOwnerProof(),
    // Sem o banco, o card mostra o vazio em vez de derrubar a coluna.
    getRegisteredPartyMatches().catch((err: unknown) => {
      console.error("[sidebar] partidas da party:", err instanceof Error ? err.message : err);
      return [] as RegisteredPartyMatch[];
    }),
  ]);

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

      <PartyMatchesCard
        matches={partyMatches}
        summaries={owner?.partyMatches ?? []}
        locale={locale}
        title={t("sidebar.recentTitle")}
        empty={t("sidebar.recentEmpty")}
        won={t("sidebar.won")}
        lost={t("sidebar.lost")}
        withPlayers={(count) => t("sidebar.withPlayers", { count })}
      />

      {showEnqueteLiga ? (
        // Banco fora do ar: o card some em vez de mostrar número errado.
        enquete && <EnqueteLigaCard initial={enquete} />
      ) : (
        <RankingCard
          rows={topRanking}
          title={t("sidebar.rankingTitle")}
          cta={t("sidebar.rankingCta")}
          empty={t("sidebar.rankingEmpty")}
          seasonSubtitle={
            season
              ? season.daysLeft === null
                ? season.name
                : `${season.name} · ${t("sidebar.seasonDaysLeft", { days: season.daysLeft })}`
              : null
          }
        />
      )}

      {showMural && (
        <MuralCard
          bans={bans}
          title={t("sidebar.muralTitle")}
          count={t("sidebar.muralCount", { count: bans.length })}
          cta={t("sidebar.muralCta")}
          empty={t("sidebar.muralEmpty")}
          bannedLabel={t("sidebar.banned")}
          suspendedLabel={t("sidebar.suspended")}
        />
      )}

      <article className={cn(panel("neutral"), "overflow-hidden")}>
        <p className="border-b border-border-subtle px-3 py-2 font-display-condensed text-lg uppercase leading-none tracking-[0.06em] text-text-display">
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
/* Card: Últimas partidas do PPA — herói, resultado, KDA e quando foi.  */
/* ------------------------------------------------------------------ */
// O "ver mais" de todo card: o link de texto do kit, com a seta em ícone que anda no mouse.
function CardCta({ href, label, external }: { href: string; label: string; external?: boolean }) {
  const cls = cn(textLink, "flex justify-center border-t border-border-subtle px-3 py-2.5 hover:bg-bg-elevated");
  const icon = <ArrowRight size={14} aria-hidden="true" />;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {label}
        {icon}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
      {icon}
    </Link>
  );
}

const OPENDOTA = "https://www.opendota.com";

/** "há 3 h", "há 2 dias": a partir do fim da partida (ou da hora em que foi registrada), no idioma de quem vê. */
function sinceLabel(endedMs: number, locale: string, now: number): string {
  const minutes = Math.max(1, Math.round((now - endedMs) / 60_000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

function PartyMatchesCard({
  matches,
  summaries,
  locale,
  title,
  empty,
  won,
  lost,
  withPlayers,
}: {
  matches: RegisteredPartyMatch[];
  summaries: PartyMatchSummary[];
  locale: string;
  title: string;
  empty: string;
  won: string;
  lost: string;
  withPlayers: (count: number) => string;
}) {
  // Componente de servidor numa página dinâmica (lê cookie): a hora é a do pedido.
  const now = new Date().getTime();
  const byId = new Map(summaries.map((s) => [s.matchId, s]));
  return (
    <article className={cn(panel("neutral"), "overflow-hidden")}>
      <CardHeader icon={History} title={title} />
      {matches.length === 0 ? (
        <p className="px-3 py-4 text-center font-body text-sm text-text-faded">{empty}</p>
      ) : (
        <ul className="divide-y divide-border-subtle/40">
          {matches.map((m) => {
            const summary = byId.get(m.matchId);
            const hero = summary?.ppaHeroId ? getHeroById(summary.ppaHeroId) : null;
            const heroName = hero ? (locale === "pt" ? hero.name_pt : hero.name_en) : "";
            const ended = summary?.startTime ? (summary.startTime + summary.duration) * 1000 : Date.parse(m.playedAt);
            return (
              <li key={m.matchId}>
                <a
                  href={`${OPENDOTA}/matches/${m.matchId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-bg-elevated"
                >
                  {hero ? (
                    <Image src={hero.image_full} alt={heroName} width={48} height={27} unoptimized className="h-[27px] w-12 shrink-0 rounded-sm object-cover" />
                  ) : (
                    <span className="grid h-[27px] w-12 shrink-0 place-items-center rounded-sm bg-bg-surface text-text-faded" aria-hidden="true">
                      <Swords size={14} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center -space-x-1">
                      {m.players.slice(0, 4).map((p) => (
                        <UserAvatar key={p.userId} src={p.avatarUrl ?? undefined} alt={p.name} fallback={p.name.slice(0, 2)} size="xs" className="ring-1 ring-bg-base" />
                      ))}
                    </span>
                    <span className="mt-0.5 block truncate font-body text-xs text-text-faded">
                      {withPlayers(m.players.length)} · {sinceLabel(ended, locale, now)}
                    </span>
                  </span>
                  {summary && summary.won !== null && (
                    <span className="shrink-0 text-right">
                      <span className={cn("block font-display text-xs font-bold uppercase tracking-wide", summary.won ? "text-play-primary" : "text-brand-text")}>
                        {summary.won ? won : lost}
                      </span>
                      <span className="block font-body text-xs tabular-nums text-text-muted">
                        {summary.radiant === false ? `${summary.direScore}:${summary.radiantScore}` : `${summary.radiantScore}:${summary.direScore}`}
                      </span>
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

// Medalha do leaderboard (mesma regra do /ranking): #1–#10 escura, #11–#30 vermelha.
function sidebarRankMedal(mmr: number, position: number): ReturnType<typeof mmrToDotaRank> {
  if (mmr < IMMORTAL_FLOOR) return mmrToDotaRank(mmr);
  if (position <= IMMORTAL_ELITE_TOP) return "immortal-leaderboard";
  if (position <= IMMORTAL_LEADERBOARD_TOP) return "immortal-top-100";
  return mmrToDotaRank(mmr);
}

/* ------------------------------------------------------------------ */
/* Card: Top do ranking — pódio top 3 (avatar + medalha + nick + MMR).    */
/* ------------------------------------------------------------------ */
function RankingCard({
  rows,
  title,
  cta,
  empty,
  seasonSubtitle,
}: {
  rows: SidebarRankRow[];
  title: string;
  cta: string;
  empty: string;
  /** Nome da temporada + contagem regressiva — dobrado aqui (o ranking É o placar
   *  da season), no lugar do antigo card separado de "Temporada". */
  seasonSubtitle?: string | null;
}) {
  return (
    <article className={cn(panel("neutral"), "overflow-hidden")}>
      <CardHeader icon={Trophy} title={title} subtitle={seasonSubtitle} />
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-center font-body text-sm text-text-faded">{empty}</p>
      ) : (
        // Janela com altura fixa: o usuário rola a lista à vontade (scrollbar fina
        // vermelha global). ~5 linhas visíveis; o resto do top 15 vem ao rolar.
        <ul className="max-h-[200px] divide-y divide-border-subtle/40 overflow-y-auto">
          {rows.map((r, i) => (
            <RankRow key={r.userId} r={r} index={i} />
          ))}
        </ul>
      )}
      <CardCta href="/ranking" label={cta} />
    </article>
  );
}

// Uma linha do ranking (avatar+anel de XP, medalha, nick, MMR). Extraída só pra
// legibilidade. `index` = posição real (0-based) no top.
function RankRow({ r, index }: { r: SidebarRankRow; index: number }) {
  const pos = index + 1;
  return (
    <li>
      <Link
        href={`/perfil/u/${r.userId}`}
        className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-bg-elevated"
      >
        <span className="w-4 shrink-0 text-center font-display text-sm font-bold tabular-nums text-text-faded">
          {pos}
        </span>
        <XpAvatarRing
          src={r.avatar ?? undefined}
          alt={r.name}
          fallback={r.name.slice(0, 2).toUpperCase()}
          level={r.level}
          pct={r.xpPct}
          size={28}
        />
        <DotaRankMedal
          rank={sidebarRankMedal(r.mmr, pos)}
          stars={mmrToTier(r.mmr).stars}
          leaderboardNumber={
            r.mmr >= IMMORTAL_FLOOR && pos <= IMMORTAL_LEADERBOARD_TOP ? pos : undefined
          }
          variant="formuladota"
          size="md"
          tooltip={false}
          glow={r.mmr >= IMMORTAL_FLOOR}
          className="shrink-0"
        />
        <span className="min-w-0 flex-1 truncate font-body text-sm text-text-body">{r.name}</span>
        <span className="shrink-0 font-mono text-sm tabular-nums text-gold">{r.mmr}</span>
      </Link>
    </li>
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
    <article className={cn(panel("live"), "overflow-hidden")}>
      <p className="flex items-center gap-2 border-b border-error/25 px-3 py-2 font-display-condensed text-lg uppercase leading-none tracking-[0.06em] text-error">
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
        className="group flex items-center justify-center gap-1.5 border-t border-error/25 px-3 py-2 font-body text-sm text-error transition-colors hover:bg-error/10"
      >
        {cta}
        <ArrowRight size={14} aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-0.5" />
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
    <article className={cn(panel("neutral"), "overflow-hidden")}>
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
          className="group inline-flex items-center gap-1.5 font-body text-sm text-brand-primary hover:text-text-display transition-colors"
        >
          {cta}
          <ArrowRight size={14} aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-0.5" />
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
