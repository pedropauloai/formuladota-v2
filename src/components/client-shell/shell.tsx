// ClientShell — wrapper compartilhado pra todas pages logged-in (MVP fichas).
// Server Component que fetcha dados do user (profile, steam) + MVP (saldo fichas,
// PROs online, package ficha) e passa pra top-bar + sidebars + bottom-bar.
//
// 2 modos:
// - default (grid): layout 3-col, sidebars com bg sólido cortando o background
// - immersive: background fullscreen, sidebars como overlays flutuantes
//   (espelha cliente Dota 2 — usado em /dashboard)

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import { getProsLiveStatus } from "@/lib/queries/pros";
import { getFichaPackage } from "@/lib/queries/packages";
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
}

export async function ClientShell({
  children,
  currentRoute,
  rightSidebar,
  hideLeftSidebar,
  wideRightSidebar,
  immersive,
  centerHero,
}: ClientShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: steamLink },
    fichaBalance,
    prosOnline,
    fichaPackage,
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
    getMyFichaBalance(user.id),
    getProsLiveStatus(),
    getFichaPackage(),
  ]);

  const adminFlag = profile?.is_admin === true;
  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";
  const avatar = steamLink?.avatar_url ?? profile?.avatar_url ?? null;
  const userTag = adminFlag ? "ADMIN" : "MEMBER";

  const prosOnlineCount = prosOnline.filter((p) => p.filaAberta).length;

  // ============== Modo IMMERSIVE — overlays sobre background fullscreen ==============
  if (immersive) {
    return (
      <div className="relative h-screen overflow-hidden bg-black">
        {centerHero && (
          <div
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%), url(${centerHero})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />
        )}

        <div className="absolute top-0 inset-x-0 z-30">
          <DashboardTopBar
            currentRoute={currentRoute}
            isAdmin={adminFlag}
            prosOnlineCount={prosOnlineCount}
            fichaPackageId={fichaPackage?.id ?? null}
          />
        </div>

        {!hideLeftSidebar && (
          <div className="hidden lg:flex absolute left-0 top-[64px] xl:top-[72px] bottom-[80px] xl:bottom-[96px] z-20 w-[340px] xl:w-[400px] 2xl:w-[460px]">
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
            className={`hidden lg:flex absolute right-0 top-[64px] xl:top-[72px] bottom-[80px] xl:bottom-[96px] z-20 ${
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
          <div className="hidden lg:flex absolute right-0 top-[64px] xl:top-[72px] bottom-[80px] xl:bottom-[96px] z-20 w-[320px] xl:w-[360px] 2xl:w-[380px]">
            <DashboardRightSidebar
              isAdmin={adminFlag}
              fichaBalance={fichaBalance}
              fichaPackageId={fichaPackage?.id ?? null}
              fichaPreco={fichaPackage?.precoBrl ?? null}
              prosOnline={prosOnline}
              floating
            />
          </div>
        )}

        <main
          className={`absolute inset-0 top-[64px] xl:top-[72px] bottom-[80px] xl:bottom-[96px] z-10 overflow-y-auto ${
            !hideLeftSidebar
              ? "lg:pl-[340px] xl:pl-[400px] 2xl:pl-[460px]"
              : ""
          } lg:pr-[320px] xl:pr-[360px] 2xl:pr-[380px]`}
        >
          {children}
        </main>

        <div className="absolute bottom-0 inset-x-0 z-30">
          <DashboardBottomBar
            isAdmin={adminFlag}
            fichaBalance={fichaBalance}
            fichaPackageId={fichaPackage?.id ?? null}
          />
        </div>
      </div>
    );
  }

  // ============== Modo DEFAULT — grid 3-col ==============
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 50% 0%, rgba(172, 29, 14, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(0, 0, 0, 0.95) 0%, transparent 80%),
            linear-gradient(to bottom, #0a0a0a 0%, #050505 50%, #000000 100%)
          `,
        }}
        aria-hidden="true"
      />

      <DashboardTopBar
        currentRoute={currentRoute}
        isAdmin={adminFlag}
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

        <main className="relative overflow-y-auto pb-[80px] xl:pb-[96px] 2xl:pb-[112px]">
          {centerHero && (
            <div
              className="pointer-events-none absolute inset-0 -z-0"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.85) 100%), url(${centerHero})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-hidden="true"
            />
          )}
          <div className="relative z-10 h-full">{children}</div>
        </main>

        {rightSidebar !== undefined ? (
          <aside className="hidden lg:flex flex-col bg-gradient-to-l from-black/80 via-black/60 to-black/30 backdrop-blur-sm overflow-y-auto">
            {rightSidebar}
          </aside>
        ) : (
          <DashboardRightSidebar
            isAdmin={adminFlag}
            fichaBalance={fichaBalance}
            fichaPackageId={fichaPackage?.id ?? null}
            fichaPreco={fichaPackage?.precoBrl ?? null}
            prosOnline={prosOnline}
          />
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 z-30 pointer-events-none">
        <DashboardBottomBar
          isAdmin={adminFlag}
          fichaBalance={fichaBalance}
          fichaPackageId={fichaPackage?.id ?? null}
        />
      </div>
    </div>
  );
}
