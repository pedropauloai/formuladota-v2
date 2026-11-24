// Peças comuns das rotas /api/sala/[id]/*: id da sala, corpo em JSON e o código HTTP de cada recusa.

import "server-only";
import { z } from "zod";
import type { DenyCode } from "./tipos";

const RoomId = z.string().uuid();
const MAX_BODY = 64 * 1024;

export type RoomParams = { params: Promise<{ id: string }> };

export async function roomIdOf(ctx: RoomParams): Promise<string | null> {
  const { id } = await ctx.params;
  return RoomId.safeParse(id).success ? id : null;
}

export async function bodyOf<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try {
    const parsed = schema.safeParse(text ? JSON.parse(text) : {});
    return parsed.success ? (parsed.data as z.infer<S>) : null;
  } catch {
    return null;
  }
}

const STATUS: Record<DenyCode, number> = {
  flag_desligada: 404,
  sem_login: 401,
  sala_inexistente: 404,
  fora_da_sala: 403,
  expulso: 403,
  banido: 403,
  so_beneficio: 403,
  sala_encerrada: 410,
  conta_sem_identidade: 403,
  conta_bloqueada: 403,
  sem_maioridade: 403,
  sala_lotada: 409,
};

export function deniedResponse(code: string): Response {
  const status = code in STATUS ? STATUS[code as DenyCode] : 403;
  return Response.json({ errorCode: code }, { status });
}

export function badRequest(): Response {
  return Response.json({ errorCode: "corpo_invalido" }, { status: 400 });
}

export const notFound = (): Response => Response.json({ errorCode: "sala_inexistente" }, { status: 404 });

export const noStore = { headers: { "Cache-Control": "no-store" } } as const;
