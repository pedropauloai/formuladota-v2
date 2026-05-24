import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ANTIPATTERNS,
  CANONICAL_QUOTES,
  DOCTRINE_VERSION,
  PRINCIPLES,
  PROGRESSIVE_MODERATION,
} from "@/lib/doctrine";
import { OnboardingFlow } from "./OnboardingFlow";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";

// Onboarding doutrinário OBRIGATÓRIO.
// Exibido pra todo user logado que ainda não aceitou a versão atual da doutrina.
// Sem aceite, sem rotas privadas (proxy.ts força).
export const metadata = {
  title: "Onboarding — A Fórmula do Dota de Corrida",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Dados do formulário inválidos. Tente novamente.",
  stale_version:
    "A versão da doutrina foi atualizada enquanto você lia. Recarregue a página para ver o texto novo.",
  db: "Erro ao registrar seu aceite no banco de dados. Tente novamente em alguns segundos — se persistir, entre em contato pelo Discord.",
};

type SearchParams = Promise<{ error?: string }>;

export default async function OnboardingDoutrinaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("doctrine_accepted_at, doctrine_version, username")
    .eq("id", user.id)
    .single();

  // Se já aceitou a versão atual, não fica preso aqui.
  if (
    profile?.doctrine_accepted_at &&
    profile.doctrine_version === DOCTRINE_VERSION
  ) {
    redirect("/perfil");
  }

  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <main className="relative min-h-screen">
      <DotaBackdrop />
      <div className="relative z-10">
      <OnboardingFlow
        username={profile?.username ?? "jogador"}
        version={DOCTRINE_VERSION}
        principles={PRINCIPLES}
        antipatterns={ANTIPATTERNS}
        moderation={PROGRESSIVE_MODERATION}
        quotes={CANONICAL_QUOTES}
        errorMessage={errorMessage}
      />
      </div>
    </main>
  );
}
