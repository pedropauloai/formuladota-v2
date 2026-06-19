// /progresso — Sistema de level FORMULADOTA (0-30, 6 tiers).
// O conteúdo vive em TabProgresso (reusado também pela aba Progresso do perfil,
// /me?tab=progresso). Aqui é a versão página-cheia com header próprio.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import { TabProgresso } from "@/components/profile/tab-progresso";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return {
    title: t("progressMetaTitle"),
    description: t("progressMetaDescription"),
  };
}

export default async function ProgressoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const t = await getTranslations("account");

  return (
    <ClientShell currentRoute="/progresso">
      <div className="px-6 py-8 xl:px-12 xl:py-10 2xl:px-16 2xl:py-12 space-y-10">
        <header>
          <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            {t("progressEyebrow")}
          </p>
          <h1 className="mt-2 font-display text-3xl 2xl:text-5xl uppercase tracking-tight text-text-display">
            {t("progressTitle")}
          </h1>
          <div className="mt-4 brand-divider" />
        </header>
        <TabProgresso />
      </div>
    </ClientShell>
  );
}
