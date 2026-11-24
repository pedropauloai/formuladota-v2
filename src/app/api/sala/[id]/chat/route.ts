// Mandar mensagem no chat da sala pública (até 300 caracteres, uma a cada 2 s).
import { ChatBody, sendChat } from "@/lib/sala/chat";
import { loadCallContext } from "@/lib/sala/contexto";
import { badRequest, bodyOf, deniedResponse, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, ChatBody);
  if (!body) return badRequest();
  const result = await sendChat(await loadCallContext(roomId), body.texto);
  return result.ok ? Response.json(result) : deniedResponse(result.code);
}
