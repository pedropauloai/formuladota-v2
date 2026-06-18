// ClientShell — Sistema CANÔNICO da plataforma (2026-05-24).
//
// Fiel ao client do Dota 2 REAL: 3 colunas (sidebar esquerda com amigos +
// centro + sidebar direita contextual com matchmaking + bottom-bar com
// [JOGAR DOTA] verde). Referências visuais na raiz do projeto:
//   - dota 2 menu.png             (Dota 2 real)
//   - dashboard-current.png       (FormulaDota /dashboard já fiel)
//   - menu lateral - competitiva.png       (sidebar direita matchmaking)
//   - menu lateral - salas personalizadas.png
//
// Server Component que fetcha dados do user (profile, steam) + MVP (saldo
// fichas, PROs online, package ficha) e passa pra top-bar + sidebars +
// bottom-bar.
//
// Histórico: Sistema B (templates/client-shell.tsx — sem sidebars, estilo
// Riot/Valorant) foi @deprecated 2026-05-24 e deletado após migração das
// 6 páginas órfãs (/me, /perfil, /partidas, /pacotes, /codigo-de-conduta,
// /metodologia). Tasks #50-#54 + #57 concluídas.
//
// VISITANTE DESLOGADO (task #63 — 2026-05-24): shell NÃO redireciona mais
// pra /login. Visitante sem sessão (user === null) consome o shell normalmente
// com dados privados zerados/null. Filosofia "tudo é client" — base das
// tasks #64-#68 (HUB visitante, /coaches, /login deletado, Header global morre).
//
// 2 modos:
// - default (grid): layout 3-col, sidebars com bg sólido cortando o background
// - immersive: background fullscreen, sidebars como overlays flutuantes
//   (espelha cliente Dota 2 — usado em /dashboard)

import { createClient } from "@/lib/supabase/server";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import { getProsWithQueues } from "@/lib/queries/pros";
import { getFichaPackage } from "@/lib/queries/packages";
import { getMyQueueStatus, getSearchingCount } from "@/lib/queries/queue";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";
import { getSidebarExpanded } from "@/lib/auth/sidebar-preference";
import { getFriendsPanel } from "@/lib/queries/friends";
import { getMyOpenLobby, getMyLobbyInvites } from "@/lib/queries/lobby-social";
import { xpProgress } from "@/lib/levels";
import { getPlayMenuState } from "@/lib/play-menu-preference";
import { DashboardTopBar } from "./top-bar";
import { displayName, displayAvatar } from "@/lib/identity";
import { MiniProfilePanel } from "./mini-profile-panel";
import { LobbyInviteListener } from "./lobby-invite-listener";
import { DashboardRightSidebar } from "./right-sidebar";
import { DashboardBottomBar } from "./bottom-bar";

interface ClientShellProps {
  /** Conteúdo do center panel — área entre top-bar e bottom-bar. */
  children: React.ReactNode;
  /** Rota atual — destaca tab ativa no top-bar. */
  currentRoute?: string;
  /** Override do right sidebar (raro — quando page tem widget próprio). */
  rightSidebar?: React.ReactNode;
  /** Esconde left sidebar (admin tem sidebar interna). */
  hideLeftSidebar?: boolean;
  /** Right sidebar largo (~520px). */
  wideRightSidebar?: boolean;
  /**
   * Esconde a right-sidebar por completo — o main ocupa a largura toda, então
   * o conteúdo centraliza no centro REAL da tela. Usado em páginas institucionais
   * full-width (metodologia, conduta) onde a leitura/marketing domina e a
   * sidebar de PROs/comunidade deslocaria o eixo visual.
   */
  hideRightSidebar?: boolean;
  /** Modo immersive: background fullscreen + sidebars overlay (default /dashboard). */
  immersive?: boolean;
  /** Imagem hero de background. */
  centerHero?: string;
  /**
   * Esconde a bottom-bar (botão Jogar Dota). Usado em /dashboard onde o
   * HeroState já tem CTA dominante — bottom-bar duplicaria ação.
   * Em outras rotas (admin, perfil) mantém bottom-bar como atalho persistente.
   */
  hideBottomBar?: boolean;
}

