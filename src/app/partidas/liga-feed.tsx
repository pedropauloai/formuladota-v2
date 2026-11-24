// O feed das partidas da liga: "Acontecendo agora" (lobbies in_progress) e o histórico paginado,
// SSR pelas RPCs públicas live_matches / recent_matches (migration 099). Só aparece com a liga ligada.

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Radio, History, Swords } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getLiveMatches, getRecentMatches } from "@/lib/queries/matches-feed";
import { HistoryMatchCard, LiveMatchCard } from "@/components/match/match-feed-cards";
import { MatchIdSearch } from "@/components/match/match-id-search";

export const LIGA_PAGE_SIZE = 20;

export async function LigaFeed({ page }: { page: number }) {
  const t = await getTranslations("matchesFeed");
  const offset = (page - 1) * LIGA_PAGE_SIZE;
  const [live, history] = await Promise.all([
    page === 1 ? getLiveMatches() : Promise.resolve([]),
    getRecentMatches(LIGA_PAGE_SIZE, offset),
  ]);

  return (
    <section className="mt-12">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-text-display md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-2 max-w-2xl font-body text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        {/* Buscar partida por ID (dota_match_id) leva ao placar do histórico. */}
        <div className="w-full shrink-0 sm:w-80">
          <MatchIdSearch />
        </div>
      </header>

      {/* Acontecendo agora (só na 1ª página). */}
      {page === 1 && (
        <section className="mb-10">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-play-primary">
            <Radio size={14} aria-hidden="true" />
            {t("liveTitle")}
          </h3>
          {live.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/30 px-4 py-6 text-center font-body text-sm text-text-faded">
              {t("liveEmpty")}
            </div>
          ) : (
            <div className="grid gap-2">
              {live.map((m) => (
                <LiveMatchCard key={m.dotaMatchId} match={m} />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-text-faded">
          <History size={14} aria-hidden="true" />
          {t("historyTitle")}
        </h3>
        {history.length === 0 ? (
          <EmptyState
            title={t("historyEmptyTitle")}
            description={t("historyEmptyDescription")}
            icon={<Swords />}
            principle="random"
          />
        ) : (
          <div className="grid gap-2">
            {history.map((m) => (
              <HistoryMatchCard key={m.dotaMatchId} match={m} />
            ))}
          </div>
        )}

        {(history.length === LIGA_PAGE_SIZE || page > 1) && (
          <nav className="mt-6 flex items-center justify-center gap-4">
            {page > 1 && (
              <Link
                href={`/partidas?page=${page - 1}`}
                className="font-display text-sm uppercase tracking-widest text-text-muted transition-colors hover:text-text-display"
              >
                {t("prevPage")}
              </Link>
            )}
            <span className="font-mono text-sm tabular-nums text-text-display">
              {t("pageLabel", { page })}
            </span>
            {history.length === LIGA_PAGE_SIZE && (
              <Link
                href={`/partidas?page=${page + 1}`}
                className="font-display text-sm uppercase tracking-widest text-text-muted transition-colors hover:text-text-display"
              >
                {t("nextPage")}
              </Link>
            )}
          </nav>
        )}
      </section>
    </section>
  );
}
