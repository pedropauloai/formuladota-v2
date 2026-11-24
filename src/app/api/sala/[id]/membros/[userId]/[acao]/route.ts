// O dono modera alguém da sala: chamar ao palco, devolver à plateia, mutar, liberar, expulsar, banir.
import { z } from "zod";
import { loadCallContext } from "@/lib/sala/contexto";
import { BanBody, stageAction } from "@/lib/sala/moderacao";
import { badRequest, bodyOf, deniedResponse, notFound } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Uuid = z.string().uuid();
const Acao = z.enum(["falar", "ouvir", "mutar", "liberar", "expulsar", "banir"]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string; userId: string; acao: string }> }) {
  const { id, userId, acao } = await ctx.params;
  const action = Acao.safeParse(acao);
  if (!Uuid.safeParse(id).success || !Uuid.safeParse(userId).success || !action.success) return notFound();
  const body = await bodyOf(req, BanBody);
  if (!body) return badRequest();
  const result = await stageAction(await loadCallContext(id), userId, action.data, body.motivo);
  return result.ok ? Response.json({ ok: true }) : deniedResponse(result.code);
}
