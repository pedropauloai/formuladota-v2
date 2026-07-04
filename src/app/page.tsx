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

import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { HubCenter } from "@/components/client-shell/hub-center";
import { getProsWithQueues } from "@/lib/queries/pros";
import { getFeatureFlags } from "@/lib/queries/feature-flags";

export async function generateMetadata() {
  const t = await getTranslations("misc2");
  return {
    title: t("homeMetaTitle"),
    description: t("homeMetaDescription"),
  };
}

// Revalida a cada 30s — presença de jogadores pode mudar
export const revalidate = 30;

export default async function HomePage() {
  // Deduplicado por request (React.cache) — o ClientShell reaproveita.
  const user = await getCurrentUser();
  const isVisitor = user === null;

  // A capa-tese só precisa do pulso da comunidade (PROs em fila) — leve.
  // + feature flag AUTORITATIVA: com "ranked_com_pro" off, o CTA vira "Ver Partidas"
  // pra TODOS, inclusive admin (Pedro 2026-07-02). Reative no painel pra testar.
  const [prosWithQueues, flags] = await Promise.all([
    getProsWithQueues(),
    getFeatureFlags(),
  ]);
  const prosOnlineCount = prosWithQueues.filter((p) => p.coach.filaAberta).length;
  const showRankedComPro = flags.ranked_com_pro;

  return (
    <ClientShell currentRoute="/" immersive>
      <HubCenter
        isVisitor={isVisitor}
        prosOnlineCount={prosOnlineCount}
        showRankedComPro={showRankedComPro}
      />
    </ClientShell>
  );
}
