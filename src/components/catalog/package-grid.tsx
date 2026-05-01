// Grid responsivo de pacotes. Mobile: 1 col; sm: 2 col; lg: 4 col.
// Server Component — recebe array de pacotes já filtrados (ativo=true) da page.

import { PackageCard } from "@/components/catalog/package-card";
import type { Tables } from "@/types/database";

type Package = Tables<"packages">;

interface PackageGridProps {
  packages: Package[];
}

export function PackageGrid({ packages }: PackageGridProps) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#a1a1aa] text-lg">
          Nenhum pacote disponível no momento.
        </p>
        <p className="text-[#a1a1aa] text-sm mt-2">
          Volte em breve — novidades estão a caminho.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
}
