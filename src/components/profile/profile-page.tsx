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
import { ProfileTabs, type ProfileTab } from "./profile-tabs";
import { SocialIconsRow, SteamIcon } from "./social-icons-row";
import { SyncSteamButton } from "./sync-steam-button";
import { Tooltip } from "@/components/ui/tooltip";
import { steam64To32 } from "@/lib/dota/opendota";
import { DashboardGrid } from "./dashboard-grid";
import { TabHistorico } from "./tab-historico";
import { TabConquistas } from "./tab-conquistas";
import { TabConduta } from "./tab-conduta";
import { TabProgresso } from "./tab-progresso";
import { AvatarPortraitEdit } from "./avatar-portrait-edit";
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
}

export function ProfilePage({
  profile,
  activeTab,
  dotaRank,
  honorRank,
  editing,
  career,
  coachingReviews,
  isOwn = true,
  ownerUserId,
  general = null,
  fdota = null,
  friendState,
  friendshipId = null,
}: Props) {
  const t = useTranslations("perfil");
  const ranqueado = profile.mmr !== null;
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
                ringColor={ranqueado ? "brand" : null}
                userId={profile.userId}
                initialAvatar={profile.avatarUrl}
                initialPortrait={profile.heroPortraitSlug}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-[28px] font-bold text-text-display leading-tight truncate">
                    {profile.username ?? t("anonymous")}
                  </h1>
                  {/* Logo Steam ao lado do nick → perfil do usuário no STRATZ
                      (Pedro 2026-06-12). Identidade = Steam; STRATZ = vitrine. */}
                  {profile.steamId64 && (
                    <Tooltip content={t("viewStratzProfile")} side="bottom" focusable={false}>
                      <a
                        href={`https://stratz.com/players/${steam64To32(profile.steamId64)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("stratzProfileAria")}
                        className="text-text-muted transition-colors hover:text-text-display"
                      >
                        <SteamIcon size={20} />
                      </a>
                    </Tooltip>
                  )}
                  {/* Sincronizar identidade com a Steam AGORA (fura cache 1h) — só no próprio. */}
                  {isOwn && profile.steamId64 && <SyncSteamButton />}
                  {/* Medalhas SKILL + HONOR COMPACTAS, coladas ao nome — fiel ao
                      cliente Dota 2 (a patente vive ao lado da identidade), não como
                      medalhões grandes flutuando (Pedro 2026-07-01). Hover = showcase. */}
                  <MedalPair
                    dotaRank={dotaRank}
                    honorRank={honorRank}
                    size="md"
                    className="ml-1.5 shrink-0"
                  />
                </div>
                {/* Redes sociais sob o nick — refletem a conta do LOGIN, então só
                    aparecem no próprio perfil (evita mostrar o social do viewer). */}
                {/* Redes sociais sob o nick — em TODOS os perfis (Pedro 2026-07-01):
                    os ícones são placeholders idênticos pra todos (Discord conectado,
                    já que todo login é via Discord; o resto "em breve"), então não
                    expõem dado do viewer. Antes só apareciam no próprio (isOwn) e o
                    perfil público ficava sem — inconsistente. */}
                <SocialIconsRow />
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
            <div className="mt-3 flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle pt-3">
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
