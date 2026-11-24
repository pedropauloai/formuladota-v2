// O dono abre ou fecha o chat da sala pública.
import { ChatAbertoBody, setChatOpen } from "@/lib/sala/chat";
import { loadCallContext } from "@/lib/sala/contexto";
import { badRequest, bodyOf, deniedResponse, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, ChatAbertoBody);
  if (!body) return badRequest();
  const result = await setChatOpen(await loadCallContext(roomId), body.aberto);
  return result.ok ? Response.json({ ok: true }) : deniedResponse(result.code);
}
