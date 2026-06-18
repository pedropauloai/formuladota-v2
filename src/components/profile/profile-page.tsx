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

import Link from "next/link";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
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
import {
  PortraitEditor,
  AvatarEditor,
} from "./inline-edit-controls";
import { ResetLayoutButton } from "./reset-layout-button";
import {
  CareerIdentityInline,
  SignatureHeroesStrip,
  CareerLinkSteamCta,
} from "./career-stats";
import { HeroVideoBackdrop } from "@/components/dota/hero-video-backdrop";
import { getHeroById } from "@/lib/queries/heroes";
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
}

export function ProfilePage({
  profile,
  activeTab,
  dotaRank,
  honorRank,
  editing,
  career,
  coachingReviews,
}: Props) {
  const ranqueado = profile.mmr !== null;

  // Herói nº 1 da carreira → backdrop VIVO do header de identidade
  const topHeroStat = career?.topHeroes[0] ?? null;
  const topHero = topHeroStat ? getHeroById(topHeroStat.heroId) : null;

  return (
    <div className="relative flex flex-col min-h-full">
      {/* ──────────────────────────────────────────────────────────────
          SUBMENU SUPERIOR — FIXED de uma ponta a outra. Avatar 1:1 ao
          lado de "Perfil" + separadores "/" entre tabs.
          ────────────────────────────────────────────────────────────── */}
      <div className="fixed top-12 xl:top-14 left-0 right-0 z-[22] flex items-center justify-center px-6 py-1.5 border-b border-brand-primary/20 bg-bg-deep/40 backdrop-blur-xl shadow-md shadow-black/40">
        <ProfileTabs activeTab={activeTab} avatarUrl={profile.avatarUrl} />
      </div>

      {/* Spacer pro submenu fixed */}
      <div className="h-9 shrink-0" aria-hidden="true" />

      {activeTab === "perfil" && (
        <div className="relative flex flex-col flex-1 min-h-0 p-6">
          {/* Controles de edição — absolute top-right, respeita right-sidebar.
              Em edit mode: [Restaurar padrão] + [Sair da edição].
              Em leitura:   [Editar Perfil]. */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            {editing ? (
              <>
                <ResetLayoutButton />
                <Link href="/me">
                  <Button variant="secondary" size="sm">
                    <X size={12} aria-hidden="true" />
                    Sair da edição
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/me?edit=1">
                <Button variant="cinematic" size="sm">
                  <Pencil size={12} aria-hidden="true" />
                  Editar Perfil
                </Button>
              </Link>
            )}
          </div>

          {/* ─── HEADER ÂNCORA — avatar + nome + tag FORMULADOTA ───
              Herói nº 1 da carreira como backdrop VIVO (vídeo Valve em
              opacidade baixa + gradiente — atmosfera, não compete com o nome).
              CARREIRA ENCAIXADA AQUI (2026-06-11): medalha Valve + winrate +
              TOP {n} + top 3 heróis vivos na MESMA linha do header — nada de
              seção nova empilhada (feedback Pedro: zero rolagem extra). */}
          <header className="relative mb-6 overflow-hidden rounded-sm">
            {topHero && (
              <HeroVideoBackdrop
                heroSlug={topHero.slug}
                heroName={topHero.name_pt}
                gradientClass="bg-gradient-to-r from-bg-deep/70 via-bg-deep/20 to-bg-deep/80"
              />
            )}
            <div className={`relative flex items-center gap-5 ${topHero ? "p-4" : ""}`}>
              <UserAvatar
                src={profile.avatarUrl ?? undefined}
                alt={`Avatar de ${profile.username ?? "Anônimo"}`}
                fallback={(profile.username ?? "??").slice(0, 2).toUpperCase()}
                size="xl"
                ringColor={ranqueado ? "brand" : null}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-[28px] font-bold text-text-display leading-tight truncate">
                    {profile.username ?? "Anônimo"}
                  </h1>
                  {/* Logo Steam ao lado do nick → perfil do usuário no STRATZ
                      (Pedro 2026-06-12). Identidade = Steam; STRATZ = vitrine. */}
                  {profile.steamId64 && (
                    <Tooltip content="Ver perfil no STRATZ" side="bottom" focusable={false}>
                      <a
                        href={`https://stratz.com/players/${steam64To32(profile.steamId64)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Perfil no STRATZ"
                        className="text-text-muted transition-colors hover:text-text-display"
                      >
                        <SteamIcon size={20} />
                      </a>
                    </Tooltip>
                  )}
                  {/* Sincronizar identidade com a Steam AGORA (fura cache 1h) */}
                  {profile.steamId64 && <SyncSteamButton />}
                </div>
                {/* Redes sociais sob o nick (substitui o "FORMULADOTA" fixo,
                    Pedro 2026-06-12) — Discord aceso (conta do login); demais
                    acenderão quando o multi-login de validação existir. */}
                <SocialIconsRow />
              </div>

              {/* Par canônico SKILL + HONOR (mandamento M12) — sempre visível
                  no header; hover abre o showcase de todas as medalhas. */}
              <MedalPair
                dotaRank={dotaRank}
                honorRank={honorRank}
                size="md"
                className="shrink-0"
              />

              {/* Carreira inline — some em telas estreitas pra NUNCA quebrar
                  linha e esticar o header (altura ≤ avatar XL de 96px). */}
              {career ? (
                <div className="hidden md:flex items-center gap-5 shrink-0">
                  {/* showMedal=false: a medalha Valve já está no par canônico ao lado */}
                  <CareerIdentityInline career={career} showMedal={false} />
                  <SignatureHeroesStrip career={career} className="hidden xl:flex" />
                </div>
              ) : (
                <CareerLinkSteamCta className="hidden md:inline-flex shrink-0" />
              )}
            </div>
          </header>

          {/* ─── DASHBOARD GRID — widgets arrastáveis (drag em edit mode) ─── */}
          <DashboardGrid
            initialLayout={profile.dashboardLayout}
            editing={editing}
            data={{
              dotaRank,
              honorRank,
              ranqueado,
              partidas: profile.partidas,
              vitorias: profile.vitorias,
              derrotas: profile.derrotas,
              mmr: profile.mmr,
              statusMessage: profile.statusMessage,
              favoriteHeroes: profile.favoriteHeroes,
              // Veterania de carreira → células extras DENTRO do widget Stats
              // (altura do widget é fixa pelo grid — página não cresce)
              careerTotals: career?.totals ?? null,
            }}
          />

          {/* ─── Editores adicionais (avatar custom + hero portrait) — só em edit ─── */}
          {editing && (
            <div className="mt-6 space-y-4 max-w-md">
              <PortraitEditor initialPortrait={profile.heroPortraitSlug} />
              <AvatarEditor userId={profile.userId} initialAvatar={profile.avatarUrl} />
            </div>
          )}
        </div>
      )}

      {activeTab === "historico" && (
        <div className="flex-1 min-h-0 p-6">
          <TabHistorico />
        </div>
      )}

      {activeTab === "conquistas" && (
        <div className="flex-1 min-h-0 p-6">
          <TabConquistas />
        </div>
      )}

      {activeTab === "conduta" && (
        <div className="flex-1 min-h-0 p-6">
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
        <div className="flex-1 min-h-0 p-6">
          <TabProgresso />
        </div>
      )}
    </div>
  );
}
