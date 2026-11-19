"use server";

// Ação da página da fila: garantir a vaga na party (Pix na página ou cartão no Mercado Pago).
// O resto da página só lê (rotas /api/party/fila e /api/party/fila/minha).

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { lojaPreviaLocal } from "@/lib/loja/preview";
import { ORIGIN_COOKIE, parseOrigin } from "@/lib/loja/attribution";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { PAYMENT_METHODS } from "@/lib/loja/checkout-schema";
import { buySeat, type BuySeatResult } from "@/lib/loja/fila/purchase";

export type GarantirVagaResult = BuySeatResult | { ok: false; error: "login" | "muitas" };

const input = z.object({ quantity: z.number().int().min(1).max(20), method: z.enum(PAYMENT_METHODS) });

export async function garantirVaga(quantity: number, method: string): Promise<GarantirVagaResult> {
  const { loja } = await getFeatureFlags();
  if (!loja && !lojaPreviaLocal()) return { ok: false, error: "fechada" };
  // Cada pedido abre uma cobrança no Mercado Pago: o mesmo freio do checkout da loja.
  if (!allowRequest("pedido", clientIp(await headers()), 8, 10 * 60_000)) return { ok: false, error: "muitas" };
  const parsed = input.safeParse({ quantity, method });
  if (!parsed.success) return { ok: false, error: "quantidade" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "login" };
  const origin = parseOrigin((await cookies()).get(ORIGIN_COOKIE)?.value);
  try {
    return await buySeat({ userId: user.id, email: user.email, quantity: parsed.data.quantity, method: parsed.data.method, origin });
  } catch (err) {
    console.error("[fila] garantir vaga falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "pagamento" };
  }
}
