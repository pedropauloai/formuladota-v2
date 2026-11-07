// Validação do formulário de compra. Cada produto escolhe o que pede além de nome, e-mail e
// WhatsApp (store_products.form_fields); o servidor monta o schema a partir do banco.

import { z } from "zod";

export const FORM_FIELDS = ["discord", "dota_id", "mmr_atual", "mmr_alvo", "match_id", "observacoes"] as const;
export type FormField = (typeof FORM_FIELDS)[number];

export const PAYMENT_METHODS = ["pix", "cartao"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isFormField(value: string): value is FormField {
  return (FORM_FIELDS as readonly string[]).includes(value);
}

/** WhatsApp só com dígitos e DDI 55; null quando não é número brasileiro plausível. */
export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const national = (digits.length === 12 || digits.length === 13) && digits.startsWith("55") ? digits.slice(2) : digits;
  return /^[1-9][1-9]\d{8,9}$/.test(national) ? `55${national}` : null;
}

const MMR_MAX = 15000;

const mmr = z.coerce
  .number({ invalid_type_error: "Informe o MMR em número." })
  .int("Informe o MMR sem casas decimais.")
  .min(0, "O MMR não pode ser negativo.")
  .max(MMR_MAX, "Confira o MMR: passou de 15.000.");

const FIELD_SCHEMAS: Record<FormField, z.ZodTypeAny> = {
  discord: z.string().trim().min(2, "Informe o seu usuário do Discord.").max(40),
  // ID de amigo do Dota (até 10 dígitos) ou SteamID64 (17).
  dota_id: z.string().trim().regex(/^\d{5,17}$/, "O ID do Dota tem só números (o ID de amigo do perfil)."),
  mmr_atual: mmr,
  mmr_alvo: mmr,
  // ID da partida da Valve: hoje com 10 dígitos.
  match_id: z.string().trim().regex(/^\d{8,12}$/, "O ID da partida tem só números (fica no histórico de partidas do Dota)."),
  observacoes: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
};

const baseShape = {
  variantId: z.string().uuid("Escolha uma opção."),
  // O limite de cada produto (store_products.max_quantity) é conferido na hora de dar o preço.
  quantity: z.coerce.number().int("Escolha a quantidade.").min(1, "Escolha a quantidade.").max(20).optional(),
  method: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Escolha Pix ou cartão." }) }),
  name: z.string().trim().min(2, "Informe o seu nome.").max(120),
  email: z.string().trim().toLowerCase().email("Confira o e-mail.").max(254),
  whatsapp: z
    .string()
    .transform((value, ctx) => {
      const normalized = normalizeWhatsapp(value);
      if (!normalized) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o WhatsApp com DDD." });
        return z.NEVER;
      }
      return normalized;
    }),
  aceite: z.literal(true, { errorMap: () => ({ message: "Confirme que leu como a entrega funciona." }) }),
};

export function buildCheckoutSchema(fields: readonly FormField[]) {
  const extra: Partial<Record<FormField, z.ZodTypeAny>> = {};
  for (const field of fields) extra[field] = FIELD_SCHEMAS[field];
  return z
    .object({ ...baseShape, ...extra })
    .superRefine((data, ctx) => {
      const { mmr_atual: atual, mmr_alvo: alvo } = data as { mmr_atual?: number; mmr_alvo?: number };
      if (typeof atual === "number" && typeof alvo === "number" && alvo <= atual) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mmr_alvo"], message: "O MMR alvo precisa ser maior que o atual." });
      }
    });
}

export type CheckoutInput = z.infer<ReturnType<typeof buildCheckoutSchema>>;

/** Só as respostas do formulário próprio do produto vão para store_orders.details. */
export function detailsFrom(input: Record<string, unknown>, fields: readonly FormField[]): Record<string, string | number> {
  const details: Record<string, string | number> = {};
  for (const field of fields) {
    const value = input[field];
    if (typeof value === "number" || (typeof value === "string" && value !== "")) details[field] = value;
  }
  return details;
}

/** Primeira mensagem de erro por campo, no formato que o formulário mostra. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
