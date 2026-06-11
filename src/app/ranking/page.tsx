// Página /ranking — Phase 7 H5.3.
// Server Component cyberpunk dark fantasy. Top 3 destacados + lista paginada.
// Refatorado para Design System V2.5: primitives + tokens semânticos.

import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/avatar";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";

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

// Conversão MMR → rank Dota 2 (espelhada de coaches/[slug]/page.tsx)
function mmrToDotaRank(mmr: number | null): DotaRank {
  if (mmr === null) return "herald";
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
        <RankingEmptyShell />
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
          <NoMatchShell searchTerm={search} seasonName={season.name} />
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
        {/* Header padronizado V2.5: eyebrow + h1 + descrição */}
        <header className="mb-12">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            Ranking · Temporada
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-text-display md:text-5xl">
            {season.name}
          </h1>
          <p className="mt-3 font-display text-sm font-semibold text-text-body max-w-2xl">
            Classificação dos jogadores pelo MMR da temporada atual. Top 3 destacados, demais paginados.
          </p>
        </header>

        {/* Top 3 cards */}
        {top3Hydrated.length > 0 && !search && (
          <section className="mb-12">
            <h2 className="mb-6 font-display text-sm font-semibold uppercase tracking-widest text-text-faded">
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
          <EmptyState
            title="Temporada começando"
            description="Ainda sem partidas oficiais. Seja um dos primeiros — ative sua mensalidade e crie um lobby."
            icon={<Trophy />}
            principle="random"
          />
        )}
      </div>
    </ClientShell>
  );
}

// ----------------------------------------------------------------
// TopCard — Destaque pódio (Top 3). Posição 1 ganha glow brand.
// ----------------------------------------------------------------
function TopCard({ row, position }: { row: RankRow; position: number }) {
  const isChampion = position === 1;
  const dotaRank = mmrToDotaRank(row.mmr);

  return (
    <Card
      variant="elevated"
      className={
        isChampion
          ? "border-brand-primary shadow-[var(--glow-brand)]"
          : undefined
      }
    >
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Trophy
            size={20}
            className={isChampion ? "text-brand-primary" : "text-text-muted"}
            aria-hidden="true"
          />
          {/* Posição top 3 = valor/progresso → gold-bright (Pedro 2026-06-11) */}
          <span className="font-display text-2xl tabular-nums text-gold-bright">#{position}</span>
        </div>
        <div className="flex items-center gap-3">
          <UserAvatar
            src={row.avatar_url ?? undefined}
            alt={row.username ?? "Anônimo"}
            fallback={(row.username ?? "??").slice(0, 2)}
            size="lg"
            ringColor={isChampion ? "brand" : null}
          />
          <div className="min-w-0">
            <p className="font-display text-base uppercase tracking-wide text-text-display truncate">
              {row.username ?? "Anônimo"}
            </p>
            <p className="font-display text-sm font-semibold tabular-nums text-gold">
              {row.mmr} <span className="text-gold-muted">MMR</span>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border-subtle pt-3">
          <DotaRankMedal rank={dotaRank} size="sm" showLabel />
          <span className="font-display text-sm font-semibold text-text-body">
            {row.vitorias}V — {row.derrotas}D
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------
// RankingRow — Linha individual da lista paginada
// ----------------------------------------------------------------
function RankingRow({ row, position }: { row: RankRow; position: number }) {
  const dotaRank = mmrToDotaRank(row.mmr);

  return (
    <li className="flex items-center gap-4 rounded-md border border-border-subtle bg-bg-base p-4 transition-colors hover:border-border-brand">
      {/* Posição no ranking = valor/progresso → GOLD (Pedro 2026-06-11) */}
      <span className="font-display text-lg w-12 tabular-nums text-gold">#{position}</span>
      <UserAvatar
        src={row.avatar_url ?? undefined}
        alt={row.username ?? "Anônimo"}
        fallback={(row.username ?? "??").slice(0, 2)}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-text-display truncate">
          {row.username ?? "Anônimo"}
        </p>
        <p className="font-display text-sm font-semibold text-text-body">
          {row.partidas_total} partidas — {row.vitorias}V/{row.derrotas}D
        </p>
      </div>
      <DotaRankMedal rank={dotaRank} size="sm" />
      <span className="font-mono text-sm tabular-nums text-gold w-16 text-right">{row.mmr}</span>
    </li>
  );
}

// ----------------------------------------------------------------
// SearchBar — Form de busca por nickname (GET — recarrega page)
// ----------------------------------------------------------------
function SearchBar({ initialQuery }: { initialQuery: string }) {
  return (
    <form className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-base p-2">
      <Search size={16} className="ml-2 text-text-muted" aria-hidden="true" />
      <input
        type="search"
        name="q"
        defaultValue={initialQuery}
        placeholder="Buscar por nickname..."
        className="flex-1 bg-transparent px-2 py-2 font-body text-sm text-text-display placeholder:text-text-faded focus:outline-none"
      />
      <Button type="submit" variant="secondary" size="sm">
        Buscar
      </Button>
    </form>
  );
}

// ----------------------------------------------------------------
// Pagination — Anterior / Próxima via querystring
// ----------------------------------------------------------------
function Pagination({ currentPage }: { currentPage: number }) {
  return (
    <nav className="mt-8 flex items-center justify-center gap-4">
      {currentPage > 1 && (
        <Link
          href={`/ranking?page=${currentPage - 1}`}
          className="font-display text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          ← Anterior
        </Link>
      )}
      <span className="font-mono text-sm text-text-display">página {currentPage}</span>
      <Link
        href={`/ranking?page=${currentPage + 1}`}
        className="font-display text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
      >
        Próxima →
      </Link>
    </nav>
  );
}

// ----------------------------------------------------------------
// Empty states — Renderizados dentro do <ClientShell> do caller.
// ----------------------------------------------------------------

function NoMatchShell({ searchTerm, seasonName }: { searchTerm: string; seasonName: string }) {
  return (
    <div className="px-6 py-20">
      <EmptyState
        title={`Nenhum resultado para "${searchTerm}"`}
        description={`Temporada ${seasonName} — tente outro nickname ou volte ao ranking completo.`}
        icon={<Search />}
        action={
          <Link href="/ranking">
            <Button variant="secondary" size="md">
              ← Voltar ao ranking
            </Button>
          </Link>
        }
      />
    </div>
  );
}

function RankingEmptyShell() {
  return (
    <div className="px-6 py-20">
      <EmptyState
        title="Temporada começando"
        description="Ainda sem partidas oficiais. Seja um dos primeiros — ative sua mensalidade e crie um lobby."
        icon={<Trophy />}
        principle="random"
      />
    </div>
  );
}
