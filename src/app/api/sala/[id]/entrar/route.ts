// Entrar na sala de voz: confere o acesso e devolve as credenciais de TURN de curta duração.
import { loadCallContext } from "@/lib/sala/contexto";
import { enterRoom } from "@/lib/sala/entrada";
import { deniedResponse, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const result = await enterRoom(await loadCallContext(roomId));
  if (!result.ok) return result.code === "sala_indisponivel" ? Response.json({ errorCode: result.code }, { status: 503 }) : deniedResponse(result.code);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
