// Rótulo da faixa publicada (voz, tela, áudio da tela): sem rótulo, ninguém recebe a faixa.
import { loadCallContext } from "@/lib/sala/contexto";
import { FaixaBody, labelOwnTrack } from "@/lib/sala/entrada";
import { badRequest, bodyOf, deniedResponse, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, FaixaBody);
  if (!body) return badRequest();
  const result = await labelOwnTrack(await loadCallContext(roomId), body);
  return result.ok ? Response.json({ ok: true }) : deniedResponse(result.code);
}
