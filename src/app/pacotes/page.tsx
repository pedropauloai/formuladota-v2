// Catálogo público de pacotes — F2.2.
// Server Component: faz fetch direto no Supabase com anon key.
// RLS permite SELECT de packages.ativo=true para todos (per migration 002).

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PackageGrid } from "@/components/catalog/package-grid";

export const metadata: Metadata = {
  title: "Pacotes — Fórmula Dota",
  description:
    "Mentoria 1-1 com Pedro Paulo (Immortal/Top 0.5%). Pacotes avulsos a partir de R$ 10 ou mensal com sessões teóricas.",
};

export default async function PacotesPage() {
  const supabase = await createClient();

  const { data: packages, error } = await supabase
    .from("packages")
    .select("*")
    .eq("ativo", true)
    .order("display_order", { ascending: true });

  if (error) {
    // RLS não deveria barrar SELECT público — se barrou, é bug de schema/policy
    console.error("[/pacotes] erro ao buscar pacotes:", error.message);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 md:mb-14 text-center">
          <h1 className="text-4xl md:text-5xl font-display text-[#f4f4f5]">
            Escolha seu <span className="text-[#00F0FF]">pacote</span>
          </h1>
          <p className="mt-4 text-[#a1a1aa] max-w-2xl mx-auto">
            Mentoria 1-1 com Pedro Paulo, Immortal e Top 0.5% mundial. Pague
            via PIX, agende e jogue ranked junto.
          </p>
        </header>

        <PackageGrid packages={packages ?? []} />
      </div>
    </main>
  );
}
