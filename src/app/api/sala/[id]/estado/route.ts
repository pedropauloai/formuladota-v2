// Estado da sala a cada 2 ou 3 s; a cada 10 s (ou quando a pessoa muta ou levanta a mão) leva também o
// batimento e as métricas. O estado comum sai da memória do servidor (spec, ADR-004).
import { EstadoBody, roomState } from "@/lib/sala/estado";
import { badRequest, bodyOf, noStore, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, EstadoBody);
  if (!body) return badRequest();
  return Response.json(await roomState(roomId, body), noStore);
}
