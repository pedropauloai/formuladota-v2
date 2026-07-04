// ProfilePage — orquestrador do conteúdo do /me (Phase 9.1 — drag widgets).
//
// LAYOUT (Pedro 2026-05-26 — drag completo confirmado):
//   ┌─────────────────────────────────────────────────────────────────┐
//   │ [○ PERFIL / HISTÓRICO / CONQUISTAS / CONDUTA]                   │ ← submenu fixed
//   ├─────────────────────────────────────────────────────────────────┤
//   │ [Avatar] NOME (28px)                          [EDITAR PERFIL]   │ ← header âncora
//   │   XL     [ícones sociais]                                       │   (NÃO arrastável)
//   ├─────────────────────────────────────────────────────────────────┤
//   │                                                                  │
//   │ ┌─ DashboardGrid (react-grid-layout, 12 cols, drag em edit) ───┐ │
//   │ │ [Medalhas]      [Stats]                                       │ │
//   │ │ [Status]                                                      │ │
//   │ │ [Heróis]                                                      │ │
//   │ └────────────────────────────────────────────────────────────────┘ │
//   └─────────────────────────────────────────────────────────────────┘
//
// Avatar+nome = ÂNCORA FIXA (canto superior esquerdo, NÃO arrastável).
// Medalhas, Stats, Status, Heróis = WIDGETS arrastáveis em edit mode.
//
// Default layout dos widgets é CENTRALIZADO (cols 3-10) pra evitar bater com
// mini-profile expanded (fixed left-4 bottom-4 w-380px). User PODE arrastar
// widgets pra cols 0-2 (sobre mini) se quiser — sem bloqueio.
//
// EDIÇÃO INLINE: editing=true via searchParams ?edit=1 → widgets passam editing
// pra Status/Heroes (editor inline) + DashboardGrid ativa drag/resize.
//
// Server Component — sem "use client". DashboardGrid é Client Component
// (react-grid-layout precisa de DOM measure).

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedalPair } from "@/components/ui/medal-pair";
import { mmrToDotaRank } from "@/components/queue/queue-helpers";
import { mmrToTier, IMMORTAL_ELITE_TOP, IMMORTAL_LEADERBOARD_TOP } from "@/lib/mmr";
import { ProfileTabs, type ProfileTab } from "./profile-tabs";
import { SocialIconsRow } from "./social-icons-row";
import { ValveCredential } from "./valve-credential";
import { SyncSteamButton } from "./sync-steam-button";
import { steam64To32 } from "@/lib/dota/opendota";
import { DashboardGrid } from "./dashboard-grid";
import { TabHistorico } from "./tab-historico";
import { TabConquistas } from "./tab-conquistas";
import { TabConduta } from "./tab-conduta";
import { TabProgresso } from "./tab-progresso";
import { AvatarPortraitEdit } from "./avatar-portrait-edit";
import { NickEditor, SocialLinksEditor } from "./inline-edit-controls";
import { ResetLayoutButton } from "./reset-layout-button";
import { ProfileFriendButton, type ProfileFriendState } from "./profile-friend-button";
import type { StatBlock } from "./profile-stats-card";
import {
  CareerIdentityInline,
  CareerLinkSteamCta,
} from "./career-stats";
import { getHeroById, type HeroData } from "@/lib/queries/heroes";
import { BackgroundPicker } from "./background-picker";
import type { ProfileForMe } from "@/lib/queries/profile";
import type { CareerStats } from "@/lib/dota/career";
import type { DotaRank } from "@/components/ui/dota-rank-medal";
import type { HonorRank } from "@/components/ui/honor-rank-medal";
import type { CoachingReview } from "@/lib/queries/coaching-reviews";

