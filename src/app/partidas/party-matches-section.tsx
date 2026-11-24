// As partidas que o PPA registra com o ID no painel da fila, com o resumo que o cron guarda do
// OpenDota (store_owner_proof): a página só lê o banco, nunca chama o OpenDota na visita.

import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ExternalLink, Swords } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { panel, textLink } from "@/components/v2";
import { UserAvatar } from "@/components/ui/avatar";
import { getHeroById } from "@/lib/queries/heroes";
import { getOwnerProof } from "@/lib/loja/owner-proof";
import { getRegisteredPartyMatches, type RegisteredPartyMatch } from "@/lib/loja/fila/party-matches";
import type { PartyMatchSummary } from "@/lib/loja/fila/party-match";

const OPENDOTA = "https://www.opendota.com";
// Herói, resultado, duração, quando, quem jogou e o link: as colunas do histórico do cliente do Dota.
const COLUMNS = "md:grid md:grid-cols-[112px_132px_80px_120px_minmax(0,1fr)_auto] md:gap-x-5";

type T = Awaited<ReturnType<typeof getTranslations>>;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// O placar do lado da party primeiro.
const score = (s: PartyMatchSummary) => (s.radiant === false ? `${s.direScore}:${s.radiantScore}` : `${s.radiantScore}:${s.direScore}`);

async function loadMatches(): Promise<RegisteredPartyMatch[]> {
  try {
    return await getRegisteredPartyMatches();
  } catch (err) {
    // Sem o banco, a página mostra o vazio em vez de cair.
    console.error("[partidas] partidas da party:", err instanceof Error ? err.message : err);
    return [];
  }
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display-condensed text-[2.6rem] leading-none tabular-nums text-gold">{value}</dd>
      <dd className="mt-1 font-display text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</dd>
    </div>
  );
}

function Result({ summary, t }: { summary: PartyMatchSummary | undefined; t: T }) {
  if (!summary) return <span className="font-body text-xs text-text-faded">{t("partyPending")}</span>;
  if (summary.won === null) return <span className="font-body text-xs text-text-faded">{t("partyNoResult")}</span>;
  return (
    <span>
      <span className={cn("block font-display text-sm font-bold uppercase tracking-[0.08em]", summary.won ? "text-play-primary" : "text-brand-text")}>
        {summary.won ? t("partyWon") : t("partyLost")}
      </span>
      <span className="block font-body text-xs tabular-nums text-text-muted">{score(summary)}</span>
    </span>
  );
}

function Players({ players, locale }: { players: RegisteredPartyMatch["players"]; locale: string }) {
  const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(players.map((p) => p.name));
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex shrink-0 -space-x-1.5">
        {players.slice(0, 5).map((p) => (
          <Link key={p.userId} href={`/perfil/u/${p.userId}`} title={p.name} className="rounded-sm focus-visible:outline-2 focus-visible:outline-text-display">
            <UserAvatar src={p.avatarUrl ?? undefined} alt={p.name} fallback={p.name.slice(0, 2)} size="sm" className="ring-2 ring-bg-base" />
          </Link>
        ))}
      </span>
      <span className="line-clamp-2 min-w-0 font-body text-sm text-text-body">{names}</span>
    </span>
  );
}

function MatchRow({ match, summary, locale, t }: { match: RegisteredPartyMatch; summary: PartyMatchSummary | undefined; locale: string; t: T }) {
  const hero = summary?.ppaHeroId ? getHeroById(summary.ppaHeroId) : null;
  const heroName = hero ? (locale === "pt" ? hero.name_pt : hero.name_en) : t("partyHeroUnknown");
  const at = summary?.startTime ? new Date(summary.startTime * 1000) : new Date(match.playedAt);
  const when = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-bg-elevated/60", COLUMNS)}>
      {hero ? (
        <Image src={hero.image_full} alt={heroName} width={80} height={45} unoptimized className="h-[45px] w-20 shrink-0 rounded-sm object-cover" />
      ) : (
        <span role="img" aria-label={heroName} className="grid h-[45px] w-20 shrink-0 place-items-center rounded-sm bg-bg-surface text-text-faded">
          <Swords size={18} aria-hidden="true" />
        </span>
      )}
      <Result summary={summary} t={t} />
      <span className="font-body text-sm tabular-nums text-text-muted">
        <span className="sr-only">{t("partyColDuration")}: </span>
        {summary ? clock(summary.duration) : "-"}
      </span>
      <time dateTime={at.toISOString()} className="font-body text-sm tabular-nums text-text-muted">
        {when.format(at)}
      </time>
      <Players players={match.players} locale={locale} />
      <a
        href={`${OPENDOTA}/matches/${match.matchId}`}
        target="_blank"
        rel="noreferrer"
        aria-label={t("partyOpenDotaAria", { id: match.matchId })}
        className={cn(textLink, "justify-self-end")}
      >
        {t("partyOpenDota")}
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </li>
  );
}

export async function PartyMatchesSection() {
  const [t, locale, matches, owner] = await Promise.all([getTranslations("matchesFeed"), getLocale(), loadMatches(), getOwnerProof()]);
  const byId = new Map((owner?.partyMatches ?? []).map((s) => [s.matchId, s]));
  const wins = matches.filter((m) => byId.get(m.matchId)?.won === true).length;
  const players = new Set(matches.flatMap((m) => m.players.map((p) => p.userId))).size;

  return (
    <section aria-labelledby="partidas-com-a-galera" className="space-y-5 md:space-y-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 id="partidas-com-a-galera" className="font-display-condensed text-[3rem] uppercase leading-[0.85] text-text-display md:text-[4.2rem]">
            {t("partyTitle")}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-text-body">{t("partySubtitle")}</p>
        </div>
        {matches.length > 0 && (
          <dl className="flex shrink-0 gap-8">
            <Stat value={matches.length} label={t("partyStatMatches", { count: matches.length })} />
            <Stat value={wins} label={t("partyStatWins", { count: wins })} />
            <Stat value={players} label={t("partyStatPlayers", { count: players })} />
          </dl>
        )}
      </header>

      {matches.length === 0 ? (
        <div className={cn(panel("neutral"), "px-6 py-12 text-center")}>
          <p className="font-display text-lg font-bold uppercase tracking-[0.06em] text-text-display">{t("partyEmptyTitle")}</p>
          <p className="mx-auto mt-2 max-w-md font-body text-sm text-text-muted">{t("partyEmptyBody")}</p>
        </div>
      ) : (
        <div className={cn(panel("neutral"), "overflow-hidden")}>
          <div aria-hidden="true" className={cn("hidden whitespace-nowrap border-b border-border-subtle/60 px-4 py-2.5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-text-faded", COLUMNS)}>
            <span>{t("partyColHero")}</span>
            <span>{t("partyColResult")}</span>
            <span>{t("partyColDuration")}</span>
            <span>{t("partyColWhen")}</span>
            <span>{t("partyColPlayers")}</span>
            <span />
          </div>
          <ul className="divide-y divide-border-subtle/40">
            {matches.map((m) => (
              <MatchRow key={m.matchId} match={m} summary={byId.get(m.matchId)} locale={locale} t={t} />
            ))}
          </ul>
        </div>
      )}

      <Link href="/party" className={textLink}>
        {t("partyHowLink")}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
