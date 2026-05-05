// /dashboard — réplica fiel do menu principal do Dota 2 client (2025).
// Estrutura: TopBar + 3-col grid (LeftSidebar, Center, RightSidebar) + BottomBar.
// Fullscreen: Header/Footer global ocultos via ConditionalChrome.
// Responsivo: tablet → ultra-wide 3440px+.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTopBar } from "./components/top-bar";
import { DashboardLeftSidebar } from "./components/left-sidebar";
import { DashboardCenter } from "./components/center";
import { DashboardRightSidebar } from "./components/right-sidebar";
import { DashboardBottomBar } from "./components/bottom-bar";

export const metadata: Metadata = {
  title: "Dashboard — FORMULADOTA",
  description: "Painel FORMULADOTA — estilo menu do Dota 2 client.",
};

export default async function DashboardPage() {
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
      .select("username, avatar_url, role, behavior_status, is_admin")
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
      {/* Background full-bleed: gradient dark + sutil noise (replica feel client Dota) */}
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
      <DashboardTopBar isAdmin={isAdmin} />

      {/* Main 3-col grid — sidebars px fixos, center fluid (responsivo até ultra-wide) */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[300px_1fr_320px] xl:grid-cols-[320px_1fr_360px] 2xl:grid-cols-[340px_1fr_380px]">
        <DashboardLeftSidebar
          persona={persona}
          avatar={avatar}
          tag={userTag}
          mmr={mmrRow?.mmr}
          partidas={mmrRow?.partidas_total ?? 0}
          isAdmin={isAdmin}
        />
        <DashboardCenter
          persona={persona}
          isAdmin={isAdmin}
          subActive={subActive}
          season={season ? { name: season.name, prizePool: Number(season.prize_pool) } : null}
          mmr={mmrRow}
        />
        <DashboardRightSidebar
          subActive={subActive}
          nextPayment={subscription?.next_payment_date ?? null}
          isAdmin={isAdmin}
          lobbies={lobbiesData ?? []}
        />
      </div>

      {/* Bottom Bar com Play button gigante */}
      <DashboardBottomBar
        persona={persona}
        avatar={avatar}
        subActive={subActive}
        isAdmin={isAdmin}
      />
    </div>
  );
}
