import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { xpProgress } from "@/lib/levels";
import { ClientShell } from "@/components/client-shell/shell";
import { CompendiumView } from "@/components/compendium/compendium-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compendium");
  return { title: t("metaTitle") };
}

// Progresso do passe da temporada (Compendium). Rota protegida (middleware barra
// visitante). Fase 2 (motor de XP) ainda não existe → usa o nível/XP de conta como proxy.
export default async function CompendiumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: season } = await supabase
    .from("seasons")
    .select("name, ended_at")
    .eq("active", true)
    .maybeSingle();

  let totalXp = 0;
  if (user) {
    const { data: lv } = await supabase
      .from("user_levels")
      .select("total_xp_earned")
      .eq("user_id", user.id)
      .maybeSingle();
    totalXp = lv?.total_xp_earned ?? 0;
  }

  const { level, pct } = xpProgress(totalXp);
  const seasonName = season?.name ?? "Temporada 1 — Genesis";
  // Date.now() é aceitável aqui: Server Component, avaliado 1x por request (não re-render).
  // eslint-disable-next-line
  const now = Date.now();
  const daysLeft = season?.ended_at
    ? Math.max(0, Math.ceil((new Date(season.ended_at).getTime() - now) / 86_400_000))
    : null;

  return (
    <ClientShell currentRoute="/compendium" hideRightSidebar>
      <div className="px-6 py-10 xl:px-12">
        <CompendiumView
          level={level}
          xpPct={pct}
          seasonName={seasonName}
          daysLeft={daysLeft}
        />
      </div>
    </ClientShell>
  );
}
