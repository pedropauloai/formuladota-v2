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
import { HubCenter } from "@/components/client-shell/hub-center";
import { getProsWithQueues } from "@/lib/queries/pros";

export const metadata: Metadata = {
  title: "FORMULADOTA — não é você, é o sistema",
  description:
    "O ambiente competitivo da Valve é quebrado — anonimato, topo fechado, regiões isoladas. A FormulaDota é a resposta: identidade real, temporadas e ranking único.",
};

// Revalida a cada 30s — presença de jogadores pode mudar
export const revalidate = 30;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isVisitor = user === null;

  // A capa-tese só precisa do pulso da comunidade (PROs em fila) — leve.
  const prosWithQueues = await getProsWithQueues();
  const prosOnlineCount = prosWithQueues.filter((p) => p.coach.filaAberta).length;

  return (
    <ClientShell currentRoute="/" immersive>
      <HubCenter isVisitor={isVisitor} prosOnlineCount={prosOnlineCount} />
    </ClientShell>
  );
}
