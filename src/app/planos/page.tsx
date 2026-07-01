import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClientShell } from "@/components/client-shell/shell";
import { PlansView } from "@/components/plans/plans-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("planos");
  return { title: t("metaTitle") };
}

// Vitrine dos planos de assinatura (Compendium — ver docs/foundations/COMPENDIUM.md).
// Rota pública (vitrine de conversão) — visitante vê e é convidado a entrar.
export default function PlanosPage() {
  return (
    <ClientShell currentRoute="/planos" hideRightSidebar>
      <div className="px-6 py-10 xl:px-12">
        <PlansView />
      </div>
    </ClientShell>
  );
}
