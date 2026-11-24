// Denúncia identificada de alguém da sala (ECA Digital, arts. 28 e 29): grava e avisa o PPA.
import { loadCallContext } from "@/lib/sala/contexto";
import { DenunciaBody, report } from "@/lib/sala/moderacao";
import { badRequest, bodyOf, deniedResponse, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, DenunciaBody);
  if (!body) return badRequest();
  const result = await report(await loadCallContext(roomId), body);
  return result.ok ? Response.json({ ok: true }) : deniedResponse(result.code);
}
