// Bloquear alguém da sala: usa o bloqueio de amizade e corta o áudio entre os dois na hora.
import { loadCallContext } from "@/lib/sala/contexto";
import { block, UserBody } from "@/lib/sala/moderacao";
import { badRequest, bodyOf, deniedResponse, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, UserBody);
  if (!body) return badRequest();
  const result = await block(await loadCallContext(roomId), body.userId);
  return result.ok ? Response.json({ ok: true }) : deniedResponse(result.code);
}
