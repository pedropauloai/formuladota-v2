// ClientShell — wrapper compartilhado pra todas pages logged-in.
// Server Component que fetcha dados do user (profile, sub, steam, season, mmr) e
// renderiza top-bar + left-sidebar + center (children) + right-sidebar + bottom-bar.
//
// 2 modos:
// - default (grid): layout 3-col, sidebars com bg sólido cortando o background
// - immersive: background fullscreen, sidebars como overlays flutuantes sobre a imagem
//   (espelha cliente Dota 2 — usado em /dashboard e rotas que abrem PlayPanel)

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTopBar } from "./top-bar";
import { DashboardLeftSidebar } from "./left-sidebar";
import { DashboardRightSidebar } from "./right-sidebar";
import { DashboardBottomBar } from "./bottom-bar";

interface ClientShellProps {
  /**
   * Conteúdo do center panel — recebe área entre top-bar e bottom-bar
   * com sidebars laterais já posicionadas.
   */
  children: React.ReactNode;
  /**
   * Rota atual — usado pra destacar tab ativa no top-bar.
   */
  currentRoute?: string;
  /**
   * Override do conteúdo do right sidebar. Default = news + lobbies + comunidade.
   * Útil quando page tem widget próprio (ex: filtros lobbies).
   */
  rightSidebar?: React.ReactNode;
  /**
   * Esconde left sidebar (raro — usar quando página tem layout fullscreen interno).
   */
  hideLeftSidebar?: boolean;
  /**
   * Right sidebar largo (~520px). Usado quando rightSidebar mostra painel denso
   * (ex: lista de salas com tabela ou sala individual com 2 cols de times).
   */
  wideRightSidebar?: boolean;
  /**
   * Modo immersive: background fullscreen + sidebars como overlays flutuantes.
   * Espelha cliente Dota 2. Usado em /dashboard e rotas com PlayPanel ativo.
   */
  immersive?: boolean;
  /**
   * Imagem de hero pra renderizar como background. Path relativo a /public ou URL externa.
   * Em modo immersive, ocupa a tela toda. Em modo grid, renderiza atrás do center.
   */
  centerHero?: string;
  /**
   * Estado inicial do PlayPanel. Permite deep-link via query string
   * (ex: /dashboard?play=lobbies-list abre o painel já na lista).
   */
  initialPlayState?:
    | "modes"
    | "salas-menu"
    | "lobbies-list"
    | "criar-sala"
    | { type: "lobby-room"; lobbyId: string };
}

