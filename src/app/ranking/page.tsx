// Página /ranking — Phase 7 H5.3.
// Server Component cyberpunk dark fantasy. Top 3 destacados + lista paginada.

import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TierBadge } from "@/components/dota/tier-badge";
import { ClientShell } from "@/components/client-shell/shell";

export const metadata: Metadata = {
  title: "Ranking — FORMULADOTA",
  description: "Ranking da temporada atual FORMULADOTA HUB Dota 2.",
};

interface RankRow {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  mmr: number;
  vitorias: number;
  derrotas: number;
  partidas_total: number;
}

const PAGE_SIZE = 50;

export default async function RankingPage(props: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await props.searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const search = (params.q ?? "").trim().toLowerCase();

  const supabase = await createClient();

  // Busca season ativa
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("active", true)
    .limit(1)
    .single();

  if (!season) {
    return (
      <ClientShell currentRoute="/ranking">
        <EmptyRanking />
      </ClientShell>
    );
  }

  // Top 3 sempre visível (não paginado)
  const { data: top3 } = await supabase
    .from("player_season_mmr")
    .select("user_id, mmr, vitorias, derrotas, partidas_total")
    .eq("season_id", season.id)
    .order("mmr", { ascending: false })
    .limit(3);

  // Lista paginada (offset)
  const offset = (page - 1) * PAGE_SIZE;
  let listQuery = supabase
    .from("player_season_mmr")
    .select("user_id, mmr, vitorias, derrotas, partidas_total")
    .eq("season_id", season.id)
    .order("mmr", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (search) {
    // Busca via JOIN profiles.username — 2-query approach (RLS filter)
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${search}%`)
      .limit(50);
    const matchIds = (matchingProfiles ?? []).map((p) => p.id);
    if (matchIds.length === 0) {
      return (
        <ClientShell currentRoute="/ranking">
          <NoMatchState searchTerm={search} seasonName={season.name} />
        </ClientShell>
      );
    }
    listQuery = supabase
      .from("player_season_mmr")
      .select("user_id, mmr, vitorias, derrotas, partidas_total")
      .eq("season_id", season.id)
      .in("user_id", matchIds)
      .order("mmr", { ascending: false });
  }

  const { data: list } = await listQuery;
  const rows: { user_id: string; mmr: number; vitorias: number; derrotas: number; partidas_total: number }[] =
    list ?? [];
  const top3List: typeof rows = top3 ?? [];

  // Hidrata profiles em batch (2-query)
  const allUserIds = Array.from(new Set([...top3List.map((r) => r.user_id), ...rows.map((r) => r.user_id)]));
  const { data: profiles } = allUserIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", allUserIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const hydrate = (r: typeof rows[number]): RankRow => {
    const p = profileMap.get(r.user_id);
    return {
      ...r,
      username: p?.username ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  };

  const top3Hydrated = top3List.map(hydrate);
  const listHydrated = rows.map(hydrate);

  return (
    <ClientShell currentRoute="/ranking">
      <div className="px-6 py-10 xl:px-12">
        <header className="mb-12">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            Ranking
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-[var(--color-foreground)] md:text-5xl">
            {season.name}
          </h1>
          <div className="mt-6 brand-divider" />
        </header>

        {/* Top 3 cards */}
        {top3Hydrated.length > 0 && !search && (
          <section className="mb-12">
            <h2 className="mb-6 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faded)]">
              Top 3
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {top3Hydrated.map((row, idx) => (
                <TopCard key={row.user_id} row={row} position={idx + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Search */}
        <SearchBar initialQuery={search} />

        {/* List */}
        <ol className="space-y-2 mt-8">
          {listHydrated.map((row, idx) => (
            <RankingRow
              key={row.user_id}
              row={row}
              position={search ? idx + 1 : offset + idx + 1}
            />
          ))}
        </ol>

        {/* Pagination */}
        {!search && listHydrated.length === PAGE_SIZE && (
          <Pagination currentPage={page} />
        )}

        {listHydrated.length === 0 && !search && top3Hydrated.length === 0 && (
          <EmptyRanking />
        )}
      </div>
    </ClientShell>
  );
}

function TopCard({ row, position }: { row: RankRow; position: number }) {
  const podiumColor = position === 1
    ? "border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10"
    : position === 2
      ? "border-zinc-300/40 bg-[var(--color-card)]"
      : "border-amber-700/40 bg-[var(--color-card)]";

  return (
    <article className={`rounded-md border p-6 space-y-3 ${podiumColor}`}>
      <div className="flex items-center justify-between">
        <Trophy
          size={20}
          className={position === 1 ? "text-[var(--color-brand-red)]" : "text-[var(--color-muted-foreground)]"}
          aria-hidden="true"
        />
        <span className="font-display text-2xl text-[var(--color-foreground)]">#{position}</span>
      </div>
      <div className="flex items-center gap-3">
        {row.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.avatar_url} alt="" className="size-12 rounded-full border border-[var(--color-border)]" />
        ) : (
          <div className="size-12 rounded-full border border-[var(--color-border)] bg-[var(--color-background)]" />
        )}
        <div className="min-w-0">
          <p className="font-display text-base uppercase tracking-wide text-[var(--color-foreground)] truncate">
            {row.username ?? "Anônimo"}
          </p>
          <p className="font-mono text-xs text-[var(--color-muted-foreground)]">{row.mmr} MMR</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <TierBadge mmr={row.mmr} size="sm" showName />
        <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
          {row.vitorias}V — {row.derrotas}D
        </span>
      </div>
    </article>
  );
}

function RankingRow({ row, position }: { row: RankRow; position: number }) {
  return (
    <li className="flex items-center gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--color-brand-red)]/40">
      <span className="font-display text-lg w-12 text-[var(--color-muted-foreground)]">#{position}</span>
      {row.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.avatar_url} alt="" className="size-10 rounded-full border border-[var(--color-border)]" />
      ) : (
        <div className="size-10 rounded-full border border-[var(--color-border)] bg-[var(--color-background)]" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium text-[var(--color-foreground)] truncate">
          {row.username ?? "Anônimo"}
        </p>
        <p className="font-mono text-xs text-[var(--color-muted-foreground)]">
          {row.partidas_total} partidas — {row.vitorias}V/{row.derrotas}D
        </p>
      </div>
      <TierBadge mmr={row.mmr} size="sm" />
      <span className="font-mono text-sm text-[var(--color-foreground)] w-16 text-right">{row.mmr}</span>
    </li>
  );
}

function SearchBar({ initialQuery }: { initialQuery: string }) {
  return (
    <form className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-2">
      <Search size={16} className="ml-2 text-[var(--color-muted-foreground)]" aria-hidden="true" />
      <input
        type="search"
        name="q"
        defaultValue={initialQuery}
        placeholder="Buscar por nickname..."
        className="flex-1 bg-transparent px-2 py-2 font-sans text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-text-faded)] focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:border-[var(--color-brand-red)] hover:text-[var(--color-foreground)] transition-colors"
      >
        Buscar
      </button>
    </form>
  );
}

function Pagination({ currentPage }: { currentPage: number }) {
  return (
    <nav className="mt-8 flex items-center justify-center gap-4">
      {currentPage > 1 && (
        <Link
          href={`/ranking?page=${currentPage - 1}`}
          className="font-sans text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          ← Anterior
        </Link>
      )}
      <span className="font-mono text-sm text-[var(--color-foreground)]">página {currentPage}</span>
      <Link
        href={`/ranking?page=${currentPage + 1}`}
        className="font-sans text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        Próxima →
      </Link>
    </nav>
  );
}

function NoMatchState({ searchTerm, seasonName }: { searchTerm: string; seasonName: string }) {
  // Renderizado dentro do <ClientShell> do caller — retorna só o conteúdo.
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-2xl text-center space-y-6">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          {seasonName}
        </p>
        <h1 className="font-display text-4xl uppercase text-white">
          Nenhum resultado pra {`"${searchTerm}"`}
        </h1>
        <Link
          href="/ranking"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-white/70 hover:text-white transition-colors"
        >
          ← Voltar ao ranking
        </Link>
      </div>
    </div>
  );
}

function EmptyRanking() {
  // Renderizado dentro do <ClientShell> do caller — retorna só o conteúdo.
  return (
    <div className="px-6 py-20">
      <div className="mx-auto max-w-2xl text-center space-y-6">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Ranking
        </p>
        <h1 className="font-display text-4xl uppercase text-white">
          Temporada começando
        </h1>
        <p className="font-serif text-white/70">
          Ainda sem partidas oficiais. Seja um dos primeiros — ative sua mensalidade e crie um lobby.
        </p>
      </div>
    </div>
  );
}
