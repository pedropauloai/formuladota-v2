// Cliente AbacatePay V2 — Transparent PIX (QR Code inline).
// Não usar produto Checkout (página hospedada); só Transparent.
// Docs: https://docs.abacatepay.com/pages/transparents/create.md

import crypto from "node:crypto";
import { requireServerEnv } from "@/lib/env";
import {
  createTransparentPixInputSchema,
  transparentPixResponseSchema,
  type CreateTransparentPixInput,
  type TransparentPixData,
} from "@/types/abacatepay";

const BASE_URL = "https://api.abacatepay.com/v2";

// Resultado discriminated union — força caller a checar .success
export type CreateTransparentPixResult =
  | { success: true; data: TransparentPixData }
  | { success: false; error: string };

/**
 * Cria um PIX transparente (QR Code inline) na AbacatePay V2.
 * Retorna `brCode` (texto copiar-e-colar) e `brCodeBase64` (PNG data URL).
 *
 * O `externalId` deve ser o `purchase.id` do nosso DB — usado como metadata
 * para correlacionar o webhook de volta.
 */
export async function createTransparentPix(
  input: CreateTransparentPixInput
): Promise<CreateTransparentPixResult> {
  const parsed = createTransparentPixInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Input inválido para criar PIX." };
  }

  const apiKey = requireServerEnv("ABACATEPAY_API_KEY");
  const body = {
    method: "PIX" as const,
    data: {
      amount: parsed.data.amount,
      description: parsed.data.description,
      expiresIn: parsed.data.expiresIn ?? 3600,
      metadata: { externalId: parsed.data.externalId },
    },
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/transparents/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[abacatepay] fetch falhou:", err);
    return { success: false, error: "Falha de rede ao contatar AbacatePay." };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    console.error("[abacatepay] resposta JSON inválida");
    return { success: false, error: "Resposta inválida do AbacatePay." };
  }

  const validated = transparentPixResponseSchema.safeParse(json);

  if (!validated.success) {
    console.error("[abacatepay] resposta inesperada:", json);
    return { success: false, error: "Resposta inesperada da AbacatePay." };
  }

  if (!validated.data.success || !validated.data.data) {
    return {
      success: false,
      error: validated.data.error ?? "AbacatePay retornou erro.",
    };
  }

  return { success: true, data: validated.data.data };
}

/**
 * Verifica HMAC-SHA256 (base64) do webhook AbacatePay.
 *
 * IMPORTANTE: passar o `rawBody` lido via `request.text()` ANTES de qualquer
 * `JSON.parse`. Parsear+stringificar muda whitespace e quebra a assinatura.
 *
 * Usa `timingSafeEqual` para mitigar timing attacks (per C8).
 */
export function verifyAbacatepayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const secret = requireServerEnv("ABACATEPAY_WEBHOOK_SECRET");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
