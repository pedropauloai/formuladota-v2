// Nome e avatar de quem é ou foi da sala, uma vez por pessoa (o estado comum leva só os ids).
import { loadCallContext } from "@/lib/sala/contexto";
import { PessoasBody, roomPeople } from "@/lib/sala/pessoas";
import { badRequest, bodyOf, deniedResponse, noStore, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, PessoasBody);
  if (!body) return badRequest();
  const result = await roomPeople(await loadCallContext(roomId), body.ids);
  return result.ok ? Response.json(result.pessoas, noStore) : deniedResponse(result.code);
}
