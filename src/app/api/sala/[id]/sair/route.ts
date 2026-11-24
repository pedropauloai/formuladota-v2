// Sair da sala: fecha a sessão no SFU. Também chega por sendBeacon quando a aba fecha.
import { loadCallContext } from "@/lib/sala/contexto";
import { leaveRoom } from "@/lib/sala/entrada";
import { notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  await leaveRoom(await loadCallContext(roomId));
  return new Response(null, { status: 204 });
}
