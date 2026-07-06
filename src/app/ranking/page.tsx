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
import { SeasonRankMedal } from "@/components/ui/season-rank-medal";
import { xpProgress } from "@/lib/levels";
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
  /** Progresso de XP dentro do nível (0-1) — preenche o anel do avatar. */
  xpPct: number;
  mmr: number;
  vitorias: number;
  derrotas: number;
  partidas_total: number;
  /** MVPs na temporada (match_details.mvp_user_id agregado). */
  mvps: number;
  /** Redes sociais VINCULADAS (só as configuradas) — vitrine do jogador. */
  socialLinks?: SocialLinks;
}

const PAGE_SIZE = 50;

export default async function RankingPage(props: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const t = await getTranslations("ranking");
  const params = await props.searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const search = (params.q ?? "").trim().toLowerCase();

  const supabase = await createClient();

  // Season ativa + Mural em PARALELO (independentes — perf 2026-07-03).
  // Banidos NÃO aparecem no ranking (Pedro 2026-07-02). RPC pública (DEFINER) do
  // Mural — user_warnings tem RLS restrita, então essa é a via legível pra todos.
  const [{ data: season }, { data: punished }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, started_at, ended_at")
      .eq("active", true)
      .limit(1)
      .single(),
    supabase.rpc("wall_of_shame"),
  ]);

  if (!season) {
    return (
      <ClientShell currentRoute="/ranking">
        <RankingEmptyShell />
      </ClientShell>
    );
  }
  const bannedIds = ((punished ?? []) as { user_id: string; status: string }[])
    .filter((p) => p.status === "banned")
    .map((p) => p.user_id);
  const banFilter = bannedIds.length ? `(${bannedIds.join(",")})` : null;

  // ELEGIBILIDADE (Pedro 2026-07-06): só aparece no ranking quem tem STEAM vinculado E
  // MEDALHA pública (career.rankTier via Stratz). Conta sem Steam ou sem medalha não
  // entra. As queries abaixo são restringidas com .in(eligibleIds).
  const [{ data: steamRows }, { data: careerRows }] = await Promise.all([
    supabase.from("steam_links").select("user_id"),
    supabase.from("user_stats_extended").select("user_id, career"),
  ]);
  const steamSet = new Set((steamRows ?? []).map((r) => r.user_id as string));
  const eligibleIds = (careerRows ?? [])
    .filter((r) => {
      const rt = (r.career as { rankTier?: number | null } | null)?.rankTier;
      return typeof rt === "number" && rt > 0 && steamSet.has(r.user_id as string);
    })
    .map((r) => r.user_id as string);

  // Top 3 sempre visível (não paginado). NÃO é awaited aqui — resolve em
  // paralelo com a lista paginada mais abaixo (Promise.all).
  let top3Query = supabase
    .from("player_season_mmr")
    .select("user_id, mmr, vitorias, derrotas, partidas_total, mvps")
    .eq("season_id", season.id)
    .in("user_id", eligibleIds)
    .order("mmr", { ascending: false })
    .limit(3);
  if (banFilter) top3Query = top3Query.not("user_id", "in", banFilter);

  // Lista paginada (offset)
  const offset = (page - 1) * PAGE_SIZE;
  let listQuery = supabase
    .from("player_season_mmr")
    .select("user_id, mmr, vitorias, derrotas, partidas_total, mvps")
    .eq("season_id", season.id)
    .in("user_id", eligibleIds)
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
    // Só busca entre elegíveis (Steam + medalha) — mesma regra do ranking.
    const eligibleSet = new Set(eligibleIds);
    const matchIds = [
      ...new Set([
        ...(matchingProfiles ?? []).map((p) => p.id),
        ...(matchingSteam ?? []).map((s) => s.user_id),
      ]),
    ].filter((id) => eligibleSet.has(id as string));
    if (matchIds.length === 0) {
      return (
        <ClientShell currentRoute="/ranking">
          <NoMatchShell searchTerm={search} seasonName={season.name} />
        </ClientShell>
      );
    }
    listQuery = supabase
      .from("player_season_mmr")
      .select("user_id, mmr, vitorias, derrotas, partidas_total, mvps")
      .eq("season_id", season.id)
      .in("user_id", matchIds)
      .order("mmr", { ascending: false });
  }

  if (banFilter) listQuery = listQuery.not("user_id", "in", banFilter);
  // Top 3 + lista em paralelo (as duas queries são independentes).
  const [{ data: top3 }, { data: list }] = await Promise.all([top3Query, listQuery]);
  const rows: { user_id: string; mmr: number; vitorias: number; derrotas: number; partidas_total: number; mvps: number }[] =
    list ?? [];
  const top3List: typeof rows = top3 ?? [];

  // Identidade via FONTE ÚNICA (getIdentityMap): Discord-first pra QUALQUER viewer
  // (visitante/user/admin) — antes caía no nick Steam pra não-admin por causa da RLS.
  const allUserIds = Array.from(new Set([...top3List.map((r) => r.user_id), ...rows.map((r) => r.user_id)]));
  const [identityMap, levelsRes] = await Promise.all([
    getIdentityMap(supabase, allUserIds),
    allUserIds.length > 0
      ? supabase.from("user_levels").select("user_id, total_xp_earned").in("user_id", allUserIds)
      : Promise.resolve({ data: [] as { user_id: string; total_xp_earned: number }[] }),
  ]);

  // Nível + progresso de XP a partir do XP total (fonte única xpProgress) — o anel
  // do avatar mostra o preenchimento real, não mais vazio.
  const xpMap = new Map(
    (levelsRes.data ?? []).map((l) => [l.user_id, xpProgress(l.total_xp_earned ?? 0)])
  );
  const hydrate = (r: typeof rows[number]): RankRow => {
    const ident = identityMap.get(r.user_id);
    const xp = xpMap.get(r.user_id);
    return {
      ...r,
      username: ident?.name ?? null,
      avatar_url: ident?.avatarUrl ?? null,
      level: xp?.level ?? 1,
      xpPct: xp?.pct ?? 0,
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
          src="/images/ranking/season-header.webp"
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
          {/* Ranking GLOBAL (Pedro 2026-07-05): sem filtro de região — todos competem
              no mesmo leaderboard. As FILAS seguem por região; o ranking é único. */}
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

        {/* Pagination — aparece se há pra onde ir: página > 1 (voltar) OU lista cheia
            (avançar). Antes só renderizava com lista CHEIA → na última página sumia
            inteira e não dava pra VOLTAR (Pedro 2026-07-06). */}
        {!search && (page > 1 || listHydrated.length === PAGE_SIZE) && (
          <Pagination currentPage={page} hasNext={listHydrated.length === PAGE_SIZE} />
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

  return (
    <Card
      variant="elevated"
      className={cn(
        "overflow-hidden",
        isChampion ? "border-brand-primary shadow-[var(--glow-brand)]" : undefined
      )}
    >
      <CardContent className="space-y-3 overflow-hidden">
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
            pct={row.xpPct}
            size={56}
          />
          {/* Medalha ENTRE a foto e o nome (fiel ao Dota) e GRANDE — o pódio dá
              destaque máximo ao rank. FONTE ÚNICA (SeasonRankMedal) = MESMA do hover. */}
          <SeasonRankMedal mmr={row.mmr} position={position} size="xl" className="shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-2xl 2xl:text-3xl uppercase tracking-wide text-text-display truncate">
              {row.username ?? t("anonymous")}
            </p>
            <p className="font-display text-base 2xl:text-lg font-semibold tabular-nums text-gold">
              {row.mmr} <span className="text-gold-muted">MMR</span>
            </p>
          </div>
        </UserHoverCard>
        <div className="flex flex-col gap-3 border-t border-border-subtle pt-3">
          {/* Vitrine: só redes vinculadas (sem placeholders). */}
          <SocialIconsRow
            links={row.socialLinks}
            onlyLinked
            size={16}
            className="flex items-center gap-2.5"
          />
          {/* Pódio mostra as MESMAS stats da linha (Pedro 2026-07-04) — antes só V/D.
              fluid: colunas dividem a largura do card (nunca vazam em nenhuma resolução). */}
          <RankStats row={row} fluid />
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
  fluid = false,
  className,
}: {
  value: string | number;
  label: string;
  tone?: "gold" | "win" | "loss" | "body";
  /** Pódio: colunas dividem a largura do card (flex-1) em vez de largura fixa —
   *  nunca vazam, em nenhuma resolução. A linha (full-width) segue com largura fixa. */
  fluid?: boolean;
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
    <div
      className={cn(
        "text-center",
        fluid ? "min-w-0 flex-1" : "w-16 shrink-0 2xl:w-24",
        className
      )}
    >
      <p
        className={cn(
          "font-display-condensed font-bold tabular-nums leading-none",
          fluid ? "truncate text-xl 2xl:text-2xl" : "text-2xl 2xl:text-3xl",
          toneClass
        )}
      >
        {value}
      </p>
      <p className="mt-1 font-display text-[0.7rem] uppercase tracking-wide text-text-faded 2xl:text-xs">{label}</p>
    </div>
  );
}

// Bloco de stats reutilizado pela LINHA e pelo PÓDIO (Top 3) — o pódio mostra as
// MESMAS estatísticas da linha (Pedro 2026-07-04), só muda o container visual.
function RankStats({
  row,
  fluid = false,
  className,
}: {
  row: RankRow;
  fluid?: boolean;
  className?: string;
}) {
  const t = useTranslations("ranking");
  const winrate =
    row.partidas_total > 0 ? Math.round((row.vitorias / row.partidas_total) * 100) : null;
  // fluid (pódio): container ocupa a largura toda do card e as colunas se dividem;
  // as opcionais aparecem por breakpoint mas SEM largura fixa → nunca vazam.
  return (
    <div className={cn("flex items-center", fluid ? "w-full min-w-0" : undefined, className)}>
      <StatCol value={row.mmr} label={t("statMmr")} tone="gold" fluid={fluid} />
      <StatCol value={row.mvps} label={t("statMvps")} tone="gold" fluid={fluid} />
      <StatCol value={row.partidas_total} label={t("statMatches")} fluid={fluid} className="hidden sm:block" />
      <StatCol value={row.vitorias} label={t("statWins")} tone="win" fluid={fluid} className="hidden md:block" />
      <StatCol value={row.derrotas} label={t("statLosses")} tone="loss" fluid={fluid} className="hidden md:block" />
      <StatCol
        value={winrate === null ? "—" : `${winrate}%`}
        label={t("statWinrate")}
        fluid={fluid}
        className="hidden lg:block"
      />
    </div>
  );
}

function RankingRow({ row, position }: { row: RankRow; position: number }) {
  const t = useTranslations("ranking");

  return (
    <li className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-base p-3 transition-colors hover:border-border-brand">
      {/* Posição no ranking = valor/progresso → GOLD (Pedro 2026-06-11) */}
      <span className="w-12 shrink-0 text-center font-display text-2xl 2xl:text-3xl tabular-nums text-gold">#{position}</span>
      {/* Identidade (link) + redes lado a lado — as redes ficam FORA do link
          (âncora dentro de âncora é HTML inválido) mas coladas ao nome. */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <UserHoverCard userId={row.user_id} className="flex min-w-0 items-center gap-3">
          <XpAvatarRing
            src={row.avatar_url ?? undefined}
            alt={row.username ?? t("anonymous")}
            fallback={(row.username ?? "??").slice(0, 2)}
            level={row.level}
            pct={row.xpPct}
            size={40}
          />
          {/* Medalha ENTRE a foto e o nome (fiel ao Dota 2) — FONTE ÚNICA
              (SeasonRankMedal), MESMA medalha do hover. */}
          <SeasonRankMedal mmr={row.mmr} position={position} size="lg" className="shrink-0" />
          <p className="min-w-0 truncate font-body text-lg 2xl:text-xl font-medium text-text-display hover:text-brand-primary transition-colors">
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
      {/* Colunas de stats (MMR, MVPs, Partidas, V, D, Winrate) — as MESMAS do pódio. */}
      <RankStats row={row} />
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
function Pagination({ currentPage, hasNext }: { currentPage: number; hasNext: boolean }) {
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
      {/* "Próxima" só quando a lista veio CHEIA (pode haver mais) — senão levava a uma
          página vazia (Pedro 2026-07-06). */}
      {hasNext && (
        <Link
          href={`/ranking?page=${currentPage + 1}`}
          className="font-display text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          {t("nextPage")}
        </Link>
      )}
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
