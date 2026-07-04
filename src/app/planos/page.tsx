import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { PlansView } from "@/components/plans/plans-view";
import { SubscriptionPanel } from "@/components/plans/subscription-panel";
import { signInWithDiscord } from "@/app/login/actions";
import { languageAlternates } from "@/lib/seo";
import { isGameRegion, type GameRegion } from "@/lib/regions";
import {
  resolveSubscriptionState,
  type SubscriptionRow,
} from "@/lib/subscriptions/state";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("planos");
  return { title: t("metaTitle"), alternates: languageAlternates("/planos") };
}

// Rota CANÔNICA de planos + assinatura (fusão 2026-07-04: /assinatura foi
// absorvida aqui — era duplicata fora do ClientShell, violando a filosofia
// "tudo é client" de 2026-05-24; agora é só redirect de compat).
//
// Rota pública (vitrine de conversão): visitante vê os planos + CTA de login;
// logado vê também o painel FUNCIONAL (assinar/cancelar/reativar, preço pela
// região de jogo). Retornos do MP/Stripe chegam aqui via ?success/?error/?info.
export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string; error?: string; info?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;
  const t = await getTranslations("planos");

  // Logado: assinatura mais recente + região (define moeda) em paralelo.
  let panel: React.ReactNode = null;
  if (user) {
    const [{ data: subscription }, { data: prof }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, status, started_at, next_payment_date, cancelled_at, tier, provider")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("region").eq("id", user.id).maybeSingle(),
    ]);
    const region: GameRegion = isGameRegion(prof?.region) ? prof.region : "BR";
    const row = (subscription as SubscriptionRow | null) ?? null;
    panel = (
      <SubscriptionPanel
        state={resolveSubscriptionState(row)}
        subscription={row}
        region={region}
        queryParams={{
          success: params.success === "1",
          cancelled: params.cancelled === "1",
          error: params.error,
          info: params.info,
        }}
      />
    );
  }

  return (
    <ClientShell currentRoute="/planos" hideRightSidebar>
      <div className="space-y-10 px-6 py-10 xl:px-12">
        {panel}
        <PlansView />
        {/* Visitante: vitrine continua aberta (conversão) — assinar pede login. */}
        {!user && (
          <div className="mx-auto max-w-5xl">
            <form action={signInWithDiscord} className="text-center">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-sm border-2 border-brand-primary bg-brand-primary/15 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-text-display transition-colors hover:bg-brand-primary/25"
              >
                <LogIn className="size-4" aria-hidden="true" />
                {t("loginToSubscribe")}
              </button>
            </form>
          </div>
        )}
      </div>
    </ClientShell>
  );
}
