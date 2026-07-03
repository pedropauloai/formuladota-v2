// Página /ranking — Phase 7 H5.3.
// Server Component cyberpunk dark fantasy. Top 3 destacados + lista paginada.
// Refatorado para Design System V2.5: primitives + tokens semânticos.

import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Trophy, Search, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { UserHoverCard } from "@/components/profile/user-hover-card";
import { SocialIconsRow, type SocialLinks } from "@/components/profile/social-icons-row";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { mmrToTier, IMMORTAL_FLOOR, IMMORTAL_ELITE_TOP, IMMORTAL_LEADERBOARD_TOP } from "@/lib/mmr";

// Medalha do rank pro leaderboard de Imortais (estilo oficial Dota, Pedro 2026-07-02):
// #1–#10 = medalha ESCURA (anel), #11–#30 = medalha VERMELHA; o resto segue o MMR.
// `position` = colocação global (1-based) na temporada.
function rankMedalFor(mmr: number, position: number): DotaRank {
  if (mmr < IMMORTAL_FLOOR) return mmrToDotaRank(mmr);
  if (position <= IMMORTAL_ELITE_TOP) return "immortal-leaderboard";
  if (position <= IMMORTAL_LEADERBOARD_TOP) return "immortal-top-100";
  return mmrToDotaRank(mmr);
}

// Número do leaderboard (#N na placa da medalha) — top 30.
function leaderboardNumberFor(mmr: number, position: number): number | undefined {
  return mmr >= IMMORTAL_FLOOR && position <= IMMORTAL_LEADERBOARD_TOP ? position : undefined;
}
import { SeasonBanner } from "@/components/patterns/season-banner";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ranking");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

interface RankRow {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  level: number;
  mmr: number;
  vitorias: number;
  derrotas: number;
  partidas_total: number;
  /** Redes sociais VINCULADAS (só as configuradas) — vitrine do jogador. */
  socialLinks?: SocialLinks;
}

const PAGE_SIZE = 50;

// Conversão MMR → rank Dota (escala oficial do wiki, mesma das TIER_BANDS de
// src/lib/mmr.ts). Imortal = 5620; teto in-house 7000.
function mmrToDotaRank(mmr: number | null): DotaRank {
  if (mmr === null) return "herald";
  if (mmr >= 5620) return "immortal";
  if (mmr >= 4620) return "divine";
  if (mmr >= 3850) return "ancient";
  if (mmr >= 3080) return "legend";
  if (mmr >= 2310) return "archon";
  if (mmr >= 1540) return "crusader";
  if (mmr >= 770) return "guardian";
  return "herald";
}

