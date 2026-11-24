// /sala: o endereço fixo que o PPA anuncia na live (spec, seção 14). Leva à sala pública aberta; sem
// sala aberta, diz que ela abre quando a live começar. Flag sala_voz desligada dá 404 para todos.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Radio } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { Panel } from "@/components/v2";
import { salaVozOn } from "@/lib/sala/flag";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sala");
  return { title: t("metaTitle") };
}

async function openPublicRoom(): Promise<string | null> {
  // A sala pública não é segredo (é o link anunciado na live); a RLS só abre a sala a quem já é membro.
  const db = createServiceClient();
  const { data } = await db
    .from("voice_rooms")
    .select("id")
    .eq("kind", "palco")
    .eq("status", "aberta")
    .eq("is_test", false)
    .gt("closes_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export default async function SalaPublicaPage() {
  if (!(await salaVozOn())) notFound();
  const id = await openPublicRoom();
  if (id) redirect(`/sala/${id}`);
  const t = await getTranslations("sala");
  return (
    <ClientShell currentRoute="/sala" hideRightSidebar hideBottomBar>
      <Panel className="mx-auto mt-10 max-w-md space-y-4 p-6 text-center" data-sala-publica="fechada">
        <Radio className="mx-auto size-10 text-brand-primary" aria-hidden="true" />
        <h1 className="font-display-condensed text-[2.2rem] uppercase leading-none text-text-display">{t("publicaFechadaTitulo")}</h1>
        <p className="text-sm leading-relaxed text-text-body">{t("publicaFechadaTexto")}</p>
      </Panel>
    </ClientShell>
  );
}
