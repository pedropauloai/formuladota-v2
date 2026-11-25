// Entrar na sala de voz: confere o acesso e devolve as credenciais de TURN de curta duração.
import { after } from "next/server";
import { loadCallContext } from "@/lib/sala/contexto";
import { enterRoom } from "@/lib/sala/entrada";
import { avisarCanais } from "@/lib/sala/lista-canais";
import { deniedResponse, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const contexto = await loadCallContext(roomId);
  const result = await enterRoom(contexto);
  // A árvore de todo mundo mostra quem entrou na hora (na Cloudflare, o after vira waitUntil).
  if (result.ok) after(() => avisarCanais(contexto.db));
  if (!result.ok) return result.code === "sala_indisponivel" ? Response.json({ errorCode: result.code }, { status: 503 }) : deniedResponse(result.code);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
