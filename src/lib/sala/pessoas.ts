// Nome e avatar de quem é ou foi da sala, buscados uma vez por pessoa (spec, ADR-004): o estado comum
// da sala leva só os ids. Mesma regra de nome do resto do site (lib/identity: nome do Discord primeiro,
// avatar da Steam primeiro).

import "server-only";
import { z } from "zod";
import { displayAvatar, displayName } from "@/lib/identity";
import type { CallContext } from "./contexto";

export const PessoasBody = z.object({ ids: z.array(z.string().uuid()).min(1).max(60) });

const Identidades = z.record(
  z.string(),
  z.object({ username: z.string().optional(), avatarUrl: z.string().optional(), steamPersona: z.string().optional(), steamAvatar: z.string().optional() })
);

export type Pessoa = { nome: string; avatarUrl: string | null };

export async function roomPeople(ctx: CallContext, ids: string[]): Promise<{ ok: true; pessoas: Record<string, Pessoa> } | { ok: false; code: string }> {
  const { room, decision } = ctx;
  if (!decision.ok || !room) return { ok: false, code: decision.ok ? "sala_inexistente" : decision.code };
  const { data, error } = await ctx.db.rpc("voice_room_identities", { p_room: room.id, p_ids: ids });
  if (error) throw new Error(`ler os nomes da sala: ${error.message}`);
  const pessoas: Record<string, Pessoa> = {};
  for (const [id, i] of Object.entries(Identidades.parse(data))) {
    const src = { steamPersona: i.steamPersona, steamAvatar: i.steamAvatar, discordUsername: i.username, discordAvatar: i.avatarUrl };
    pessoas[id] = { nome: displayName(src), avatarUrl: displayAvatar(src) };
  }
  return { ok: true, pessoas };
}
