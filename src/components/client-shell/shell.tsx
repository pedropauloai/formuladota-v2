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
// 2 modos:
// - default (grid): layout 3-col, sidebars com bg sólido cortando o background
// - immersive: background fullscreen, sidebars como overlays flutuantes
//   (espelha cliente Dota 2 — usado em /dashboard)

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import { getProsWithQueues } from "@/lib/queries/pros";
import { getFichaPackage } from "@/lib/queries/packages";
import { getMyQueueStatus } from "@/lib/queries/queue";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";
import { DashboardTopBar } from "./top-bar";
import { DashboardLeftSidebar } from "./left-sidebar";
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
  immersive,
  centerHero,
  hideBottomBar,
}: ClientShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: steamLink },
    { data: proPromotion },
    fichaBalance,
    prosWithQueues,
    fichaPackage,
    previewActive,
    myQueues,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url, role, is_admin")
      .eq("id", user.id)
      .single(),
    supabase
      .from("steam_links")
      .select("steam_id_64, persona, avatar_url")
      .eq("user_id", user.id)
      .single(),
    // Tab contextual PRO no top-bar — visível se user tem promoção ativa/pausada.
    supabase
      .from("pro_promotions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .maybeSingle(),
    getMyFichaBalance(user.id),
    getProsWithQueues(),
    getFichaPackage(),
    getPreviewModeActive(),
    getMyQueueStatus(user.id),
  ]);

  const prosOnline = prosWithQueues.map((p) => p.coach);
  // StickyQueueBanner adiciona ~40px ao topo do viewport quando user está em fila.
  // Shell precisa subtrair essa altura pra não gerar scroll de página.
  const hasBanner = myQueues.length > 0;
  const shellHeightCls = hasBanner
    ? "h-[calc(100dvh-44px)]"
    : "h-screen";
  // Reserva espaço de bottom-bar (~80-96px). Sem bottom-bar, sidebars/main vão
  // até o fim da viewport.
  const bottomReserveCls = hideBottomBar ? "bottom-0" : "bottom-[80px] xl:bottom-[96px]";
  const mainPbCls = hideBottomBar ? "" : "pb-[80px] xl:pb-[96px] 2xl:pb-[112px]";

  const realIsAdmin = profile?.is_admin === true;
  // effectiveIsAdmin: false se admin ativou preview mode (ver como user comum)
  const adminFlag = realIsAdmin && !previewActive;
  // Preview mode também oculta tab PRO contextual (admin vendo como user comum).
  const isPro = proPromotion != null && !previewActive;
  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";
  const avatar = steamLink?.avatar_url ?? profile?.avatar_url ?? null;
  const userTag = adminFlag ? "ADMIN" : "MEMBER";

  const prosOnlineCount = prosOnline.filter((p) => p.filaAberta).length;

  // ============== Modo IMMERSIVE — overlays sobre background fullscreen ==============
  if (immersive) {
    return (
      <div className={`relative ${shellHeightCls} overflow-hidden bg-black`}>
        {centerHero && (
          <div
            className="pointer-events-none fixed inset-0 z-[var(--z-atmosphere)]"
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
            isAdmin={adminFlag}
            realIsAdmin={realIsAdmin}
            previewActive={previewActive}
            isPro={isPro}
            prosOnlineCount={prosOnlineCount}
            fichaPackageId={fichaPackage?.id ?? null}
          />
        </div>

        {!hideLeftSidebar && (
          <div className={`hidden lg:flex absolute left-0 top-[64px] xl:top-[72px] ${bottomReserveCls} z-[var(--z-overlay)] w-[340px] xl:w-[400px] 2xl:w-[460px]`}>
            <DashboardLeftSidebar
              persona={persona}
              avatar={avatar}
              tag={userTag}
              isAdmin={adminFlag}
              fichaBalance={fichaBalance}
              floating
            />
          </div>
        )}

        {rightSidebar !== undefined ? (
          <div
            className={`hidden lg:flex absolute right-0 top-[64px] xl:top-[72px] ${bottomReserveCls} z-[var(--z-overlay)] ${
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
          <div className={`hidden lg:flex absolute right-0 top-[64px] xl:top-[72px] ${bottomReserveCls} z-[var(--z-overlay)] w-[320px] xl:w-[360px] 2xl:w-[380px]`}>
            <DashboardRightSidebar floating />
          </div>
        )}

        <main
          className={`absolute inset-0 top-[64px] xl:top-[72px] ${bottomReserveCls} z-[var(--z-elevated)] overflow-y-auto ${
            !hideLeftSidebar
              ? "lg:pl-[340px] xl:pl-[400px] 2xl:pl-[460px]"
              : ""
          } lg:pr-[320px] xl:pr-[360px] 2xl:pr-[380px]`}
        >
          {children}
        </main>

        {!hideBottomBar && (
          <div className="absolute bottom-0 inset-x-0 z-[var(--z-overlay)]">
            <DashboardBottomBar
              isAdmin={adminFlag}
              fichaBalance={fichaBalance}
              fichaPackageId={fichaPackage?.id ?? null}
              prosOnline={prosOnline}
              myQueues={myQueues}
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
        isAdmin={adminFlag}
        realIsAdmin={realIsAdmin}
        previewActive={previewActive}
        isPro={isPro}
        prosOnlineCount={prosOnlineCount}
        fichaPackageId={fichaPackage?.id ?? null}
      />

      <div
        className={
          hideLeftSidebar
            ? wideRightSidebar
              ? "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] 2xl:grid-cols-[1fr_560px]"
              : "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_380px]"
            : wideRightSidebar
              ? "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[340px_1fr_480px] xl:grid-cols-[400px_1fr_520px] 2xl:grid-cols-[460px_1fr_560px]"
              : "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[340px_1fr_320px] xl:grid-cols-[400px_1fr_360px] 2xl:grid-cols-[460px_1fr_380px]"
        }
      >
        {!hideLeftSidebar && (
          <DashboardLeftSidebar
            persona={persona}
            avatar={avatar}
            tag={userTag}
            isAdmin={adminFlag}
            fichaBalance={fichaBalance}
          />
        )}

        <main className={`relative overflow-y-auto ${mainPbCls}`}>
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

        {rightSidebar !== undefined ? (
          <aside className="hidden lg:flex flex-col bg-gradient-to-l from-black/80 via-black/60 to-black/30 backdrop-blur-sm overflow-y-auto">
            {rightSidebar}
          </aside>
        ) : (
          <DashboardRightSidebar />
        )}
      </div>

      {!hideBottomBar && (
        <div className="absolute bottom-0 inset-x-0 z-[var(--z-overlay)] pointer-events-none">
          <DashboardBottomBar
            isAdmin={adminFlag}
            fichaBalance={fichaBalance}
            fichaPackageId={fichaPackage?.id ?? null}
            prosOnline={prosOnline}
            myQueues={myQueues}
          />
        </div>
      )}
    </div>
  );
}
