// Intermediário do SFU (spec, ADR-002): o cliente partytracks chama /api/sala/[id]/rtc/* como se
// fosse a API da Cloudflare; aqui se confere quem pede e o quê, e só então se repassa com o segredo.

import "server-only";
import { z } from "zod";
import { loadCallContext, type CallContext } from "./contexto";
import { closeMids, getSession, insertSession, type SessionRow } from "./dados-rtc";
import { ensureMember, touchMember } from "./dados-sala";
import { handleNewTracks, TracksBody } from "./proxy-faixas";
import { createSfuSession, realtimeEnv, sfu, type RealtimeEnv } from "./realtime-api";
import { closeUserSessions } from "./sessoes";

export const MAX_BODY_BYTES = 64 * 1024;
export const SESSION_ID = /^[A-Za-z0-9_-]{8,128}$/;
const IP = /^[0-9a-fA-F:.]{3,45}$/;

type Route = { kind: "new" } | { kind: "tracks" | "renegotiate" | "close"; sid: string };

export function sfuError(status: number, errorCode: string, errorDescription: string): Response {
  return Response.json({ errorCode, errorDescription, tracks: [] }, { status });
}

export function matchRoute(method: string, segments: string[]): Route | null {
  const [a, b, c, d] = segments;
  if (a !== "sessions" || segments.length < 2) return null;
  if (method === "POST" && b === "new" && segments.length === 2) return { kind: "new" };
  if (!b || !SESSION_ID.test(b)) return null;
  if (method === "POST" && c === "tracks" && d === "new" && segments.length === 4) return { kind: "tracks", sid: b };
  if (method === "PUT" && c === "renegotiate" && segments.length === 3) return { kind: "renegotiate", sid: b };
  if (method === "PUT" && c === "tracks" && d === "close" && segments.length === 4) return { kind: "close", sid: b };
  return null;
}

/** Corpo em JSON até 64 KB; `undefined` quando vazio, `null` quando grande demais ou inválido. */
export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function clientIp(req: Request): string | null {
  const raw = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "";
  const ip = raw.trim();
  return IP.test(ip) ? ip : null;
}

/** Sessão aberta desta pessoa, nesta sala. */
async function ownedSession(ctx: CallContext, sid: string): Promise<SessionRow | null> {
  if (!ctx.userId || !ctx.room) return null;
  const s = await getSession(ctx.db, sid);
  return s && s.roomId === ctx.room.id && s.userId === ctx.userId && !s.closedAt ? s : null;
}

async function newSession(ctx: CallContext, env: RealtimeEnv, req: Request): Promise<Response> {
  const room = ctx.room;
  const userId = ctx.userId;
  if (!room || !userId || !ctx.decision.ok) return sfuError(403, "sem_acesso", "sem acesso à sala");
  const res = await createSfuSession(env);
  const sessionId = typeof res.body.sessionId === "string" ? res.body.sessionId : null;
  if (res.status >= 300 || !sessionId || !SESSION_ID.test(sessionId)) return Response.json(res.body, { status: res.status >= 300 ? res.status : 502 });
  await closeUserSessions(ctx.db, env, { roomId: room.id, userId }, "nova_sessao", ctx.now);
  await insertSession(ctx.db, { id: sessionId, roomId: room.id, userId, ip: clientIp(req), userAgent: req.headers.get("user-agent")?.slice(0, 400) ?? null });
  await ensureMember(ctx.db, room.id, userId, ctx.decision.role, ctx.decision.role === "dono" ? "dono" : "party");
  await touchMember(ctx.db, room.id, userId, null, ctx.now);
  return Response.json(res.body, { status: res.status });
}

const Renegotiate = z.object({ sessionDescription: z.object({ type: z.enum(["answer", "offer"]), sdp: z.string().min(1).max(60_000) }) });
const Close = z.object({
  tracks: z.array(z.object({ mid: z.string().min(1).max(32) })).min(1).max(64),
  sessionDescription: z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().min(1).max(60_000) }).optional(),
  force: z.boolean(),
});

async function renegotiate(ctx: CallContext, env: RealtimeEnv, session: SessionRow, body: unknown): Promise<Response> {
  const parsed = Renegotiate.safeParse(body);
  if (!parsed.success) return sfuError(400, "corpo_invalido", "renegociação fora do formato");
  const res = await sfu(env, `/sessions/${session.id}/renegotiate`, { method: "PUT", body: parsed.data });
  return Response.json(res.body, { status: res.status });
}

async function closeTracks(ctx: CallContext, env: RealtimeEnv, session: SessionRow, body: unknown): Promise<Response> {
  const parsed = Close.safeParse(body);
  if (!parsed.success) return sfuError(400, "corpo_invalido", "fechamento fora do formato");
  const res = await sfu(env, `/sessions/${session.id}/tracks/close`, { method: "PUT", body: parsed.data });
  if (res.status < 300) await closeMids(ctx.db, session.id, parsed.data.tracks.map((t) => t.mid), ctx.now);
  return Response.json(res.body, { status: res.status });
}

export async function handleRtc(roomId: string, segments: string[], req: Request): Promise<Response> {
  const route = matchRoute(req.method, segments);
  if (!route) return sfuError(404, "rota_inexistente", "rota do SFU não atendida");
  const env = realtimeEnv();
  if (!env) return sfuError(503, "sala_indisponivel", "sala de voz indisponível");
  const body = await readJson(req);
  if (body === null) return sfuError(400, "corpo_invalido", "corpo grande demais ou fora do formato");
  const ctx = await loadCallContext(roomId);
  if (route.kind === "new") return newSession(ctx, env, req);
  const session = await ownedSession(ctx, route.sid);
  if (!session) return sfuError(403, "sessao_alheia", "sessão de outra pessoa ou já fechada");
  // Fechar sempre pode (só reduz o tráfego); o resto pede acesso válido agora.
  if (route.kind === "close") return closeTracks(ctx, env, session, body);
  if (!ctx.decision.ok) return sfuError(403, ctx.decision.code, "sem acesso à sala");
  if (route.kind === "renegotiate") return renegotiate(ctx, env, session, body);
  const parsed = TracksBody.safeParse(body);
  if (!parsed.success) return sfuError(400, "corpo_invalido", "pedido de faixa fora do formato");
  return handleNewTracks(ctx, env, session, parsed.data);
}
