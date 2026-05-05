// ClientShell — wrapper compartilhado pra todas pages logged-in.
// Server Component que fetcha dados do user (profile, sub, steam, season, mmr) e
// renderiza top-bar + left-sidebar + center (children) + right-sidebar + bottom-bar.
//
// Uso:
// <ClientShell currentRoute="/lobbies">{centerContent}</ClientShell>

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
   * Right sidebar largo (~520px). Usado em /lobbies (lista) e /lobbies/[id] (sala),
   * onde o painel lateral espelha o cliente Dota 2: 2 cols de times, espectadores, etc.
   */
  wideRightSidebar?: boolean;
  /**
   * Imagem de hero pra renderizar atrás do center quando o conteúdo principal é o
   * painel lateral direito (ex: lobby room/list). Path relativo a /public ou URL externa.
   */
  centerHero?: string;
}

export async function ClientShell({
  children,
  currentRoute,
  rightSidebar,
  hideLeftSidebar,
  wideRightSidebar,
  centerHero,
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

      {/* Top Bar */}
      <DashboardTopBar isAdmin={isAdmin} currentRoute={currentRoute} />

      {/* Main 3-col grid */}
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
          <aside className="hidden lg:flex flex-col border-l border-[var(--color-border)] bg-black/70 backdrop-blur-sm overflow-y-auto">
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

      {/* Bottom Bar com Play button verde gigante */}
      <DashboardBottomBar
        persona={persona}
        avatar={avatar}
        subActive={subActive}
        isAdmin={isAdmin}
      />
    </div>
  );
}
