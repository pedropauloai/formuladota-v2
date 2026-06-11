// /ranked-com-pro — MASTER-DETAIL estilo cliente Dota 2: lista densa de PROs
// na coluna direita + PRO selecionado em destaque no centro (sem rolagem de
// página). Aqui se joga ranked oficial Dota 2 em grupo com PRO — a ÚNICA via
// de subir MMR oficial Valve no
// FormulaDota (lobbies, busca terceirizada, ligas — outros sistemas futuros).
// O /dashboard virou HUB central; aqui mora o sistema "Ranked com PRO".

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
  title: "Ranked com PRO — FORMULADOTA",
  description:
    "Vagas em grupo com PRO Imortal pra jogar ranked oficial Dota 2 — a única via de subir MMR oficial Valve.",
};

export const revalidate = 30;

export default async function RankedComProPage() {
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

  const onlinePros = prosWithQueues.filter((p) => p.coach.filaAberta);
  const statsEntries = await Promise.all(
    onlinePros.map(async (p) => {
      const stats = await getProRecentStats(p.coach.coachId);
      return [p.coach.coachId, stats] as const;
    })
  );
  const statsByCoach = new Map<string, ProRecentStats>(statsEntries);

  return (
    <ClientShell
      currentRoute="/ranked-com-pro"
      hideRightSidebar
      /* immersive removido 2026-06-11 (reforma master-detail): o modo immersive
         padava o main simetricamente (~320-380px por lado) e sobrepunha a
         right-sidebar genérica — espremeria o detalhe do PRO. O master-detail
         traz a PRÓPRIA coluna direita (lista densa de PROs), então o main
         ocupa a largura toda sem sidebar do shell.
         hideBottomBar removido 2026-05-26 — Pedro quer bottom-bar GLOBAL
         (igual mini-perfil): JOGAR DOTA aparece em todas as rotas. */
    >
      <DashboardCenter
        persona={persona}
        viewerUserId={user.id}
        isAdmin={isAdmin}
        fichaBalance={fichaBalance}
        fichaPackageId={fichaPackage?.id ?? null}
        fichaPreco={fichaPackage?.precoBrl ?? null}
        prosWithQueues={prosWithQueues}
        statsByCoach={statsByCoach}
        myQueues={myQueues}
      />
    </ClientShell>
  );
}
