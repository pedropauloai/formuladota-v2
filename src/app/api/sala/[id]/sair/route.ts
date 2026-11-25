// Sair da sala: fecha a sessão no SFU. Também chega por sendBeacon quando a aba fecha.
import { after } from "next/server";
import { loadCallContext } from "@/lib/sala/contexto";
import { leaveRoom } from "@/lib/sala/entrada";
import { avisarCanais } from "@/lib/sala/lista-canais";
import { notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const contexto = await loadCallContext(roomId);
  await leaveRoom(contexto);
  // A árvore de todo mundo tira quem saiu na hora (na Cloudflare, o after vira waitUntil).
  after(() => avisarCanais(contexto.db));
  return new Response(null, { status: 204 });
}
