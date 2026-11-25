// Mover alguém de canal (R20): o dono marca na linha da pessoa, na sala de origem, o canal de destino; o
// estado comum leva o destino por 60 s e o navegador dela troca de canal sozinho (a entrada no destino
// passa pela regra de sempre). A decisão está em mover-regra.ts.

import "server-only";
import { z } from "zod";
import { contextFor, type CallContext } from "./contexto";
import { forgetRoomState } from "./estado";
import { decidirMover, type MoverResultado } from "./mover-regra";
import { isPresent } from "./presenca";
import type { MemberStatus, RoomKind, RoomStatus } from "./tipos";

export const MoverBody = z.object({ destino: z.string().uuid() });

export async function moveMember(ctx: CallContext, targetId: string, destinoId: string): Promise<MoverResultado> {
  const { room, decision, userId } = ctx;
  if (!decision.ok || !room || !userId) return { ok: false, code: decision.ok ? "sala_inexistente" : decision.code };
  const [{ data: alvo }, { data: destino }] = await Promise.all([
    ctx.db.from("voice_room_members").select("status, last_seen_at").eq("room_id", room.id).eq("user_id", targetId).maybeSingle(),
    ctx.db.from("voice_rooms").select("id, kind, status, owner_id, channel_position").eq("id", destinoId).maybeSingle(),
  ]);
  // Quem está na sala de origem já passou pela identidade ao entrar; lotação, privado, banimento e idade
  // a regra da entrada confere no destino.
  const acesso = destino ? (await contextFor(destino.id, { userId: targetId, discord: true }, true, { fn: "access" }, ctx.now)).decision : null;
  const regra = decidirMover({
    atorPapel: decision.role, origemId: room.id, donoDaOrigem: room.ownerId, alvoId: targetId,
    alvoPresente: isPresent(alvo ? { status: alvo.status as MemberStatus, lastSeenAt: alvo.last_seen_at } : null, ctx.now),
    destino: destino && { id: destino.id, kind: destino.kind as RoomKind, status: destino.status as RoomStatus, ownerId: destino.owner_id, canal: destino.channel_position !== null },
    acessoDoAlvo: acesso,
  });
  if (!regra.ok) return regra;
  const { error } = await ctx.db.from("voice_room_members").update({ moved_to: destinoId, moved_at: ctx.now.toISOString() })
    .eq("room_id", room.id).eq("user_id", targetId).eq("status", "ativo");
  if (error) throw new Error(`mover: ${error.message}`);
  forgetRoomState(room.id, targetId);
  return { ok: true };
}