interface Props {
  profile: ProfileForMe;
  activeTab: ProfileTab;
  dotaRank: DotaRank;
  honorRank: HonorRank;
  /** Nível da conta + progresso de XP no nível (0-1) — anel de XP do header. */
  level: number;
  xpPct?: number;
  editing: boolean;
  /** Stats de carreira OpenDota (cache 24h) — null = sem Steam/sem dados. */
  career: CareerStats | null;
  /** Análises de coaching recebidas (sessões coachadas) — aba Conduta. */
  coachingReviews: CoachingReview[];
  /** Perfil do PRÓPRIO user (/me) vs. perfil PÚBLICO de outro. @default true.
   *  Quando false: sem edição, sem ações self-only, abas/rotas apontam pro
   *  perfil público e abas self-only (Progresso) ficam ocultas. */
  isOwn?: boolean;
  /** UUID do dono do perfil — usado pra montar as rotas das abas no modo público. */
  ownerUserId?: string;
  /** Hexágono "Conta geral" (carreira STRATZ). null = sem Steam/sem dados. */
  general?: StatBlock | null;
  /** Hexágono "FormulaDota" (partidas da liga). null = sem partidas. */
  fdota?: StatBlock | null;
  /** Estado da amizade com o viewer (só perfil público) → botão no header. */
  friendState?: ProfileFriendState;
  friendshipId?: string | null;
  /** Posição no leaderboard de Imortais (null se abaixo do piso). elite = medalha vermelha. */
  immortalRank?: { position: number; elite: boolean } | null;
}

