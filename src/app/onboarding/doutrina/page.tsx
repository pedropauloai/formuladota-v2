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

// Onboarding doutrinário OBRIGATÓRIO.
// Exibido pra todo user logado que ainda não aceitou a versão atual da doutrina.
// Sem aceite, sem rotas privadas (proxy.ts força).
export const metadata = {
  title: "Onboarding — A Fórmula do Dota de Corrida",
};

export default async function OnboardingDoutrinaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <OnboardingFlow
        username={profile?.username ?? "imortal"}
        version={DOCTRINE_VERSION}
        principles={PRINCIPLES}
        antipatterns={ANTIPATTERNS}
        moderation={PROGRESSIVE_MODERATION}
        quotes={CANONICAL_QUOTES}
      />
    </main>
  );
}
