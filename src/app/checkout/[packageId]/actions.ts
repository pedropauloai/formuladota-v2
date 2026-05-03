"use server";

// Server Action: cria purchase pendente + chama Mercado Pago para gerar PIX.
// Migrado de AbacatePay → MP em Phase 4 (2026-05-02).
// RLS na tabela purchases (migration 004) valida aceite doutrina + status ativo automaticamente.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createPixPayment } from "@/lib/mercadopago";
import { publicEnv } from "@/lib/env";

const checkoutInputSchema = z.object({
  packageId: z.string().uuid(),
});

interface ActivePackage {
  id: string;
  nome: string;
  preco_brl: number;
  qtd_partidas: number;
  qtd_sessoes: number;
}

export type CheckoutResult =
  | {
      success: true;
      purchaseId: string;
      brCode: string;
      brCodeBase64: string;
      expiresAt: string;
    }
  | { success: false; error: string };

type SupabaseSrv = Awaited<ReturnType<typeof createClient>>;

/**
 * Cria uma compra pendente e gera um PIX inline via Mercado Pago V1 /payments.
 * Retorna o QR Code (brCode + brCodeBase64) para o cliente exibir.
 *
 * RLS valida: usuário autenticado + aceite doutrinário + status ok/warned.
 * Se RLS bloqueia (postgres code 42501), retorna mensagem amigável sem vazar detalhes.
 */
export async function createCheckout(packageId: string): Promise<CheckoutResult> {
  const parsed = checkoutInputSchema.safeParse({ packageId });
  if (!parsed.success) {
    return { success: false, error: "ID de pacote inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, error: "Não autenticado." };
  }

  const pkg = await findActivePackage(supabase, parsed.data.packageId);
  if (!pkg) {
    return { success: false, error: "Pacote não encontrado ou inativo." };
  }

  const purchaseRes = await insertPendingPurchase(supabase, user.id, pkg);
  if (!purchaseRes.ok) {
    return { success: false, error: purchaseRes.error };
  }

  // Buscar nome do user pra payer.first_name/last_name (quality_checklist MP [REQUIRED])
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
  const fullName = profile?.username ?? "";
  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ");

  const notificationUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`;
  const pixResult = await createPixPayment({
    amount: pkg.preco_brl,
    description: `FORMULADOTA — ${pkg.nome}`,
    externalReference: purchaseRes.purchaseId,
    payerEmail: user.email,
    payerFirstName: firstName || undefined,
    payerLastName: lastName || undefined,
    notificationUrl,
    itemId: pkg.id,
    itemTitle: pkg.nome,
    itemCategoryId: "services",
    statementDescriptor: "FORMULADOTA",
  });

  if (!pixResult.success) {
    await supabase.from("purchases").delete().eq("id", purchaseRes.purchaseId);
    return { success: false, error: "Erro ao gerar PIX. Tente novamente em instantes." };
  }

  const { error: updateError } = await supabase
    .from("purchases")
    .update({ external_payment_id: pixResult.data.id })
    .eq("id", purchaseRes.purchaseId);

  if (updateError) {
    console.error("[createCheckout] update external_payment_id falhou:", updateError.message);
  }

  // PIX MP expira default 24h; computar timestamp pra UI exibir
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // MP retorna qr_code_base64 sem prefixo data: — adicionar pra <img src> funcionar.
  const brCodeBase64WithPrefix = pixResult.data.qrCodeBase64.startsWith("data:")
    ? pixResult.data.qrCodeBase64
    : `data:image/png;base64,${pixResult.data.qrCodeBase64}`;

  return {
    success: true,
    purchaseId: purchaseRes.purchaseId,
    brCode: pixResult.data.qrCode,
    brCodeBase64: brCodeBase64WithPrefix,
    expiresAt,
  };
}

// Busca pacote ativo pelo id. Retorna null se não encontrado ou inativo.
async function findActivePackage(
  supabase: SupabaseSrv,
  packageId: string
): Promise<ActivePackage | null> {
  const { data, error } = await supabase
    .from("packages")
    .select("id, nome, preco_brl, qtd_partidas, qtd_sessoes")
    .eq("id", packageId)
    .eq("ativo", true)
    .single();

  if (error || !data) return null;
  return data;
}

type PurchaseInsertResult =
  | { ok: true; purchaseId: string }
  | { ok: false; error: string };

// Insere purchase com status 'pendente'. RLS (migration 004) bloqueia se:
// - usuário não aceitou a doutrina, ou
// - status do usuário não é 'ok' ou 'warned' (suspenso/banido)
// Erro 42501 = row-level security policy violation.
async function insertPendingPurchase(
  supabase: SupabaseSrv,
  userId: string,
  pkg: ActivePackage
): Promise<PurchaseInsertResult> {
  const { data, error } = await supabase
    .from("purchases")
    .insert({
      user_id: userId,
      package_id: pkg.id,
      preco_pago: pkg.preco_brl,
      partidas_compradas: pkg.qtd_partidas,
      sessoes_compradas: pkg.qtd_sessoes,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42501") {
      return {
        ok: false,
        error:
          "Você precisa aceitar o código de conduta ou seu acesso está suspenso. Verifique seu perfil.",
      };
    }
    console.error("[insertPendingPurchase] falhou:", error?.message);
    return { ok: false, error: "Erro ao criar compra. Tente novamente." };
  }

  return { ok: true, purchaseId: data.id };
}
