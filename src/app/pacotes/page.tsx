// Catálogo de pacotes — F2.2 + Multi-coach refactor (Phase 3 — H1.4).
// Server Component: helper loadPackagesWithCoaches faz 2-3 queries + merge,
// PacotesPage só renderiza (≤ 30 linhas — per C2 sem exceção).
// RLS permite SELECT em packages.ativo=true e coaches.ativo=true para todos.
//
// 2-query approach (NÃO Supabase relationship JOIN): Phase 2 viu issues
// de tipo com nested .select() retornando objeto vs array. Manter merge no JS
// é mais previsível em TS strict zero-any.
//
// Auth: middleware já exige login + doutrina + Steam vinculado pra /pacotes
// (STEAM_REQUIRED_PATHS em src/lib/supabase/middleware.ts). Sistema A
// (client-shell/shell.tsx) reforça com redirect("/") interno — coerente
// com o resto do funil (/checkout etc).

import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PackageGrid } from "@/components/catalog/package-grid";
import type { CoachInfo } from "@/components/catalog/package-card";
import type { Database, Tables } from "@/types/database";
import { ClientShell } from "@/components/client-shell/shell";

type PackageRow = Tables<"packages">;
type CoachRow = Pick<Tables<"coaches">, "id" | "profile_id" | "slug">;
type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "username" | "avatar_url" | "is_admin"
>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return {
    title: t("packagesMetaTitle"),
    description: t("packagesMetaDescription"),
  };
}

// Tipo composto Package + Coach (consumido pelo PackageGrid).
// Exportado pra reuso em /admin (futuro) e tests.
export type PackageWithCoach = PackageRow & { coach: CoachInfo };

// Fallback usado quando coach_id não casa com nenhum registro ativo
// (ex: coach desativado mas pacote ainda ativo — edge case).
const FALLBACK_COACH: CoachInfo = {
  username: "Coach Immortal",
  avatarUrl: null,
  badge: "Top 0.5%",
};

// Helper exportado — busca packages ativos + coaches+profiles e faz merge.
// Mantido fora de PacotesPage pra que PacotesPage seja só render (≤ 30 linhas).
// Phase 3.5: nome próprio removido (B6) — coach exibido como "Coach Immortal" genérico.
// V3 (multi-coach): derivar nome+badge do schema real quando coaches plurais entrarem.
function buildCoachInfo(profile: ProfileRow | undefined): CoachInfo {
  return {
    username: "Coach Immortal",
    avatarUrl: profile?.avatar_url ?? null,
    badge: profile?.is_admin ? "Top 0.5%" : "Coach",
  };
}

export async function loadPackagesWithCoaches(
  supabase: SupabaseClient<Database>
): Promise<PackageWithCoach[]> {
  const { data: packages, error: pkgErr } = await supabase
    .from("packages")
    .select("*")
    .eq("ativo", true)
    .order("display_order", { ascending: true });
  if (pkgErr) {
    console.error("[/pacotes] erro packages:", pkgErr.message);
  }
  const packagesList: PackageRow[] = packages ?? [];
  // Filtra nulls antes de passar pro .in() — coach_id pode ser null no schema
  const coachIds = Array.from(
    new Set(packagesList.map((p) => p.coach_id).filter((id): id is string => id !== null))
  );
  let coachesList: CoachRow[] = [];
  if (coachIds.length > 0) {
    const { data: coachRows } = await supabase
      .from("coaches")
      .select("id, profile_id, slug")
      .in("id", coachIds)
      .eq("ativo", true);
    coachesList = coachRows ?? [];
  }
  const profileIds = coachesList.map((c) => c.profile_id);
  let profilesList: ProfileRow[] = [];
  if (profileIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_admin")
      .in("id", profileIds);
    profilesList = profileRows ?? [];
  }
  const coachMap = new Map<string, CoachInfo>();
  for (const coach of coachesList) {
    const profile = profilesList.find((p) => p.id === coach.profile_id);
    coachMap.set(coach.id, buildCoachInfo(profile));
  }
  return packagesList.map((pkg) => ({
    ...pkg,
    // coach_id pode ser null — usa fallback quando não encontrar
    coach: (pkg.coach_id ? coachMap.get(pkg.coach_id) : undefined) ?? FALLBACK_COACH,
  }));
}

export default async function PacotesPage() {
  const supabase = await createClient();
  const packagesWithCoach = await loadPackagesWithCoaches(supabase);
  const t = await getTranslations("billing");

  return (
    <ClientShell currentRoute="/pacotes">
      <div className="px-4 py-10 md:py-14 mx-auto max-w-7xl">
        <header className="mb-10 md:mb-14 text-center space-y-3">
          <p className="font-display text-sm uppercase tracking-[0.4em] text-brand-primary">
            {t("packagesEyebrow")}
          </p>
          <h1 className="font-display text-4xl uppercase tracking-wide text-text-display md:text-6xl">
            {t("packagesHeading")}
          </h1>
          <div className="mx-auto mt-6 brand-divider" />
          <p className="mx-auto mt-6 max-w-2xl text-text-muted">
            {t("packagesIntro")}
          </p>
        </header>

        <PackageGrid packages={packagesWithCoach} />
      </div>
    </ClientShell>
  );
}
