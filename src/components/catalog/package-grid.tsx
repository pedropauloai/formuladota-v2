// Grid responsivo de pacotes. Mobile: 1 col; sm: 2 col; lg: 4 col.
// Server Component — recebe array de pacotes já filtrados (ativo=true) da page,
// agora enriquecidos com coach info (Phase 3 — H1.4).

import { getTranslations } from "next-intl/server";
import { PackageCard, type CoachInfo } from "@/components/catalog/package-card";
import type { Tables } from "@/types/database";

// Tipo composto local pra evitar import circular com src/app/pacotes/page.tsx.
// Mesmo shape do PackageWithCoach exportado lá; redefinido aqui pra autonomia
// do componente.
export type PackageWithCoach = Tables<"packages"> & { coach: CoachInfo };

interface PackageGridProps {
  packages: PackageWithCoach[];
}

export async function PackageGrid({ packages }: PackageGridProps) {
  const t = await getTranslations("billing");
  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted text-lg">
          {t("emptyCatalogTitle")}
        </p>
        <p className="text-text-muted text-sm mt-2">
          {t("emptyCatalogSubtitle")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} coach={pkg.coach} />
      ))}
    </div>
  );
}
