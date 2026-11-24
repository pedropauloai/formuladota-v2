// Batimento da sala a cada 2 s: presença, microfone, métricas e o estado já filtrado para quem pede.
import { loadCallContext } from "@/lib/sala/contexto";
import { EstadoBody, roomState } from "@/lib/sala/estado";
import { badRequest, bodyOf, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, EstadoBody);
  if (!body) return badRequest();
  const estado = await roomState(await loadCallContext(roomId), body);
  return Response.json(estado, { headers: { "Cache-Control": "no-store" } });
}