export async function ClientShell({
  children,
  currentRoute,
  rightSidebar,
  hideLeftSidebar,
  wideRightSidebar,
  hideRightSidebar,
  immersive,
  centerHero,
  hideBottomBar,
}: ClientShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Visitante deslogado: shell tolera user === null sem redirect (task #63).
  // Fetches privados (profile, steam, fichas, fila, etc.) ficam null/0/[].
  // Fetches públicos (PROs online + package) sempre rodam.
  const isVisitor = user === null;

  const [
    privateData,
    prosWithQueues,
    fichaPackage,
    previewActive,
    sidebarExpanded,
    friendsPanel,
    searchingCount,
    playMenuState,
    myOpenLobby,
    lobbyInvites,
  ] = await Promise.all([
    isVisitor ? Promise.resolve(null) : fetchPrivateData(supabase, user.id),
    getProsWithQueues(),
    getFichaPackage(),
    // Preview mode só faz sentido pra admin logado — pra visitante retorna false.
    isVisitor ? Promise.resolve(false) : getPreviewModeActive(),
    // Cookie sidebar_expanded lido no SSR — sem flash no hydration (Pitfall 1 RESEARCH).
    getSidebarExpanded(),
    // Amigos aceitos + pedidos pendentes — visitante não tem amigos.
    isVisitor
      ? Promise.resolve({ friends: [], pending: [] })
      : getFriendsPanel(),
    getSearchingCount(),
    // Estado do menu Jogar Dota (cookie) — persiste expand/collapse + sala entre rotas.
    getPlayMenuState(),
    // Sala ABERTA em que o user está (habilita "Convidar pra sala" nos amigos).
    isVisitor ? Promise.resolve(null) : getMyOpenLobby(supabase, user.id),
    // Convites de sala recebidos — banner global (LobbyInviteListener).
    isVisitor ? Promise.resolve([]) : getMyLobbyInvites(supabase, user.id),
  ]);

  const profile = privateData?.profile ?? null;
  const steamLink = privateData?.steamLink ?? null;
  const proPromotion = privateData?.proPromotion ?? null;
  const fichaBalance = privateData?.fichaBalance ?? 0;
  const myQueues = privateData?.myQueues ?? [];
  // Nível + barra de XP + saldo de permissões (pro mini-profile / avatar-ring).
  const userLevel = privateData?.level ?? 1;
  const userXpPct = privateData?.xpPct ?? 0;
  const matchPermissions = privateData?.permissions ?? 0;

  const prosOnline = prosWithQueues.map((p) => p.coach);
  // Pedro 2026-05-26: StickyQueueBanner antigo foi REMOVIDO. Status "Na fila"
  // agora vive como pílula DENTRO da topbar (QueueStatusPill substitui o
  // indicador "X PROs online"). Shell sempre h-screen — zero scroll de página.
  const shellHeightCls = "h-screen";
  // Reserva espaço de bottom-bar (~80-96px). Sem bottom-bar, sidebars/main vão
  // até o fim da viewport.
  const bottomReserveCls = hideBottomBar ? "bottom-0" : "bottom-[80px] xl:bottom-[96px]";
  const mainPbCls = hideBottomBar ? "" : "pb-[80px] xl:pb-[96px] 2xl:pb-[112px]";

  // Flags derivados — todos `false` pra visitante (sem acesso a admin/PRO).
  const realIsAdmin = !isVisitor && profile?.is_admin === true;
  // effectiveIsAdmin: false se admin ativou preview mode (ver como user comum)
  const adminFlag = realIsAdmin && !previewActive;
  // Preview mode também oculta tab PRO contextual (admin vendo como user comum).
  const isPro = !isVisitor && proPromotion != null && !previewActive;
  // Persona/avatar: null pra visitante (LeftSidebar mostra VisitorCard).
  // Identidade canônica via lib/identity (anti-anonimato: Steam > Discord, nunca vazio).
  const identitySrc = {
    steamPersona: steamLink?.persona,
    steamAvatar: steamLink?.avatar_url,
    discordUsername: profile?.username,
    discordAvatar: profile?.avatar_url,
  };
  const persona = isVisitor ? null : displayName(identitySrc);
  const avatar = isVisitor ? null : displayAvatar(identitySrc);
  const userTag = adminFlag ? "ADMIN" : "MEMBER";

  const prosOnlineCount = prosOnline.filter((p) => p.filaAberta).length;

  // ============== Modo IMMERSIVE — overlays sobre background fullscreen ==============
  if (immersive) {
    return (
      // Pedro 2026-05-25: removido bg-black do wrapper (cobria o centerHero
      // que ficava em z=-10 atrás do bg-bg-deep do body). Wrapper agora
      // transparente — centerHero promovido a z-0 renderiza por cima do body.
      <div className={`relative ${shellHeightCls} overflow-hidden`}>
        {centerHero && (
          <div
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%), url(${centerHero})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />
        )}

        <div className="absolute top-0 inset-x-0 z-[var(--z-overlay)]">
          <DashboardTopBar
            currentRoute={currentRoute}
            isVisitor={isVisitor}
            isAdmin={adminFlag}
            realIsAdmin={realIsAdmin}
            previewActive={previewActive}
            isPro={isPro}
            prosOnlineCount={prosOnlineCount}
            searchingCount={searchingCount}
            myQueues={myQueues}
          />
        </div>

        {rightSidebar !== undefined ? (
          <div
            className={`hidden lg:flex absolute right-0 top-[96px] xl:top-[104px] ${bottomReserveCls} z-[var(--z-overlay)] ${
              wideRightSidebar
                ? "w-[480px] xl:w-[520px] 2xl:w-[560px]"
                : "w-[320px] xl:w-[360px] 2xl:w-[380px]"
            }`}
          >
            <aside className="flex w-full flex-col bg-gradient-to-l from-black/80 via-black/60 to-black/30 backdrop-blur-sm overflow-y-auto">
              {rightSidebar}
            </aside>
          </div>
        ) : (
          <div className={`hidden lg:flex absolute right-0 top-[96px] xl:top-[104px] ${bottomReserveCls} z-[var(--z-overlay)] w-[320px] xl:w-[360px] 2xl:w-[380px]`}>
            <DashboardRightSidebar floating />
          </div>
        )}

        {/* Main:
            - top-[64px] continua (logo abaixo topbar). Submenu /me é fixed top-12
              e o spacer h-9 dentro de profile-page.tsx compensa.
            - Padding HORIZONTAL SIMÉTRICO em lg+ (Pedro 2026-05-26): o conteúdo
              fica verdadeiramente centralizado no viewport, não deslocado pra
              esquerda pela right-sidebar. O lado esquerdo livre passa por baixo
              do mini-profile-panel (fixed left-4 bottom-4) — sem sobreposição
              porque o mini só ocupa o canto INFERIOR. */}
        <main
          className={`absolute inset-0 top-[64px] xl:top-[72px] ${bottomReserveCls} z-[var(--z-elevated)] overflow-x-hidden overflow-y-auto lg:pl-[320px] lg:pr-[320px] xl:pl-[360px] xl:pr-[360px] 2xl:pl-[380px] 2xl:pr-[380px]`}
        >
          {children}
        </main>

        {/* Mini-Profile Panel — overlay ancorado bottom-left (estilo Dota 2) */}
        {!hideLeftSidebar && (
          <MiniProfilePanel
            isVisitor={isVisitor}
            persona={persona}
            avatar={avatar}
            tag={userTag}
            isAdmin={adminFlag}
            fichaBalance={fichaBalance}
            level={userLevel}
            xpPct={userXpPct}
            permissions={matchPermissions}
            mmr={profile?.mmr_atual ?? null}
            initialExpanded={sidebarExpanded}
            lockedExpanded={currentRoute === "/"}
            currentUserId={user?.id ?? null}
            initialFriends={friendsPanel.friends}
            initialPending={friendsPanel.pending}
            currentLobbyId={myOpenLobby?.id ?? null}
          />
        )}

        {/* Convites de sala recebidos — banner realtime global */}
        {!isVisitor && user && (
          <LobbyInviteListener userId={user.id} initialInvites={lobbyInvites} />
        )}

        {!hideBottomBar && (
          // pointer-events-none no wrapper full-width pra deixar mini-perfil clicável atrás.
          // O DashboardBottomBar deve usar pointer-events-auto nos botões reais.
          <div className="absolute bottom-0 inset-x-0 z-[var(--z-overlay)] pointer-events-none">
            <DashboardBottomBar
              isVisitor={isVisitor}
              isAdmin={adminFlag}
              fichaBalance={fichaBalance}
              fichaPackageId={fichaPackage?.id ?? null}
              prosOnline={prosOnline}
              myQueues={myQueues}
              initialPlayMenu={playMenuState}
            />
          </div>
        )}
      </div>
    );
  }

  // ============== Modo DEFAULT — grid 3-col ==============
  return (
    <div className={`relative flex ${shellHeightCls} flex-col overflow-hidden bg-black`}>
      <div
        className="pointer-events-none fixed inset-0 z-[var(--z-atmosphere)]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 50% 0%, rgba(172, 29, 14, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(0, 0, 0, 0.95) 0%, transparent 80%),
            linear-gradient(to bottom, var(--color-bg-base) 0%, var(--color-bg-deep) 50%, black 100%)
          `,
        }}
        aria-hidden="true"
      />

      <DashboardTopBar
        currentRoute={currentRoute}
        isVisitor={isVisitor}
        isAdmin={adminFlag}
        realIsAdmin={realIsAdmin}
        previewActive={previewActive}
        isPro={isPro}
        prosOnlineCount={prosOnlineCount}
        searchingCount={searchingCount}
        myQueues={myQueues}
      />

      {/* Grid columns — sidebar lateral REMOVIDA 2026-05-26 (refator pra fidelidade Dota 2).
          Mini-profile + amigos agora é overlay ancorado bottom-left (MiniProfilePanel),
          não coluna. Layout reduzido a main + right-sidebar. */}
      <div
        className={`grid flex-1 min-h-0 grid-cols-1 ${
          hideRightSidebar
            ? "" // sem coluna lateral — main full-width, centraliza no centro real da tela
            : wideRightSidebar
              ? "lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] 2xl:grid-cols-[1fr_560px]"
              : "lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_380px]"
        }`}
      >
        <main className={`relative overflow-x-hidden overflow-y-auto ${mainPbCls}`}>
          {centerHero && (
            <div
              className="pointer-events-none absolute inset-0 z-[var(--z-content)]"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.85) 100%), url(${centerHero})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-hidden="true"
            />
          )}
          <div className="relative z-[var(--z-elevated)] h-full">{children}</div>
        </main>

        {/* Right-sidebar: omitida quando hideRightSidebar (páginas full-width). */}
        {hideRightSidebar ? null : rightSidebar !== undefined ? (
          <aside className="hidden lg:flex flex-col bg-gradient-to-l from-black/80 via-black/60 to-black/30 backdrop-blur-sm overflow-y-auto">
            {rightSidebar}
          </aside>
        ) : (
          <DashboardRightSidebar />
        )}
      </div>

      {/* Mini-Profile Panel — overlay ancorado bottom-left (estilo Dota 2) */}
      {!hideLeftSidebar && (
        <MiniProfilePanel
          isVisitor={isVisitor}
          persona={persona}
          avatar={avatar}
          tag={userTag}
          isAdmin={adminFlag}
          fichaBalance={fichaBalance}
          level={userLevel}
          xpPct={userXpPct}
          permissions={matchPermissions}
          mmr={profile?.mmr_atual ?? null}
          initialExpanded={sidebarExpanded}
          lockedExpanded={currentRoute === "/"}
          currentUserId={user?.id ?? null}
          initialFriends={friendsPanel.friends}
          initialPending={friendsPanel.pending}
          currentLobbyId={myOpenLobby?.id ?? null}
        />
      )}

      {/* Convites de sala recebidos — banner realtime global */}
      {!isVisitor && user && (
        <LobbyInviteListener userId={user.id} initialInvites={lobbyInvites} />
      )}

      {!hideBottomBar && (
        <div className="absolute bottom-0 inset-x-0 z-[var(--z-overlay)] pointer-events-none">
          <DashboardBottomBar
            isVisitor={isVisitor}
            isAdmin={adminFlag}
            fichaBalance={fichaBalance}
            fichaPackageId={fichaPackage?.id ?? null}
            prosOnline={prosOnline}
            myQueues={myQueues}
            initialPlayMenu={playMenuState}
          />
        </div>
      )}
    </div>
  );
}

// Fetcher helper — só roda quando há sessão. Mantém shell legível e isola
// queries privadas em um único Promise.all (latência total ≈ slowest query).
async function fetchPrivateData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const [
    { data: profile },
    { data: steamLink },
    { data: proPromotion },
    fichaBalance,
    myQueues,
    { data: levelRow },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username, avatar_url, role, is_admin, doctrine_quiz_progress, match_permissions_consumed, mmr_atual"
      )
      .eq("id", userId)
      .single(),
    supabase
      .from("steam_links")
      .select("steam_id_64, persona, avatar_url")
      .eq("user_id", userId)
      .single(),
    // Tab contextual PRO no top-bar — visível se user tem promoção ativa/pausada.
    supabase
      .from("pro_promotions")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["active", "paused"])
      .maybeSingle(),
    getMyFichaBalance(userId),
    getMyQueueStatus(userId),
    supabase
      .from("user_levels")
      .select("total_xp_earned")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  // Nível + barra de XP derivados do XP total (espelho da curva no client).
  const { level, pct: xpPct } = xpProgress(levelRow?.total_xp_earned ?? 0);
  // Saldo de permissões = floor(acertos / 5) - consumidas.
  const answered = Array.isArray(profile?.doctrine_quiz_progress)
    ? profile.doctrine_quiz_progress.length
    : 0;
  const permissions = Math.max(
    0,
    Math.floor(answered / 5) - (profile?.match_permissions_consumed ?? 0)
  );

  return {
    profile,
    steamLink,
    proPromotion,
    fichaBalance,
    myQueues,
    level,
    xpPct,
    permissions,
  };
}
