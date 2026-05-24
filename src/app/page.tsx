// / — HUB CENTRAL do client (visitante e logado).
//
// Após task #63 (ClientShell tolera visitante), / é a URL canônica do HUB.
// Visitante deslogado vê HUB modo visitante (CTA Entrar via OAuth Discord).
// Logado vê HUB modo completo (stats pessoais, season banner, novidades).
//
// /dashboard fica como redirect pra / (task #65).
//
// Pedro 2026-05-24: filosofia "tudo é client" — não existe landing tradicional
// nem na rota raiz. Substituí 808 linhas de landing legacy (hero video,
// manifesto, princípios, footer custom) pelo HUB.

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { HubCenter, type HubSeason } from "@/components/client-shell/hub-center";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import { getProsWithQueues } from "@/lib/queries/pros";
import { getMyQueueStatus } from "@/lib/queries/queue";

export const metadata: Metadata = {
  title: "FORMULADOTA HUB",
  description:
    "Central do client FormulaDota — entrada pra ranked com PRO, temporada ativa e comunidade.",
};

// Revalida a cada 30s — presença de jogadores pode mudar
export const revalidate = 30;

// Estimativa de duração de season quando o banco ainda não tem `ended_at`
// definido. Season real do FormulaDota costuma rodar ~3 meses (90 dias).
// Quando o admin definir `ended_at` no DB, basta substituir essa lógica.
const SEASON_DEFAULT_DURATION_DAYS = 90;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isVisitor = user === null;

  // Fetches paralelos — público sempre roda; privados só pra logado.
  const [
    prosWithQueues,
    privateData,
    { data: seasonRow },
  ] = await Promise.all([
    getProsWithQueues(),
    isVisitor ? Promise.resolve(null) : fetchPrivateHubData(supabase, user.id),
    supabase
      .from("seasons")
      .select("id, name, started_at, ended_at")
      .eq("active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const prosOnlineCount = prosWithQueues.filter(
    (p) => p.coach.filaAberta
  ).length;

  // Dados do usuário — null/0 quando visitor.
  const persona = privateData?.persona ?? null;
  const fichaBalance = privateData?.fichaBalance ?? 0;
  const myQueueCount = privateData?.myQueueCount ?? 0;

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

    // Posição no ranking — só faz sentido pra logado.
    if (!isVisitor) {
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
  }

  return (
    <ClientShell
      currentRoute="/"
      immersive
      hideBottomBar
      centerHero="https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background3.png"
    >
      <HubCenter
        isVisitor={isVisitor}
        persona={persona}
        fichaBalance={fichaBalance}
        prosOnlineCount={prosOnlineCount}
        myQueueCount={myQueueCount}
        season={season}
        rankingPosition={rankingPosition}
      />
    </ClientShell>
  );
}

// Fetcher helper — só roda quando há sessão. Mantém page legível e isola
// queries privadas em um único Promise.all (latência total ≈ slowest query).
async function fetchPrivateHubData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const [
    { data: profile },
    { data: steamLink },
    fichaBalance,
    myQueues,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single(),
    supabase
      .from("steam_links")
      .select("persona")
      .eq("user_id", userId)
      .single(),
    getMyFichaBalance(userId),
    getMyQueueStatus(userId),
  ]);

  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";
  return { persona, fichaBalance, myQueueCount: myQueues.length };
}
