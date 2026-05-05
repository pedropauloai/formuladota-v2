// /dashboard — home logged-in com ClientShell + center especial (hero showcase + quick actions).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { DashboardCenter } from "@/components/client-shell/dashboard-center";

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

  // Dados extras pro center (subscription, season, mmr) — fetcha aqui pra alimentar DashboardCenter
  const [{ data: profile }, { data: subscription }, { data: steamLink }, { data: season }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("steam_links")
      .select("persona")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("seasons")
      .select("id, name, prize_pool")
      .eq("active", true)
      .limit(1)
      .single(),
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

  return (
    <ClientShell currentRoute="/dashboard">
      <DashboardCenter
        persona={persona}
        isAdmin={isAdmin}
        subActive={subActive}
        season={season ? { name: season.name, prizePool: Number(season.prize_pool) } : null}
        mmr={mmrRow}
      />
    </ClientShell>
  );
}
