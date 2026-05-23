// /dashboard — home logged-in com ClientShell + center MVP fichas.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { DashboardCenter } from "@/components/client-shell/dashboard-center";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import {
  getProsWithQueues,
  getProRecentStats,
  type ProRecentStats,
} from "@/lib/queries/pros";
import { getFichaPackage } from "@/lib/queries/packages";
import { getMyQueueStatus } from "@/lib/queries/queue";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";

export const metadata: Metadata = {
  title: "Dashboard — FORMULADOTA",
  description: "Painel FORMULADOTA — estilo menu do Dota 2 client.",
};

// Realtime cobre maioria das atualizações; fallback de 30s pra segurança
export const revalidate = 30;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: steamLink },
    fichaBalance,
    prosWithQueues,
    fichaPackage,
    previewActive,
    myQueues,
  ] = await Promise.all([
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
    getProsWithQueues(),
    getFichaPackage(),
    getPreviewModeActive(),
    getMyQueueStatus(user.id),
  ]);

  const isAdmin = profile?.is_admin === true && !previewActive;
  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";

  const top = prosWithQueues.find((p) => p.coach.filaAberta);
  let topProStats: ProRecentStats | null = null;
  if (top) {
    topProStats = await getProRecentStats(top.coach.coachId);
  }

  return (
    <ClientShell
      currentRoute="/dashboard"
      immersive
      centerHero="https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background3.png"
    >
      <DashboardCenter
        persona={persona}
        viewerUserId={user.id}
        isAdmin={isAdmin}
        fichaBalance={fichaBalance}
        fichaPackageId={fichaPackage?.id ?? null}
        fichaPreco={fichaPackage?.precoBrl ?? null}
        prosWithQueues={prosWithQueues}
        topProStats={topProStats}
        myQueue={myQueues[0] ?? null}
      />
    </ClientShell>
  );
}
