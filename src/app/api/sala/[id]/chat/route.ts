// Mandar mensagem no chat (até 300 caracteres, uma a cada 2 s) e ler as anteriores (?antes=id).
import { ChatBody, chatHistory, sendChat } from "@/lib/sala/chat";
import { loadCallContext } from "@/lib/sala/contexto";
import { badRequest, bodyOf, deniedResponse, noStore, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

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

export async function GET(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const antes = Number(new URL(req.url).searchParams.get("antes"));
  if (!Number.isSafeInteger(antes) || antes < 1) return badRequest();
  const result = await chatHistory(await loadCallContext(roomId), antes);
  return result.ok ? Response.json(result.mensagens, noStore) : deniedResponse(result.code);
}
