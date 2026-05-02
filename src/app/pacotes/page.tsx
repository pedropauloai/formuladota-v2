// Catálogo público de pacotes — F2.2 + Multi-coach refactor (Phase 3 — H1.4).
// Server Component: helper loadPackagesWithCoaches faz 2-3 queries + merge,
// PacotesPage só renderiza (≤ 30 linhas — per C2 sem exceção).
// RLS permite SELECT em packages.ativo=true e coaches.ativo=true para todos.
//
// 2-query approach (NÃO Supabase relationship JOIN): Phase 2 viu issues
// de tipo com nested .select() retornando objeto vs array. Manter merge no JS
// é mais previsível em TS strict zero-any.

import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { PackageGrid } from "@/components/catalog/package-grid";
import type { CoachInfo } from "@/components/catalog/package-card";
import type { Database, Tables } from "@/types/database";

type PackageRow = Tables<"packages">;
type CoachRow = Pick<Tables<"coaches">, "id" | "profile_id" | "slug">;
type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "username" | "avatar_url" | "is_admin"
>;

export const metadata: Metadata = {
  title: "Pacotes — Fórmula Dota",
  description:
    "Mentoria 1-1 com Pedro Paulo (Immortal/Top 0.5%). Pacotes avulsos a partir de R$ 10 ou mensal com sessões teóricas.",
};

// Tipo composto Package + Coach (consumido pelo PackageGrid).
// Exportado pra reuso em /admin (futuro) e tests.
export type PackageWithCoach = PackageRow & { coach: CoachInfo };

// Fallback usado quando coach_id não casa com nenhum registro ativo
// (ex: coach desativado mas pacote ainda ativo — edge case).
const FALLBACK_COACH: CoachInfo = {
  username: "Coach",
  avatarUrl: null,
  badge: "",
};

// Helper exportado — busca packages ativos + coaches+profiles e faz merge.
// Mantido fora de PacotesPage pra que PacotesPage seja só render (≤ 30 linhas).
// Phase 3: Pedro (is_admin=true) → badge "Immortal". V3 (Phase 7): derivar do MMR real.
function buildCoachInfo(profile: ProfileRow | undefined): CoachInfo {
  return {
    username: profile?.username ?? "Coach",
    avatarUrl: profile?.avatar_url ?? null,
    badge: profile?.is_admin ? "Immortal" : "Coach",
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
  const coachIds = Array.from(new Set(packagesList.map((p) => p.coach_id)));
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
    coach: coachMap.get(pkg.coach_id) ?? FALLBACK_COACH,
  }));
}

export default async function PacotesPage() {
  const supabase = await createClient();
  const packagesWithCoach = await loadPackagesWithCoaches(supabase);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 md:mb-14 text-center">
          <h1 className="text-4xl md:text-5xl font-display text-[#f4f4f5]">
            Escolha seu <span className="text-[#00F0FF]">pacote</span>
          </h1>
          <p className="mt-4 text-[#a1a1aa] max-w-2xl mx-auto">
            Mentoria 1-1 com coaches credenciados pela Fórmula Dota. Pague via
            PIX, agende e jogue ranked junto.
          </p>
        </header>

        <PackageGrid packages={packagesWithCoach} />
      </div>
    </main>
  );
}
