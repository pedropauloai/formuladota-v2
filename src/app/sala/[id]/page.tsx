// /sala/[id]: sala de voz com tela (spec: docs/comunicacao/spec.md). Flag sala_voz desligada dá 404
// para todos, inclusive o admin. A página decide o portão (login, convite, data de nascimento, menor)
// pela mesma regra das rotas da API; dentro, a tela do cliente fala com /api/sala/[id].

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ClientShell } from "@/components/client-shell/shell";
import { AceitarConvite } from "@/components/sala/aceitar-convite";
import { DataNascimento } from "@/components/sala/data-nascimento";
import { Portao, type PortaoTipo } from "@/components/sala/portao";
import { SalaView } from "@/components/sala/sala-view";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { loadCallContext } from "@/lib/sala/contexto";
import { canShareScreen } from "@/lib/sala/faixas";
import type { DenyCode } from "@/lib/sala/tipos";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sala");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const PORTAO: Partial<Record<DenyCode, PortaoTipo>> = {
  sem_login: "login",
  fora_da_sala: "fora",
  expulso: "expulso",
  sala_encerrada: "encerrada",
  conta_sem_identidade: "identidade",
  conta_bloqueada: "bloqueada",
  menor_de_idade: "menor",
  sala_lotada: "lotada",
};

const Convite = z.string().regex(/^[A-Za-z0-9_-]{20,128}$/);

async function Conteudo({ id, convite }: { id: string; convite: string | null }) {
  const ctx = await loadCallContext(id);
  const next = convite ? `/sala/${id}?convite=${convite}` : `/sala/${id}`;
  if (ctx.decision.ok && ctx.room && ctx.settings) {
    const share = canShareScreen(ctx.decision.role, ctx.room.kind, ctx.room.screenPolicy, ctx.settings.partyScreenEnabled);
    return <SalaView roomId={id} titulo={ctx.room.title} tipo={ctx.room.kind} mostrarTela={share} />;
  }
  if (ctx.decision.ok) notFound();
  const code = ctx.decision.code;
  if (code === "flag_desligada" || code === "sala_inexistente") notFound();
  if (code === "sem_data_de_nascimento") return <DataNascimento roomId={id} />;
  const tipo = PORTAO[code] ?? "fora";
  return (
    <Portao tipo={tipo} next={next}>
      {code === "fora_da_sala" && convite && <AceitarConvite roomId={id} token={convite} />}
    </Portao>
  );
}

export default async function SalaPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  if (!(await getFeatureFlags()).sala_voz) notFound();
  const raw = (await searchParams).convite;
  const convite = typeof raw === "string" && Convite.safeParse(raw).success ? raw : null;
  return (
    <ClientShell currentRoute="/sala" hideRightSidebar hideBottomBar>
      <Conteudo id={id} convite={convite} />
    </ClientShell>
  );
}
