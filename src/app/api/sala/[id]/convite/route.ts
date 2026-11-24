// Convite de uso único da mentoria (comprador que pagou sem login): o primeiro logado que usa fica.
import { loadCallContext } from "@/lib/sala/contexto";
import { claimInvite, ConviteBody } from "@/lib/sala/entrada";
import { badRequest, bodyOf, deniedResponse, notFound, roomIdOf, type RoomParams } from "@/lib/sala/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RoomParams) {
  const roomId = await roomIdOf(ctx);
  if (!roomId) return notFound();
  const body = await bodyOf(req, ConviteBody);
  if (!body) return badRequest();
  const call = await loadCallContext(roomId);
  if (call.decision.ok) return Response.json({ ok: true });
  if (call.decision.code !== "fora_da_sala" || !call.userId) return deniedResponse(call.decision.code);
  const result = await claimInvite(call.db, roomId, call.userId, body.token, call.now);
  if (result === "ok") return Response.json({ ok: true });
  return Response.json({ errorCode: result === "usado" ? "convite_usado" : "convite_invalido" }, { status: result === "usado" ? 409 : 403 });
}
