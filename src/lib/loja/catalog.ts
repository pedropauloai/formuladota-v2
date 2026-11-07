// Catálogo ativo da loja. Leitura pela RLS pública (só produto e opção ativos aparecem),
// então serve tanto para visitante quanto para a ação de compra.

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isTestMode } from "@/lib/mercadopago";
import { isFormField, type FormField } from "./checkout-schema";
import { parseMmrTiers, type MmrTier } from "./pricing";

export const STORE_MODES = ["live", "gravado", "fora_da_live", "agendado", "digital"] as const;
export type StoreMode = (typeof STORE_MODES)[number];

export interface StoreVariant {
  id: string;
  slug: string;
  label: string;
  priceCents: number;
}

export interface StoreProduct {
  id: string;
  slug: string;
  kind: "servico" | "digital";
  title: string;
  summary: string;
  descriptionMd: string;
  deliveryMd: string;
  formFields: FormField[];
  requiresLogin: boolean;
  /** Onde acontece: na live, gravado, fora da live, com hora marcada ou digital. */
  mode: StoreMode;
  /** Arte oficial do Dota: "item:<nome>", "hero:<nome>" ou "medalhas". */
  art: string | null;
  /** Unidade que acompanha o preço ("por partida", "a cada 100 MMR"). */
  priceUnit: string;
  maxQuantity: number;
  /** Vagas por mês; null = sem limite. */
  monthlyCapacity: number | null;
  /** Faixas de preço do boost; null = preço fixo da opção. */
  mmrTiers: MmrTier[] | null;
  variants: StoreVariant[];
  /** Menor preço entre as opções: o "a partir de" do card. */
  fromPriceCents: number;
}

const SELECT =
  "id, slug, kind, title, summary, description_md, delivery_md, form_fields, requires_login, display_order, " +
  "mode, art, price_unit, max_quantity, monthly_capacity, mmr_tiers, is_test, " +
  "store_product_variants (id, slug, label, price_cents, active, display_order)";

interface ProductRow {
  id: string;
  slug: string;
  kind: string;
  title: string;
  summary: string;
  description_md: string;
  delivery_md: string;
  form_fields: string[];
  requires_login: boolean;
  display_order: number;
  mode: string;
  art: string | null;
  price_unit: string;
  max_quantity: number;
  monthly_capacity: number | null;
  mmr_tiers: unknown;
  is_test: boolean;
  store_product_variants: Array<{ id: string; slug: string; label: string; price_cents: number; active: boolean; display_order: number }>;
}

function toMode(value: string): StoreMode {
  return (STORE_MODES as readonly string[]).includes(value) ? (value as StoreMode) : "agendado";
}

function toProduct(row: ProductRow): StoreProduct | null {
  const variants = row.store_product_variants
    .filter((v) => v.active)
    .sort((a, b) => a.display_order - b.display_order)
    .map((v) => ({ id: v.id, slug: v.slug, label: v.label, priceCents: v.price_cents }));
  // Produto sem opção ativa não tem preço: fica fora da vitrine.
  if (variants.length === 0) return null;
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind === "digital" ? "digital" : "servico",
    title: row.title,
    summary: row.summary,
    descriptionMd: row.description_md,
    deliveryMd: row.delivery_md,
    formFields: row.form_fields.filter(isFormField),
    requiresLogin: row.requires_login,
    mode: toMode(row.mode),
    art: row.art,
    priceUnit: row.price_unit,
    maxQuantity: row.max_quantity,
    monthlyCapacity: row.monthly_capacity,
    mmrTiers: row.mmr_tiers == null ? null : parseMmrTiers(row.mmr_tiers),
    variants,
    fromPriceCents: Math.min(...variants.map((v) => v.priceCents)),
  };
}

export const getActiveProducts = cache(async (): Promise<StoreProduct[]> => {
  const supabase = await createClient();
  let query = supabase.from("store_products").select(SELECT).eq("active", true);
  // O produto do teste de ponta a ponta nunca aparece com a credencial de produção.
  if (!isTestMode()) query = query.eq("is_test", false);
  const { data, error } = await query.order("display_order", { ascending: true });
  if (error) {
    console.error("[loja] catálogo:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as ProductRow[]).flatMap((row) => {
    // Boost com faixa ilegível não vende: o preço sairia errado.
    if (row.mmr_tiers != null && parseMmrTiers(row.mmr_tiers) === null) {
      console.error(`[loja] faixas de MMR inválidas em ${row.slug}`);
      return [];
    }
    return toProduct(row) ?? [];
  });
});

export const getActiveProduct = cache(async (slug: string): Promise<StoreProduct | null> => {
  const products = await getActiveProducts();
  return products.find((p) => p.slug === slug) ?? null;
});