export function ProfilePage({
  profile,
  activeTab,
  dotaRank,
  honorRank,
  level,
  xpPct = 0,
  editing,
  career,
  coachingReviews,
  isOwn = true,
  ownerUserId,
  general = null,
  fdota = null,
  friendState,
  friendshipId = null,
  immortalRank = null,
}: Props) {
  const t = useTranslations("perfil");
  // Rank FormulaDota (Eixo 2, sazonal) — 3º selo, só quando há MMR de temporada.
  // Leaderboard de Imortais (estilo oficial Dota): #1–#10 medalha ESCURA (anel),
  // #11–#30 medalha VERMELHA, ambas com a POSIÇÃO (#N) gravada na placa.
  const lbPos = immortalRank && immortalRank.position <= IMMORTAL_LEADERBOARD_TOP
    ? immortalRank.position
    : null;
  const seasonRank =
    profile.mmr === null
      ? undefined
      : lbPos != null && lbPos <= IMMORTAL_ELITE_TOP
        ? "immortal-leaderboard"
        : lbPos != null
          ? "immortal-top-100"
          : mmrToDotaRank(profile.mmr);
  const seasonLeaderboardNumber = lbPos ?? undefined;
  // Estrelas da sub-divisão (1–5). SKILL Valve = unidade do rank_tier (medalha×10+estrela);
  // sem rank Valve, o selo cai no MMR da liga → mesmas estrelas do sazonal.
  const seasonStars = profile.mmr !== null ? mmrToTier(profile.mmr).stars : undefined;
  const dotaStars = career?.rankTier ? career.rankTier % 10 : seasonStars;
  // Navegação coerente: próprio = /me; público = /perfil/u/[id]. Todas as abas
  // funcionam pra qualquer user (Progresso/Conquistas lidos por userId; o
  // histórico de XP e o coaching, que são pessoais, ficam ocultos no público).
  const basePath = isOwn ? "/me" : `/perfil/u/${ownerUserId}`;

  // Heróis DESTAQUE (híbrido, Pedro 2026-07-01): os que o user FIXOU primeiro, e o
  // resto preenchido automaticamente pelos melhores por estatística (career.topHeroes).
  // Assim a seção nunca fica vazia (perfil novo já mostra os melhores) e ainda preserva
  // a expressão (o user fixa/troca no editor). pinned=true → "fixado"; false → "auto".
  const pinnedHeroes = profile.favoriteHeroes;
  const pinnedSlugs = new Set(pinnedHeroes.map((h) => h.slug));
  const autoHeroes: HeroData[] = [];
  for (const th of career?.topHeroes ?? []) {
    if (pinnedHeroes.length + autoHeroes.length >= 3) break;
    const h = getHeroById(th.heroId);
    if (h && !pinnedSlugs.has(h.slug) && !autoHeroes.some((a) => a.slug === h.slug)) {
      autoHeroes.push(h);
    }
  }
  const featuredHeroes: { hero: HeroData; pinned: boolean }[] = [
    ...pinnedHeroes.map((hero) => ({ hero, pinned: true })),
    ...autoHeroes.map((hero) => ({ hero, pinned: false })),
  ].slice(0, 3);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* ──────────────────────────────────────────────────────────────
          SUBMENU SUPERIOR — FIXED de uma ponta a outra. Avatar 1:1 ao
          lado de "Perfil" + separadores "/" entre tabs.
          ────────────────────────────────────────────────────────────── */}
      <div className="fixed top-12 xl:top-14 left-0 right-0 z-[22] flex items-center justify-center px-6 py-1.5 border-b border-brand-primary/20 bg-bg-deep/40 backdrop-blur-xl shadow-md shadow-black/40">
        <ProfileTabs
          activeTab={activeTab}
          avatarUrl={profile.avatarUrl}
          basePath={basePath}
        />
      </div>

      {/* Spacer pro submenu fixed */}
      <div className="h-9 shrink-0" aria-hidden="true" />

      {activeTab === "perfil" && (
        <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden p-6">
          {/* Botão EDITAR — topo direito (só fora de edição). O salvar fica no RODAPÉ. */}
          {isOwn && !editing && (
            <div className="absolute right-2 top-2 z-10">
              <Link href="/me?edit=1">
                <Button variant="cinematic" size="sm">
                  <Pencil size={12} aria-hidden="true" />
                  {t("editProfile")}
                </Button>
              </Link>
            </div>
          )}

          {/* Perfil público: gestão de amizade (adicionar/aceitar/remover) — aqui,
              não no mini-perfil/hover (Pedro 2026-07-01). */}
          {!isOwn && ownerUserId && friendState && (
            <div className="absolute right-2 top-2 z-10">
              <ProfileFriendButton
                targetUserId={ownerUserId}
                friendshipId={friendshipId}
                initial={friendState}
              />
            </div>
          )}

          {/* ─── HEADER ÂNCORA — avatar + nome + tag FORMULADOTA ───
              Herói nº 1 da carreira como backdrop VIVO (vídeo Valve em
              opacidade baixa + gradiente — atmosfera, não compete com o nome).
              CARREIRA ENCAIXADA AQUI (2026-06-11): medalha Valve + winrate +
              TOP {n} + top 3 heróis vivos na MESMA linha do header — nada de
              seção nova empilhada (feedback Pedro: zero rolagem extra). */}
          {/* Header SEM vídeo de herói no fundo (Pedro 2026-07-01): mostrava o
              próprio herói principal do user atrás dele (ex.: Tinker sobre Tinker)
              e poluía. Fundo = o premium global; um dia o user escolhe um bg da
              biblioteca de assets (slot cosmético profile_theme). */}
          <header className="relative mb-4 shrink-0 overflow-hidden rounded-sm border border-border-subtle/60 bg-bg-elevated/30">
            <div className="relative flex items-center gap-5 p-4">
              {/* Avatar — em edição vira editável NO PRÓPRIO avatar (popover de
                  câmera com upload + retrato), sem componente/card separado. */}
              <AvatarPortraitEdit
                editing={isOwn && editing}
                avatarSrc={profile.avatarUrl ?? undefined}
                avatarAlt={t("avatarAlt", { name: profile.username ?? t("anonymous") })}
                fallback={(profile.username ?? "??").slice(0, 2).toUpperCase()}
                level={level}
                xpPct={xpPct}
                userId={profile.userId}
                initialAvatar={profile.avatarUrl}
                initialPortrait={profile.heroPortraitSlug}
              />
              {/* Medalhas ENTRE a foto e o nome — fiel ao cliente Dota 2 (a patente
                  vive coladinha ao retrato, antes da identidade). Pedro 2026-07-02. */}
              {/* Entre foto e nome ficam SÓ as medalhas do NOSSO sistema (rank
                  sazonal + honra). A Valve saiu do par (skillInline=false) e virou
                  credencial discreta ao lado do nome. Pedro 2026-07-02. */}
              <MedalPair
                dotaRank={dotaRank}
                dotaStars={dotaStars}
                honorRank={honorRank}
                seasonRank={seasonRank}
                seasonStars={seasonStars}
                seasonLeaderboardNumber={seasonLeaderboardNumber}
                skillInline={false}
                size="md"
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-[28px] font-bold text-text-display leading-tight truncate">
                    {profile.username ?? t("anonymous")}
                  </h1>
                  {/* Posição no leaderboard de Imortais (#N) — acima do piso Imortal,
                      o que vale é a POSIÇÃO. Elite (top N) em vermelho. */}
                  {immortalRank && (
                    <span
                      className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-display-condensed text-base font-bold tabular-nums leading-none ${
                        immortalRank.elite
                          ? "border-brand-primary/50 bg-brand-primary/15 text-brand-primary"
                          : "border-gold/40 bg-gold/10 text-gold"
                      }`}
                      title={t("immortalRankTitle", { position: immortalRank.position })}
                    >
                      #{immortalRank.position}
                    </span>
                  )}
                  {/* Credencial da CONTA Valve — medalha pequena/dimmed + link STRATZ.
                      Info da conta preservada, mas SEM competir com a nossa medalha
                      (Pedro 2026-07-02). Só quando há carreira Valve (rank real). */}
                  {career && (
                    <ValveCredential
                      rank={dotaRank}
                      stars={dotaStars}
                      stratzHref={
                        profile.steamId64
                          ? `https://stratz.com/players/${steam64To32(profile.steamId64)}`
                          : undefined
                      }
                      stratzLabel={t("viewStratzProfile")}
                    />
                  )}
                  {/* Sincronizar identidade com a Steam AGORA (fura cache 1h) — só no próprio. */}
                  {isOwn && profile.steamId64 && <SyncSteamButton />}
                  {/* Botão de nick oficial COLADO ao nome (fácil de achar ao editar). */}
                  {isOwn && editing && (
                    <NickEditor currentNick={profile.username} alreadySet={profile.officialNickSet} />
                  )}
                </div>
                {/* Redes sociais sob o nick — refletem a conta do LOGIN, então só
                    aparecem no próprio perfil (evita mostrar o social do viewer). */}
                {/* Redes sociais sob o nick — em TODOS os perfis (Pedro 2026-07-01):
                    os ícones são placeholders idênticos pra todos (Discord conectado,
                    já que todo login é via Discord; o resto "em breve"), então não
                    expõem dado do viewer. Antes só apareciam no próprio (isOwn) e o
                    perfil público ficava sem — inconsistente. */}
                <span className="mt-1.5 flex items-center gap-2.5">
                  <SocialIconsRow links={profile.socialLinks} className="flex items-center gap-2.5" />
                  {/* Botão de redes COLADO à fileira (fácil de achar ao editar). */}
                  {isOwn && editing && <SocialLinksEditor initial={profile.socialLinks} />}
                </span>
              </div>

              {/* ── Cluster direito: só o resumo de carreira (winrate + TOP). As
                  medalhas agora ficam coladas ao nome (padrão Dota 2), liberando a
                  direita e mantendo o topo harmônico (Pedro 2026-07-01). ── */}
              {career ? (
                <div className="hidden shrink-0 md:block">
                  {/* showMedal=false: a patente Valve já está ao lado do nome. */}
                  <CareerIdentityInline career={career} showMedal={false} />
                </div>
              ) : (
                <CareerLinkSteamCta className="hidden shrink-0 md:inline-flex" />
              )}
            </div>
          </header>

          {/* ─── DASHBOARD GRID — preenche a altura restante (zero scroll de página).
              A média recente STRATZ/OpenDota agora vive DENTRO do widget Stats. ─── */}
          <div className="min-h-0 flex-1">
            <DashboardGrid
              initialLayout={profile.dashboardLayout}
              editing={editing}
              data={{
                general,
                fdota,
                favoriteHeroes: profile.favoriteHeroes,
                featuredHeroes,
              }}
            />
          </div>

          {/* ─── RODAPÉ de edição — salvar fica embaixo (Pedro 2026-06-30). ─── */}
          {isOwn && editing && (
            <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-3">
              {/* Nick oficial + redes agora ficam COLADOS às informações no header
                  (fáceis de achar ao editar) — saíram daqui. Pedro 2026-07-02. */}
              {/* Trocar fundo → popup com preview em tempo real (slot profile_theme). */}
              <BackgroundPicker />
              <ResetLayoutButton />
              <Link href="/me">
                <Button variant="cinematic" size="sm">
                  <Check size={14} aria-hidden="true" />
                  Salvar e sair
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === "historico" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <TabHistorico userId={profile.userId} />
        </div>
      )}

      {activeTab === "conquistas" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <TabConquistas userId={profile.userId} />
        </div>
      )}

      {activeTab === "conduta" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <TabConduta
            honorRank={honorRank}
            behaviorStatus={profile.behaviorStatus}
            doctrineAcceptedAt={profile.doctrineAcceptedAt}
            commends={null /* V2: RPC get_user_commends */}
            strikes={null /* V2: RPC get_user_strikes */}
            coachingReviews={coachingReviews}
          />
        </div>
      )}

      {activeTab === "progresso" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <TabProgresso
            userId={profile.userId}
            isOwn={isOwn}
            persona={profile.username ?? ""}
            avatar={profile.avatarUrl}
          />
        </div>
      )}
    </div>
  );
}
