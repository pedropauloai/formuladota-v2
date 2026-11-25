// /sala/[id]: um canal do servidor FORMULADOTA (spec: docs/comunicacao/spec.md): canal de voz com tela,
// canal de texto ou sala privada. Flag sala_voz desligada dá 404 para todos, inclusive o admin. A página
// decide o portão (login, convite, maioridade, banido...) pela mesma regra das rotas da API; dentro, a
// tela do cliente fala com /api/sala/[id]. A coluna de canais e o invólucro vêm do layout.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { AceitarConvite } from "@/components/sala/aceitar-convite";
import { CanalTexto } from "@/components/sala/canal-texto";
import { Maioridade } from "@/components/sala/maioridade";
import { Portao, type PortaoTipo } from "@/components/sala/portao";
import { SalaView } from "@/components/sala/sala-view";
import { salaVozOn } from "@/lib/sala/flag";
import { loadCallContext } from "@/lib/sala/contexto";
import { canShareScreen } from "@/lib/sala/papeis";
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
  banido: "banido",
  so_beneficio: "beneficio",
  sala_encerrada: "encerrada",
  conta_sem_identidade: "identidade",
  conta_bloqueada: "bloqueada",
  sala_lotada: "lotada",
};

const Convite = z.string().regex(/^[A-Za-z0-9_-]{20,128}$/);

async function Conteudo({ id, convite }: { id: string; convite: string | null }) {
  const ctx = await loadCallContext(id);
  const next = convite ? `/sala/${id}?convite=${convite}` : `/sala/${id}`;
  if (ctx.decision.ok && ctx.room && ctx.settings) {
    if (ctx.room.kind === "texto") return <CanalTexto key={id} roomId={id} titulo={ctx.room.title} />;
    const share = canShareScreen(ctx.decision.role, ctx.room.kind, ctx.room.voiceMode, ctx.room.screenPolicy, ctx.settings.partyScreenEnabled);
    return <SalaView key={id} roomId={id} titulo={ctx.room.title} tipo={ctx.room.kind} modo={ctx.room.voiceMode} mostrarTela={share} />;
  }
  if (ctx.decision.ok) notFound();
  const code = ctx.decision.code;
  if (code === "flag_desligada" || code === "sala_inexistente") notFound();
  if (code === "sem_maioridade") return <Maioridade roomId={id} next={next} />;
  return (
    <Portao tipo={PORTAO[code] ?? "fora"} next={next}>
      {code === "fora_da_sala" && convite && <AceitarConvite roomId={id} token={convite} />}
    </Portao>
  );
}

export default async function SalaPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  if (!(await salaVozOn())) notFound();
  const raw = (await searchParams).convite;
  const convite = typeof raw === "string" && Convite.safeParse(raw).success ? raw : null;
  return <Conteudo id={id} convite={convite} />;
}
