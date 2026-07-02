// /partidas — feed público de partidas FormulaDota.
//   Topo: "Acontecendo agora" (partidas ao vivo — lobbies in_progress).
//   Abaixo: histórico paginado (partidas realizadas, com preview de heróis).
// Tudo SSR via RPCs públicas (live_matches / recent_matches, migration 099).
//
// NOTA: substitui a página legada da Phase 2 (saldo da loja de mentoria) — modelo
// superado pelos pivôs; o saldo de fichas hoje vive no mini-perfil.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Radio, History, Swords } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getLiveMatches, getRecentMatches } from "@/lib/queries/matches-feed";
import { HistoryMatchCard, LiveMatchCard } from "@/components/match/match-feed-cards";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("matchesFeed");
  return { title: t("metaTitle") };
}

const PAGE_SIZE = 20;

export default async function PartidasPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations("matchesFeed");
  const params = await props.searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [live, history] = await Promise.all([
    page === 1 ? getLiveMatches() : Promise.resolve([]),
    getRecentMatches(PAGE_SIZE, offset),
  ]);

  return (
    <ClientShell currentRoute="/partidas">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="mb-8">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-text-display md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-text-muted">{t("subtitle")}</p>
        </header>

        {/* Acontecendo agora (só na 1ª página). */}
        {page === 1 && (
          <section className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-play-primary">
              <Radio size={14} aria-hidden="true" />
              {t("liveTitle")}
            </h2>
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

        {/* Histórico. */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-text-faded">
            <History size={14} aria-hidden="true" />
            {t("historyTitle")}
          </h2>
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

          {/* Paginação. */}
          {(history.length === PAGE_SIZE || page > 1) && (
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
              {history.length === PAGE_SIZE && (
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
      </div>
    </ClientShell>
  );
}
