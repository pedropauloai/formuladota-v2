// /dashboard — HUB CENTRAL do client FormulaDota (Pedro 2026-05-24).
//
// Antes: feature de matchmaking PRO (feed de cards de fila). Essa feature
// migrou pra /ranked-com-pro. /dashboard virou o ponto de partida do client,
// fiel ao home do Dota 2 menu principal — leva o user pras funcionalidades,
// sem duplicar nav (top-bar tabs cobrem) nem identidade (sidebar esquerda
// cobre). Resumo contextual + ação primária massiva + temporada ativa.
//
// Estrutura:
//   - Hero CTA "SUBIR DE MMR" (cinematic, massivo) → /ranked-com-pro
//   - Banner TEMPORADA ATIVA com countdown (análogo Quiosque do Quartero)
//   - Status line sintética (fichas + PROs em fila + ranking)
//   - Slot Novidades (placeholder V2)

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { HubCenter, type HubSeason } from "@/components/client-shell/hub-center";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import { getProsWithQueues } from "@/lib/queries/pros";
import { getMyQueueStatus } from "@/lib/queries/queue";

export const metadata: Metadata = {
  title: "FORMULADOTA HUB — Bem-vindo",
  description:
    "Central do client FormulaDota — entrada pra ranked com PRO, temporada ativa e comunidade.",
};

export const revalidate = 30;

// Estimativa de duração de season quando o banco ainda não tem `ended_at`
// definido. Season real do FormulaDota costuma rodar ~3 meses (90 dias).
// Quando o admin definir `ended_at` no DB, basta substituir essa lógica.
const SEASON_DEFAULT_DURATION_DAYS = 90;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetches mínimos pro HUB — paralelizados.
  const [
    { data: profile },
    { data: steamLink },
    fichaBalance,
    prosWithQueues,
    myQueues,
    { data: seasonRow },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single(),
    supabase
      .from("steam_links")
      .select("persona")
      .eq("user_id", user.id)
      .single(),
    getMyFichaBalance(user.id),
    getProsWithQueues(),
    getMyQueueStatus(user.id),
    supabase
      .from("seasons")
      .select("id, name, started_at, ended_at")
      .eq("active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";
  const prosOnlineCount = prosWithQueues.filter(
    (p) => p.coach.filaAberta
  ).length;

  // Constrói HubSeason — endsAt cai pra started_at + 90d quando ended_at é null.
  let season: HubSeason | null = null;
  let rankingPosition: number | null = null;

  if (seasonRow) {
    const startedAt = new Date(seasonRow.started_at);
    const endsAt = seasonRow.ended_at
      ? new Date(seasonRow.ended_at)
      : new Date(
          startedAt.getTime() +
            SEASON_DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000
        );
    season = {
      number: seasonRow.id,
      name: seasonRow.name,
      endsAt,
    };

    // Posição no ranking — calculada por mmr DESC dentro da season.
    // Usa player_season_mmr direto pra evitar dependência de RPC nova.
    const { data: myMmr } = await supabase
      .from("player_season_mmr")
      .select("mmr")
      .eq("season_id", seasonRow.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (myMmr) {
      const { count } = await supabase
        .from("player_season_mmr")
        .select("user_id", { count: "exact", head: true })
        .eq("season_id", seasonRow.id)
        .gt("mmr", myMmr.mmr);
      rankingPosition = (count ?? 0) + 1;
    }
  }

  return (
    <ClientShell
      currentRoute="/dashboard"
      immersive
      hideBottomBar
      centerHero="https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background3.png"
    >
      <HubCenter
        persona={persona}
        fichaBalance={fichaBalance}
        prosOnlineCount={prosOnlineCount}
        myQueueCount={myQueues.length}
        season={season}
        rankingPosition={rankingPosition}
      />
    </ClientShell>
  );
}
