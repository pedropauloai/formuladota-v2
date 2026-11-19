"use server";

// Ações do Battlepass na /planos: assinar no cartão, pagar 30 dias no Pix, conferir o pagamento,
// cancelar a renovação e pedir o dinheiro de volta na garantia. Preço e estado nunca vêm do
// navegador: o servidor lê a sessão, grava com service role e confere no Mercado Pago.

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { allowRequest, clientIp } from "@/lib/loja/rate-limit";
import { getIdentityMap } from "@/lib/queries/identities";
import { cancelRenewal, startCardSubscription, syncCardSubscription } from "@/lib/battlepass/card";
import { reconcilePix, startPix } from "@/lib/battlepass/pix";
import { requestRefund } from "@/lib/battlepass/refund";
import { currentSubscription, getMyBattlepass, type MyBattlepass, type PendingPix } from "@/lib/battlepass/server";

type Fail = { ok: false; error: "login" | "muitas" | "falhou"; message?: string };

async function viewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export type AssinarResult = { ok: true; url: string } | Fail;

/** Abre a assinatura no cartão e devolve o checkout do Mercado Pago para o navegador ir. */
export async function assinarNoCartao(): Promise<AssinarResult> {
  if (!allowRequest("battlepass-ip", clientIp(await headers()), 60, 10 * 60_000)) return { ok: false, error: "muitas" };
  const user = await viewer();
  if (!user?.email) return { ok: false, error: "login" };
  if (!allowRequest("battlepass-assinar", user.id, 6, 10 * 60_000)) return { ok: false, error: "muitas" };
  try {
    const started = await startCardSubscription({ id: user.id, email: user.email });
    return started.ok ? started : { ok: false, error: "falhou", message: started.error };
  } catch (err) {
    console.error("[battlepass] assinar no cartão falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "falhou" };
  }
}

export type PixResult = { ok: true; pix: PendingPix } | Fail;

/** Gera o Pix de 30 dias (ou devolve o que já está pendente). */
export async function pagarNoPix(): Promise<PixResult> {
  if (!allowRequest("battlepass-ip", clientIp(await headers()), 60, 10 * 60_000)) return { ok: false, error: "muitas" };
  const user = await viewer();
  if (!user?.email) return { ok: false, error: "login" };
  if (!allowRequest("battlepass-pix", user.id, 6, 10 * 60_000)) return { ok: false, error: "muitas" };
  try {
    const identities = await getIdentityMap(await createClient(), [user.id]);
    const name = identities.get(user.id)?.name || "Jogador FORMULADOTA";
    const started = await startPix({ id: user.id, email: user.email, name });
    return started.ok ? started : { ok: false, error: "falhou", message: started.error };
  } catch (err) {
    console.error("[battlepass] gerar Pix falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "falhou" };
  }
}

export type ConferirResult = { ok: true; me: MyBattlepass } | Fail;

const conferirInput = z.object({ assinatura: z.string().uuid().optional() });

/**
 * A página chama enquanto espera o Pix ou na volta do checkout do cartão: confere no Mercado Pago
 * (no máximo a cada 3 s por Pix) e devolve o estado novo.
 */
export async function conferirBattlepass(args: { assinatura?: string } = {}): Promise<ConferirResult> {
  const parsed = conferirInput.safeParse(args);
  if (!parsed.success) return { ok: false, error: "falhou" };
  const user = await viewer();
  if (!user) return { ok: false, error: "login" };
  if (!allowRequest("battlepass-conferir", user.id, 120, 10 * 60_000)) return { ok: false, error: "muitas" };
  try {
    const before = await getMyBattlepass(user.id);
    if (before.pendingPix) await reconcilePix(before.pendingPix.paymentId);
    const sub = await currentSubscription(user.id);
    const waitingCard = sub && sub.provider === "mp" && (before.view.state === "aguardando_cartao" || sub.id === parsed.data.assinatura);
    if (waitingCard && sub.user_id === user.id) {
      await createServiceClient().from("subscriptions").update({ checked_at: new Date().toISOString() }).eq("id", sub.id);
      await syncCardSubscription(sub);
    }
    return { ok: true, me: await getMyBattlepass(user.id) };
  } catch (err) {
    console.error("[battlepass] conferir falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "falhou" };
  }
}

export type SimplesResult = { ok: true } | Fail;

/** Para a renovação no cartão; o acesso continua até o fim do período pago. */
export async function cancelarRenovacao(): Promise<SimplesResult> {
  const user = await viewer();
  if (!user) return { ok: false, error: "login" };
  if (!allowRequest("battlepass-cancelar", user.id, 6, 10 * 60_000)) return { ok: false, error: "muitas" };
  try {
    const sub = await currentSubscription(user.id);
    if (!sub) return { ok: false, error: "falhou", message: "Não há assinatura para cancelar." };
    const result = await cancelRenewal(sub);
    return result.ok ? result : { ok: false, error: "falhou", message: result.error };
  } catch (err) {
    console.error("[battlepass] cancelar renovação falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "falhou" };
  }
}

export type ReembolsoResult = { ok: true; totalCents: number } | Fail;

/** Garantia de 7 dias: encerra o acesso e avisa o Pedro de quanto devolver. */
export async function pedirReembolso(): Promise<ReembolsoResult> {
  const user = await viewer();
  if (!user) return { ok: false, error: "login" };
  if (!allowRequest("battlepass-reembolso", user.id, 3, 10 * 60_000)) return { ok: false, error: "muitas" };
  try {
    const result = await requestRefund(user.id);
    return result.ok ? result : { ok: false, error: "falhou", message: result.error };
  } catch (err) {
    console.error("[battlepass] pedir reembolso falhou:", err instanceof Error ? err.message : err);
    return { ok: false, error: "falhou" };
  }
}
