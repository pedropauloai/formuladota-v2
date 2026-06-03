import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { RitualDoutrina } from "./RitualDoutrina";
import { getDoctrineProgress } from "./actions";

// Ritual de Doutrinacao gamificado (niveis 0->6), server-backed.
// Progresso persiste em profiles.doctrine_quiz_progress (resume cross-device).
// Ao cobrir o banco -> doctrine_accepted (trigger concede XP). A integracao ao gate
// de onboarding (substituir/complementar o aceite passivo) e o passo seguinte.
export const metadata = {
  title: "Ritual de Doutrinação — FORMULADOTA",
};

export default async function DoutrinaPage() {
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

  const persona = steamLink?.persona ?? profile?.username ?? "Você";
  const avatar = steamLink?.avatar_url ?? profile?.avatar_url ?? null;

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
