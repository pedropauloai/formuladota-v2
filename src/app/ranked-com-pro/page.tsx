// /ranked-com-pro — MASTER-DETAIL estilo cliente Dota 2: lista densa de PROs
// na coluna direita + PRO selecionado em destaque no centro (sem rolagem de
// página). Aqui se joga ranked oficial Dota 2 em grupo com PRO — a ÚNICA via
// de subir MMR oficial Valve no
// FormulaDota (lobbies, busca terceirizada, ligas — outros sistemas futuros).
// O /dashboard virou HUB central; aqui mora o sistema "Ranked com PRO".

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { getProCockpitData } from "@/app/pro/cockpit-data";
import { QueueRealtimeListener } from "@/components/queue/realtime-listener";
import { getCareerStats } from "@/lib/queries/career";
import { getHeroById } from "@/lib/queries/heroes";
import type { SignatureHero } from "@/components/dota/hero-video-backdrop";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("queue");
  return {
    title: t("rankedPageTitle"),
    description: t("rankedPageDescription"),
  };
}

export const revalidate = 30;

export default async function RankedComProPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Feature flag AUTORITATIVA: com "ranked_com_pro" desligada, a rota some pra TODOS
  // (inclusive admin — Pedro 2026-07-02). Pra testar, reative no painel de flags.
  const flags = await getFeatureFlags();
  if (!flags.ranked_com_pro) {
    redirect("/dashboard");
  }

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

  const t = await getTranslations("queue");
  const isAdmin = profile?.is_admin === true && !previewActive;
  const persona = steamLink?.persona ?? profile?.username ?? t("anonymous");

  const onlinePros = prosWithQueues.filter((p) => p.coach.filaAberta);
  const statsEntries = await Promise.all(
    onlinePros.map(async (p) => {
      const stats = await getProRecentStats(p.coach.coachId);
      return [p.coach.coachId, stats] as const;
    })
  );
  const statsByCoach = new Map<string, ProRecentStats>(statsEntries);

  // Herói de assinatura de cada PRO online (nº 1 da carreira OpenDota) —
  // backdrop VIVO do painel de identidade no master-detail. getCareerStats é
  // cacheado 24h e os PROs online são poucos — sem risco de rate limit.
  // coaches.id ≠ profiles.id: resolve o profile_id antes de buscar a carreira.
  const signatureHeroByCoach = new Map<string, SignatureHero>();
  if (onlinePros.length > 0) {
    const { data: coachRows } = await supabase
      .from("coaches")
      .select("id, profile_id")
      .in(
        "id",
        onlinePros.map((p) => p.coach.coachId)
      );
    await Promise.all(
      (coachRows ?? []).map(async (row) => {
        const career = await getCareerStats(row.profile_id);
        const top = career?.topHeroes[0];
        const hero = top ? getHeroById(top.heroId) : null;
        if (hero) {
          signatureHeroByCoach.set(row.id, {
            slug: hero.slug,
            name: hero.name_pt,
          });
        }
      })
    );
  }

  // Modo GESTÃO (Pedro 2026-06-12): se o viewer é PRO/coach, o próprio card
  // vira cockpit de gestão da fila AQUI — a rota /pro virou redirect pra cá.
  const { data: myCoach } = await supabase
    .from("coaches")
    .select("id, fila_aberta, fila_aberta_em, fila_max_vagas, queue_mode")
    .eq("profile_id", user.id)
    .maybeSingle();
  const cockpitInitial = myCoach ? await getProCockpitData(myCoach) : null;

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
      {/* Realtime da fila de coach — escopado a esta rota (saiu do layout raiz
          por perf: refresh global em todo evento de fila afetava o app inteiro). */}
      <QueueRealtimeListener />
      <DashboardCenter
        persona={persona}
        viewerUserId={user.id}
        isAdmin={isAdmin}
        fichaBalance={fichaBalance}
        fichaPackageId={fichaPackage?.id ?? null}
        fichaPreco={fichaPackage?.precoBrl ?? null}
        prosWithQueues={prosWithQueues}
        statsByCoach={statsByCoach}
        signatureHeroByCoach={signatureHeroByCoach}
        myQueues={myQueues}
        myCoachId={myCoach?.id ?? null}
        cockpitInitial={cockpitInitial}
      />
    </ClientShell>
  );
}
