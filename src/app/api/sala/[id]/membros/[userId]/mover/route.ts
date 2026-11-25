// O dono move alguém da sala para outro canal de voz dele (R20); o navegador da pessoa troca de canal sozinho.
import { z } from "zod";
import { loadCallContext } from "@/lib/sala/contexto";
import { MoverBody, moveMember } from "@/lib/sala/mover";
import { badRequest, bodyOf, deniedResponse, notFound } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Uuid = z.string().uuid();

export async function POST(req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await ctx.params;
  if (!Uuid.safeParse(id).success || !Uuid.safeParse(userId).success) return notFound();
  const body = await bodyOf(req, MoverBody);
  if (!body) return badRequest();
  const result = await moveMember(await loadCallContext(id), userId, body.destino);
  return result.ok ? Response.json({ ok: true }) : deniedResponse(result.code);
}
