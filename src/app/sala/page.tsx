// /sala: o endereço fixo que o PPA anuncia na live (spec, seção 14). Leva ao canal de voz onde o PPA
// está ao vivo; sem live, ao primeiro canal de texto. Sem login, o portão de entrar. Flag sala_voz
// desligada dá 404 para todos.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Hash } from "lucide-react";
import { Portao } from "@/components/sala/portao";
import { Panel } from "@/components/v2";
import { destinoInicial } from "@/lib/sala/canais";
import { authInfo } from "@/lib/sala/contexto";
import { salaVozOn } from "@/lib/sala/flag";
import { listaDeCanais } from "@/lib/sala/lista-canais";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sala");
  return { title: t("metaTitle") };
}

export default async function SalaInicioPage() {
  if (!(await salaVozOn())) notFound();
  const auth = await authInfo();
  if (!auth) return <Portao tipo="login" next="/sala" />;
  const destino = destinoInicial(await listaDeCanais(createServiceClient(), auth.userId));
  if (destino) redirect(`/sala/${destino}`);
  const t = await getTranslations("sala");
  return (
    <Panel className="m-6 max-w-md space-y-3 p-6" data-sala-publica="fechada">
      <Hash className="size-8 text-text-muted" aria-hidden="true" />
      <h1 className="font-display-condensed text-[2rem] uppercase leading-none text-text-display">{t("servidorVazioTitulo")}</h1>
      <p className="text-sm leading-relaxed text-text-body">{t("servidorVazioTexto")}</p>
    </Panel>
  );
}
