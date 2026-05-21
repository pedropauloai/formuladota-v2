// /dashboard — home logged-in com ClientShell + center MVP fichas.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { DashboardCenter } from "@/components/client-shell/dashboard-center";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import { getProsLiveStatus } from "@/lib/queries/pros";
import { getFichaPackage } from "@/lib/queries/packages";

export const metadata: Metadata = {
  title: "Dashboard — FORMULADOTA",
  description: "Painel FORMULADOTA — estilo menu do Dota 2 client.",
};

// PROs online atualiza a cada 10s
export const revalidate = 10;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: steamLink }, fichaBalance, prosOnline, fichaPackage] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, is_admin")
        .eq("id", user.id)
        .single(),
      supabase
        .from("steam_links")
        .select("persona")
        .eq("user_id", user.id)
        .single(),
      getMyFichaBalance(user.id),
      getProsLiveStatus(),
      getFichaPackage(),
    ]);

  const isAdmin = profile?.is_admin === true;
  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";

  return (
    <ClientShell
      currentRoute="/dashboard"
      immersive
      centerHero="https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background3.png"
    >
      <DashboardCenter
        persona={persona}
        isAdmin={isAdmin}
        fichaBalance={fichaBalance}
        fichaPackageId={fichaPackage?.id ?? null}
        fichaPreco={fichaPackage?.precoBrl ?? null}
        prosOnline={prosOnline}
      />
    </ClientShell>
  );
}
