// O dono apaga uma mensagem do chat para todos (ela fica guardada para a moderação até o prazo).
import { z } from "zod";
import { deleteChat } from "@/lib/sala/chat";
import { loadCallContext } from "@/lib/sala/contexto";
import { deniedResponse, notFound } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MsgId = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; msgId: string }> }) {
  const { id, msgId } = await ctx.params;
  const message = MsgId.safeParse(msgId);
  if (!z.string().uuid().safeParse(id).success || !message.success) return notFound();
  const result = await deleteChat(await loadCallContext(id), message.data);
  return result.ok ? Response.json({ ok: true }) : deniedResponse(result.code);
}