export default async function RankingPage(props: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const t = await getTranslations("ranking");
  const params = await props.searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const search = (params.q ?? "").trim().toLowerCase();

  const supabase = await createClient();

  // Busca season ativa (started_at/ended_at alimentam o countdown do banner)
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, started_at, ended_at")
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

  // Banidos NÃO aparecem no ranking (Pedro 2026-07-02). RPC pública (DEFINER) do
  // Mural — user_warnings tem RLS restrita, então essa é a via legível pra todos.
  const { data: punished } = await supabase.rpc("wall_of_shame");
  const bannedIds = ((punished ?? []) as { user_id: string; status: string }[])
    .filter((p) => p.status === "banned")
    .map((p) => p.user_id);
  const banFilter = bannedIds.length ? `(${bannedIds.join(",")})` : null;

  // Top 3 sempre visível (não paginado)
  let top3Query = supabase
    .from("player_season_mmr")
    .select("user_id, mmr, vitorias, derrotas, partidas_total")
    .eq("season_id", season.id)
    .order("mmr", { ascending: false })
    .limit(3);
  if (banFilter) top3Query = top3Query.not("user_id", "in", banFilter);
  const { data: top3 } = await top3Query;

  // Lista paginada (offset)
  const offset = (page - 1) * PAGE_SIZE;
  let listQuery = supabase
    .from("player_season_mmr")
    .select("user_id, mmr, vitorias, derrotas, partidas_total")
    .eq("season_id", season.id)
    .order("mmr", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (search) {
    // Busca por nick em profiles.username (Discord) E steam_links.persona
    // (identidade exibida desde a migration 054) — 2 queries paralelas.
    const [{ data: matchingProfiles }, { data: matchingSteam }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id")
          .ilike("username", `%${search}%`)
          .limit(50),
        supabase
          .from("steam_links")
          .select("user_id")
          .ilike("persona", `%${search}%`)
          .limit(50),
      ]);
    const matchIds = [
      ...new Set([
        ...(matchingProfiles ?? []).map((p) => p.id),
        ...(matchingSteam ?? []).map((s) => s.user_id),
      ]),
    ];
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

  if (banFilter) listQuery = listQuery.not("user_id", "in", banFilter);
  const { data: list } = await listQuery;
  const rows: { user_id: string; mmr: number; vitorias: number; derrotas: number; partidas_total: number }[] =
    list ?? [];
  const top3List: typeof rows = top3 ?? [];

  // Identidade via FONTE ÚNICA (getIdentityMap): Discord-first pra QUALQUER viewer
  // (visitante/user/admin) — antes caía no nick Steam pra não-admin por causa da RLS.
  const allUserIds = Array.from(new Set([...top3List.map((r) => r.user_id), ...rows.map((r) => r.user_id)]));
  const [identityMap, levelsRes] = await Promise.all([
    getIdentityMap(supabase, allUserIds),
    allUserIds.length > 0
      ? supabase.from("user_levels").select("user_id, current_level").in("user_id", allUserIds)
      : Promise.resolve({ data: [] as { user_id: string; current_level: number }[] }),
  ]);

  const levelMap = new Map((levelsRes.data ?? []).map((l) => [l.user_id, l.current_level]));
  const hydrate = (r: typeof rows[number]): RankRow => {
    const ident = identityMap.get(r.user_id);
    return {
      ...r,
      username: ident?.name ?? null,
      avatar_url: ident?.avatarUrl ?? null,
      level: levelMap.get(r.user_id) ?? 1,
      socialLinks: ident?.socialLinks,
    };
  };

  const top3Hydrated = top3List.map(hydrate);
  const listHydrated = rows.map(hydrate);

  return (
    <ClientShell currentRoute="/ranking">
      {/* A Lina é o BACKGROUND da PÁGINA (não um header em caixa): fixa ATRÁS do
          conteúdo da coluna central (mesmos recuos das sidebars), o conteúdo rola por
          cima. object-top mantém o rosto; o fade vertical escurece pra baixo pra
          lista/pódio ficarem legíveis. Pedro 2026-07-02. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[64px] bottom-0 z-0 overflow-hidden xl:top-[72px] lg:right-[320px] xl:right-[360px] 2xl:right-[380px]"
      >
        {/* w-full + h-auto = a imagem INTEIRA (sem corte), escalando com a largura da
            coluna em qualquer resolução (responsivo). Ocupa o topo; o overlay escurece
            progressivamente pro fundo sólido embaixo (sem borda dura). */}
        <Image
          src="/images/ranking/season-header.png"
          alt=""
          width={1920}
          height={622}
          priority
          unoptimized
          sizes="100vw"
          className="h-auto w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-base/55 to-bg-base" />
      </div>

      <div className="relative z-10 px-6 pb-10 xl:px-12">
        {/* Header sobre o fundo da Lina — sem caixa/imagem própria (a imagem é o
            fundo da página). Título + tag da season + CTA do MMR. */}
        <header className="mb-10 flex flex-col gap-5 pt-10 md:flex-row md:items-center md:justify-between md:pt-14">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 font-display text-4xl uppercase tracking-tight text-text-display drop-shadow-lg md:text-6xl">
              {season.name}
            </h1>
            <div className="mt-3">
              <SeasonBanner
                variant="hero"
                seasonNumber={season.id}
                seasonName={season.name}
                endsAt={
                  season.ended_at
                    ? new Date(season.ended_at)
                    : new Date(new Date(season.started_at).getTime() + 90 * 24 * 60 * 60 * 1000)
                }
              />
            </div>
          </div>
          {/* CTA grande e destacado — atalho pra página didática do MMR. */}
          <Link
            href="/mmr"
            className="group inline-flex shrink-0 items-center gap-2.5 self-start rounded-md border-2 border-brand-primary bg-brand-primary/15 px-5 py-3 font-display text-lg font-bold uppercase tracking-wide text-text-display shadow-lg shadow-black/40 backdrop-blur-sm transition-all hover:scale-[1.02] hover:bg-brand-primary/25 md:self-center md:text-xl"
          >
            <HelpCircle className="size-5 text-brand-primary md:size-6" aria-hidden="true" />
            Como funciona o MMR?
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </header>

        {/* Cabeçalho da lista: rótulo à esquerda + busca SUTIL à direita (Pedro
            2026-07-02). A busca subiu pra cá — antes dividia o pódio da lista. */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-text-faded">
            {search ? t("searchResultsFor", { query: search }) : t("top3")}
          </h2>
          <SearchBar initialQuery={search} />
        </div>

        {/* Top 3 cards — pódio (não repetido na lista abaixo) */}
        {top3Hydrated.length > 0 && !search && (
          <section className="mb-8">
            <div className="grid gap-4 md:grid-cols-3">
              {top3Hydrated.map((row, idx) => (
                <TopCard key={row.user_id} row={row} position={idx + 1} />
              ))}
            </div>
          </section>
        )}

        {/* List — na 1ª página começa no #4 (o pódio acima já mostra 1–3). */}
        <ol className="space-y-2">
          {listHydrated.map((row, idx) => {
            const position = search ? idx + 1 : offset + idx + 1;
            if (!search && page === 1 && idx < 3) return null;
            return <RankingRow key={row.user_id} row={row} position={position} />;
          })}
        </ol>

        {/* Pagination */}
        {!search && listHydrated.length === PAGE_SIZE && (
          <Pagination currentPage={page} />
        )}

        {listHydrated.length === 0 && !search && top3Hydrated.length === 0 && (
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
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
  const t = useTranslations("ranking");
  const isChampion = position === 1;
  const dotaRank = rankMedalFor(row.mmr, position);

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
        <UserHoverCard userId={row.user_id} className="flex items-center gap-3">
          <XpAvatarRing
            src={row.avatar_url ?? undefined}
            alt={row.username ?? t("anonymous")}
            fallback={(row.username ?? "??").slice(0, 2)}
            level={row.level}
            pct={0}
            size={56}
          />
          {/* Medalha ENTRE a foto e o nome (fiel ao Dota) e GRANDE — o pódio dá
              destaque máximo ao rank. Pedro 2026-07-03. */}
          <DotaRankMedal
            rank={dotaRank}
            stars={mmrToTier(row.mmr).stars}
            leaderboardNumber={leaderboardNumberFor(row.mmr, position)}
            variant="formuladota"
            size="xl"
            tooltip={false}
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="font-display text-2xl 2xl:text-3xl uppercase tracking-wide text-text-display truncate">
              {row.username ?? t("anonymous")}
            </p>
            <p className="font-display text-base 2xl:text-lg font-semibold tabular-nums text-gold">
              {row.mmr} <span className="text-gold-muted">MMR</span>
            </p>
          </div>
        </UserHoverCard>
        <div className="flex items-center justify-between border-t border-border-subtle pt-3">
          {/* Vitrine: só redes vinculadas (sem placeholders). */}
          <SocialIconsRow
            links={row.socialLinks}
            onlyLinked
            size={16}
            className="flex items-center gap-2.5"
          />
          <span className="font-display text-sm 2xl:text-base font-semibold text-text-body">
            {t("winLoss", { wins: row.vitorias, losses: row.derrotas })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------
// RankingRow — Linha individual da lista paginada
// ----------------------------------------------------------------
// Coluna de estatística: número em cima + rótulo embaixo. Preenche o espaço da
// linha com informação clara (estilo tabela de leaderboard). Pedro 2026-07-03.
function StatCol({
  value,
  label,
  tone = "body",
  className,
}: {
  value: string | number;
  label: string;
  tone?: "gold" | "win" | "loss" | "body";
  className?: string;
}) {
  const toneClass =
    tone === "gold"
      ? "text-gold"
      : tone === "win"
        ? "text-play-primary"
        : tone === "loss"
          ? "text-error"
          : "text-text-display";
  return (
    <div className={cn("w-16 shrink-0 text-center 2xl:w-20", className)}>
      <p className={cn("font-display-condensed text-lg font-bold tabular-nums leading-none 2xl:text-xl", toneClass)}>
        {value}
      </p>
      <p className="mt-0.5 font-display text-[0.6rem] uppercase tracking-wide text-text-faded">{label}</p>
    </div>
  );
}

function RankingRow({ row, position }: { row: RankRow; position: number }) {
  const t = useTranslations("ranking");
  const dotaRank = rankMedalFor(row.mmr, position);
  const winrate = row.partidas_total > 0 ? Math.round((row.vitorias / row.partidas_total) * 100) : null;

  return (
    <li className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-base p-3 transition-colors hover:border-border-brand">
      {/* Posição no ranking = valor/progresso → GOLD (Pedro 2026-06-11) */}
      <span className="w-10 shrink-0 text-center font-display text-lg 2xl:text-xl tabular-nums text-gold">#{position}</span>
      {/* Identidade (link) + redes lado a lado — as redes ficam FORA do link
          (âncora dentro de âncora é HTML inválido) mas coladas ao nome. */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <UserHoverCard userId={row.user_id} className="flex min-w-0 items-center gap-3">
          <XpAvatarRing
            src={row.avatar_url ?? undefined}
            alt={row.username ?? t("anonymous")}
            fallback={(row.username ?? "??").slice(0, 2)}
            level={row.level}
            pct={0}
            size={40}
          />
          {/* Medalha ENTRE a foto e o nome (fiel ao Dota 2) — lg pra o número do
              top 10 ser legível. Pedro 2026-07-03. */}
          <DotaRankMedal
            rank={dotaRank}
            stars={mmrToTier(row.mmr).stars}
            leaderboardNumber={leaderboardNumberFor(row.mmr, position)}
            variant="formuladota"
            size="lg"
            tooltip={false}
            className="shrink-0"
          />
          <p className="min-w-0 truncate font-body text-sm 2xl:text-base font-medium text-text-display hover:text-brand-primary transition-colors">
            {row.username ?? t("anonymous")}
          </p>
        </UserHoverCard>
        {/* Redes VINCULADAS ao lado do nome (identificação). Pedro 2026-07-03. */}
        <SocialIconsRow
          links={row.socialLinks}
          onlyLinked
          size={16}
          className="flex shrink-0 items-center gap-2"
        />
      </div>
      {/* Colunas de stats — preenchem o vazio da linha. Progressivas: MMR sempre;
          Partidas/V/D só em telas maiores (sm/md); Winrate em lg+. */}
      <StatCol value={row.mmr} label={t("statMmr")} tone="gold" />
      <StatCol value={row.partidas_total} label={t("statMatches")} className="hidden sm:block" />
      <StatCol value={row.vitorias} label={t("statWins")} tone="win" className="hidden md:block" />
      <StatCol value={row.derrotas} label={t("statLosses")} tone="loss" className="hidden md:block" />
      <StatCol value={winrate === null ? "—" : `${winrate}%`} label={t("statWinrate")} className="hidden lg:block" />
    </li>
  );
}

// ----------------------------------------------------------------
// SearchBar — Form de busca por nickname (GET — recarrega page)
// ----------------------------------------------------------------
function SearchBar({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("ranking");
  // Sutil (Pedro 2026-07-02): pill fina, ícone dentro, submit no Enter — sem
  // botão grande. Fica no cabeçalho da lista, não dividindo o pódio.
  return (
    <form className="flex w-full max-w-[240px] items-center gap-2 rounded-md border border-border-subtle bg-bg-base/60 px-2.5 py-1.5 transition-colors focus-within:border-border-brand">
      <Search size={15} className="shrink-0 text-text-muted" aria-hidden="true" />
      <input
        type="search"
        name="q"
        defaultValue={initialQuery}
        placeholder={t("searchPlaceholder")}
        className="min-w-0 flex-1 bg-transparent font-body text-sm text-text-display placeholder:text-text-faded focus:outline-none"
      />
    </form>
  );
}

// ----------------------------------------------------------------
// Pagination — Anterior / Próxima via querystring
// ----------------------------------------------------------------
function Pagination({ currentPage }: { currentPage: number }) {
  const t = useTranslations("ranking");
  return (
    <nav className="mt-8 flex items-center justify-center gap-4">
      {currentPage > 1 && (
        <Link
          href={`/ranking?page=${currentPage - 1}`}
          className="font-display text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          {t("prevPage")}
        </Link>
      )}
      <span className="font-mono text-sm 2xl:text-base text-text-display">
        {t("pageLabel", { page: currentPage })}
      </span>
      <Link
        href={`/ranking?page=${currentPage + 1}`}
        className="font-display text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
      >
        {t("nextPage")}
      </Link>
    </nav>
  );
}

// ----------------------------------------------------------------
// Empty states — Renderizados dentro do <ClientShell> do caller.
// ----------------------------------------------------------------

function NoMatchShell({ searchTerm, seasonName }: { searchTerm: string; seasonName: string }) {
  const t = useTranslations("ranking");
  return (
    <div className="px-6 py-20">
      <EmptyState
        title={t("noMatchTitle", { term: searchTerm })}
        description={t("noMatchDescription", { season: seasonName })}
        icon={<Search />}
        action={
          <Link href="/ranking">
            <Button variant="secondary" size="md">
              {t("backToRanking")}
            </Button>
          </Link>
        }
      />
    </div>
  );
}

function RankingEmptyShell() {
  const t = useTranslations("ranking");
  return (
    <div className="px-6 py-20">
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        icon={<Trophy />}
        principle="random"
      />
    </div>
  );
}