export async function ClientShell({
  children,
  currentRoute,
  rightSidebar,
  hideLeftSidebar,
  wideRightSidebar,
  immersive,
  centerHero,
  initialPlayState,
}: ClientShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: subscription },
    { data: steamLink },
    { data: season },
    { data: lobbiesData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url, role, is_admin")
      .eq("id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("status, next_payment_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("steam_links")
      .select("steam_id_64, persona, avatar_url")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("seasons")
      .select("id, name, prize_pool")
      .eq("active", true)
      .limit(1)
      .single(),
    supabase
      .from("lobbies")
      .select("id, name, game_mode, status, created_at, max_players")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  let mmrRow: {
    mmr: number;
    vitorias: number;
    derrotas: number;
    partidas_total: number;
  } | null = null;
  if (season) {
    const { data } = await supabase
      .from("player_season_mmr")
      .select("mmr, vitorias, derrotas, partidas_total")
      .eq("user_id", user.id)
      .eq("season_id", season.id)
      .single();
    mmrRow = data;
  }

  const isAdmin = profile?.is_admin === true;
  const subActive = isAdmin || subscription?.status === "authorized";
  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";
  const avatar = steamLink?.avatar_url ?? profile?.avatar_url ?? null;
  const userTag = isAdmin ? "ADMIN" : "MEMBER";

  // ============== Modo IMMERSIVE — overlays sobre background fullscreen ==============
  if (immersive) {
    return (
      <div className="relative h-screen overflow-hidden bg-black">
        {/* Background fullscreen */}
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

        {/* Top-bar overlay */}
        <div className="absolute top-0 inset-x-0 z-30">
          <DashboardTopBar isAdmin={isAdmin} currentRoute={currentRoute} />
        </div>

        {/* Left sidebar overlay flutuante */}
        {!hideLeftSidebar && (
          <div className="hidden lg:flex absolute left-0 top-[64px] xl:top-[72px] bottom-[64px] xl:bottom-[80px] z-20 w-[300px] xl:w-[320px] 2xl:w-[340px]">
            <DashboardLeftSidebar
              persona={persona}
              avatar={avatar}
              tag={userTag}
              mmr={mmrRow?.mmr}
              partidas={mmrRow?.partidas_total ?? 0}
              isAdmin={isAdmin}
              floating
            />
          </div>
        )}

        {/* Right sidebar overlay (se providenciado) */}
        {rightSidebar !== undefined && (
          <div
            className={`hidden lg:flex absolute right-0 top-[64px] xl:top-[72px] bottom-[64px] xl:bottom-[80px] z-20 ${
              wideRightSidebar
                ? "w-[480px] xl:w-[520px] 2xl:w-[560px]"
                : "w-[320px] xl:w-[360px] 2xl:w-[380px]"
            }`}
          >
            <aside className="flex w-full flex-col bg-gradient-to-l from-black/80 via-black/60 to-black/30 backdrop-blur-sm overflow-y-auto">
              {rightSidebar}
            </aside>
          </div>
        )}

        {/* Center — children renderiza no espaço entre as duas sidebars overlay.
            Padding lateral pra não sobrepor os cards flutuantes do left-sidebar
            (e do right quando providenciado). */}
        <main
          className={`absolute inset-0 top-[64px] xl:top-[72px] bottom-[64px] xl:bottom-[80px] z-10 overflow-y-auto ${
            !hideLeftSidebar
              ? "lg:pl-[300px] xl:pl-[320px] 2xl:pl-[340px]"
              : ""
          } ${
            rightSidebar !== undefined
              ? wideRightSidebar
                ? "lg:pr-[480px] xl:pr-[520px] 2xl:pr-[560px]"
                : "lg:pr-[320px] xl:pr-[360px] 2xl:pr-[380px]"
              : ""
          }`}
        >
          {children}
        </main>

        {/* Bottom-bar overlay */}
        <div className="absolute bottom-0 inset-x-0 z-30">
          <DashboardBottomBar
            persona={persona}
            avatar={avatar}
            subActive={subActive}
            isAdmin={isAdmin}
            initialPlayState={initialPlayState}
          />
        </div>
      </div>
    );
  }

  // ============== Modo DEFAULT — grid 3-col ==============
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black">
      {/* Background ambient: gradient dark + tint vermelho sutil no topo */}
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

      <DashboardTopBar isAdmin={isAdmin} currentRoute={currentRoute} />

      <div
        className={
          hideLeftSidebar
            ? wideRightSidebar
              ? "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] 2xl:grid-cols-[1fr_560px]"
              : "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_380px]"
            : wideRightSidebar
              ? "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[300px_1fr_480px] xl:grid-cols-[320px_1fr_520px] 2xl:grid-cols-[340px_1fr_560px]"
              : "grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[300px_1fr_320px] xl:grid-cols-[320px_1fr_360px] 2xl:grid-cols-[340px_1fr_380px]"
        }
      >
        {!hideLeftSidebar && (
          <DashboardLeftSidebar
            persona={persona}
            avatar={avatar}
            tag={userTag}
            mmr={mmrRow?.mmr}
            partidas={mmrRow?.partidas_total ?? 0}
            isAdmin={isAdmin}
          />
        )}

        <main className="relative overflow-y-auto">
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
            subActive={subActive}
            nextPayment={subscription?.next_payment_date ?? null}
            isAdmin={isAdmin}
            lobbies={lobbiesData ?? []}
          />
        )}
      </div>

      <DashboardBottomBar
        persona={persona}
        avatar={avatar}
        subActive={subActive}
        isAdmin={isAdmin}
        initialPlayState={initialPlayState}
      />
    </div>
  );
}
