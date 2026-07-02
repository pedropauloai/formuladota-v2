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
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isVisitor = user === null;

  // A capa-tese só precisa do pulso da comunidade (PROs em fila) — leve.
  // + feature flag: com "ranked_com_pro" off, o CTA vira "Ver Partidas".
  // Admin continua vendo o CTA "Subir MMR" (pra testar a feature escondida).
  const [prosWithQueues, flags, meRow] = await Promise.all([
    getProsWithQueues(),
    getFeatureFlags(),
    user
      ? supabase.from("profiles").select("is_admin").eq("id", user.id).single()
      : Promise.resolve({ data: null as { is_admin: boolean } | null }),
  ]);
  const prosOnlineCount = prosWithQueues.filter((p) => p.coach.filaAberta).length;
  const showRankedComPro = flags.ranked_com_pro || meRow.data?.is_admin === true;

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
