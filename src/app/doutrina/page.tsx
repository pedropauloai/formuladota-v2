import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { displayName, displayAvatar } from "@/lib/identity";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { RitualDoutrina } from "./RitualDoutrina";
import { getDoctrineProgress } from "./actions";

// Ritual de Doutrinacao gamificado (niveis 0->6), server-backed.
// Progresso persiste em profiles.doctrine_quiz_progress (resume cross-device).
// Ao cobrir o banco -> doctrine_accepted (trigger concede XP). A integracao ao gate
// de onboarding (substituir/complementar o aceite passivo) e o passo seguinte.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("doutrina");
  return {
    title: t("metaTitle"),
  };
}

export default async function DoutrinaPage() {
  // Quiz atrás de feature flag (Pedro 2026-07-04): OFF → o ritual some (redirect).
  const { doctrine_quiz } = await getFeatureFlags();
  if (!doctrine_quiz) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [progress, { data: profile }, { data: steamLink }] = await Promise.all([
    getDoctrineProgress(),
    supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single(),
    supabase
      .from("steam_links")
      .select("persona, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // Identidade canônica via lib/identity (Steam > Discord) — mesma prioridade
  // de antes, agora centralizada. "Você" é o fallback quando não há nick algum.
  const t = await getTranslations("doutrina");
  const identitySrc = {
    steamPersona: steamLink?.persona,
    steamAvatar: steamLink?.avatar_url,
    discordUsername: profile?.username ?? t("identityFallback"),
    discordAvatar: profile?.avatar_url,
  };
  const persona = displayName(identitySrc);
  const avatar = displayAvatar(identitySrc);

  return (
    <main className="relative min-h-screen">
      <DotaBackdrop />
      <div className="relative z-10">
        <RitualDoutrina
          initialAnsweredIds={progress.answeredIds}
          initialDoctrinated={progress.doctrinated}
          persona={persona}
          avatar={avatar}
        />
      </div>
    </main>
  );
}
