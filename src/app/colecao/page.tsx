import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getMyCollection } from "@/lib/queries/cosmetics";
import { ClientShell } from "@/components/client-shell/shell";
import { CollectionView } from "@/components/cosmetics/collection-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("colecao");
  return { title: t("metaTitle") };
}

// Biblioteca de cosméticos (Compendium Fase 0). Rota protegida (middleware barra
// visitante). Equipar reflete no perfil/mini-perfil via revalidate.
export default async function ColecaoPage() {
  const collection = await getMyCollection();
  return (
    <ClientShell currentRoute="/colecao">
      <div className="px-6 py-10 xl:px-12">
        <CollectionView collection={collection} />
      </div>
    </ClientShell>
  );
}
