// Catálogo ativo da loja. Leitura pela RLS pública (só produto e opção ativos aparecem),
// então serve tanto para visitante quanto para a ação de compra.

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isFormField, type FormField } from "./checkout-schema";

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
  variants: StoreVariant[];
  /** Menor preço entre as opções: o "a partir de" do card. */
  fromPriceCents: number;
}

const SELECT =
  "id, slug, kind, title, summary, description_md, delivery_md, form_fields, requires_login, display_order, " +
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
  store_product_variants: Array<{ id: string; slug: string; label: string; price_cents: number; active: boolean; display_order: number }>;
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
    variants,
    fromPriceCents: Math.min(...variants.map((v) => v.priceCents)),
  };
}

export const getActiveProducts = cache(async (): Promise<StoreProduct[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_products")
    .select(SELECT)
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[loja] catálogo:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as ProductRow[]).flatMap((row) => toProduct(row) ?? []);
});

export const getActiveProduct = cache(async (slug: string): Promise<StoreProduct | null> => {
  const products = await getActiveProducts();
  return products.find((p) => p.slug === slug) ?? null;
});
