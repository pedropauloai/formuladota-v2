"use server";

// Ações da página da fila: garantir a vaga na party (Pix na página ou cartão no Mercado Pago) e
// sair da fila enquanto espera. O resto da página só lê (rotas /api/party/fila e /minha).

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { ORIGIN_COOKIE, parseOrigin } from "@/lib/loja/attribution";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { PAYMENT_METHODS } from "@/lib/loja/checkout-schema";
import { buySeat, type BuySeatResult } from "@/lib/loja/fila/purchase";
import { queueOps } from "@/lib/loja/fila/admin";
import { sendQueueExitNotice } from "@/lib/loja/fila/notify";

export type GarantirVagaResult = BuySeatResult | { ok: false; error: "login" | "muitas" };

const input = z.object({ quantity: z.number().int().min(1).max(20), method: z.enum(PAYMENT_METHODS) });

export async function garantirVaga(quantity: number, method: string): Promise<GarantirVagaResult> {
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) return { ok: false, error: "fechada" };
  // Cada pedido abre uma cobrança no Mercado Pago. O freio é por pessoa (comprar exige login); o por
  // IP é largo, porque na operadora de celular muita gente sai pelo mesmo IP (CGNAT).
  if (!allowRequest("fila-pedido-ip", clientIp(await headers()), 60, 10 * 60_000)) return { ok: false, error: "muitas" };
  const parsed = input.safeParse({ quantity, method });
  if (!parsed.success) return { ok: false, error: "quantidade" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "login" };
  if (!allowRequest("fila-pedido", user.id, 6, 10 * 60_000)) return { ok: false, error: "muitas" };
  const origin = parseOrigin((await cookies()).get(ORIGIN_COOKIE)?.value);
  try {
    return await buySeat({ userId: user.id, email: user.email, quantity: parsed.data.quantity, method: parsed.data.method, origin });
  } catch (err) {
    console.error("[fila] garantir vaga falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "pagamento" };
  }
}

export type SairDaFilaResult = { ok: true } | { ok: false; error: "login" | "muitas" | "sair" };

/** Sai da fila enquanto espera; o Pedro recebe o aviso para devolver as partidas não jogadas. */
export async function sairDaFila(bookingId: string): Promise<SairDaFilaResult> {
  if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "sair" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "login" };
  if (!allowRequest("fila-sair", user.id, 10, 10 * 60_000)) return { ok: false, error: "muitas" };
  try {
    // O banco confere que a vaga é de quem pediu e que ainda espera (não está na party).
    if (!(await queueOps.leave(bookingId, user.id))) return { ok: false, error: "sair" };
  } catch (err) {
    console.error("[fila] sair da fila falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "sair" };
  }
  const notify = () => sendQueueExitNotice(bookingId);
  try {
    // Na Cloudflare o after() vira waitUntil: o aviso termina depois da resposta.
    after(notify);
  } catch {
    void notify();
  }
  return { ok: true };
}
