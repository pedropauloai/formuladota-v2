// O dono expulsa alguém: a pessoa sai em até 2 s e não volta a esta sala.
import { z } from "zod";
import { loadCallContext } from "@/lib/sala/contexto";
import { kick } from "@/lib/sala/moderacao";
import { deniedResponse, notFound } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Uuid = z.string().uuid();

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await ctx.params;
  if (!Uuid.safeParse(id).success || !Uuid.safeParse(userId).success) return notFound();
  const result = await kick(await loadCallContext(id), userId);
  return result.ok ? Response.json({ ok: true }) : deniedResponse(result.code);
}
