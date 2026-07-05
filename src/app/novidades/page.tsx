import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClientShell } from "@/components/client-shell/shell";
import { NovidadesView } from "@/components/changelog/novidades-view";
import { getPublishedChangelog } from "@/lib/queries/changelog";
import { languageAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("novidades");
  return { title: t("metaTitle"), alternates: languageAlternates("/novidades") };
}

// /novidades — patch notes públicos do FORMULADOTA (o que mudou, no estilo das
// atualizações do Dota). Fonte: changelog_entries (migration 143). Abrir a página
// zera o badge do sino (mark_changelog_seen, disparado no client).
export default async function NovidadesPage() {
  const entries = await getPublishedChangelog();
  return (
    <ClientShell currentRoute="/novidades" hideRightSidebar>
      <div className="px-6 py-10 xl:px-12">
        <NovidadesView entries={entries} />
      </div>
    </ClientShell>
  );
}
