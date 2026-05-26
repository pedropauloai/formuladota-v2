"use server";

// Server Actions de edição de profile (Phase 9).
// Todas validam com Zod, autenticam via auth.getUser(), e usam createClient
// do user (RLS protege — não service role).
//
// Per decisões D-18 (status), D-19 (heroes), D-20 (portrait), D-22 (Zod+RLS),
// D-37 (last_seen heartbeat).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidHeroSlug } from "@/lib/queries/heroes";

// ---------------------------------------------------------------------------
// updateStatusMessage — Aba Status do modal (D-18)
// ---------------------------------------------------------------------------

const StatusSchema = z
  .string()
  .max(60, "Mensagem deve ter no máximo 60 caracteres")
  .transform((s) => s.trim()); // trim sempre

export async function updateStatusMessage(text: string): Promise<void> {
  const parsed = StatusSchema.safeParse(text);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Mensagem inválida");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const valueToSave = parsed.data.length === 0 ? null : parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ status_message: valueToSave })
    .eq("id", user.id); // defesa em profundidade além de RLS

  if (error) {
    console.error("[updateStatusMessage] error:", error);
    throw new Error("Não foi possível salvar o status");
  }

  revalidatePath("/me");
}

// ---------------------------------------------------------------------------
// updateFavoriteHeroes — Aba Heróis Favoritos do modal (D-19)
// ---------------------------------------------------------------------------

const FavoriteHeroesSchema = z
  .array(z.string().min(1, "Slug vazio"))
  .max(3, "Máximo 3 heróis favoritos")
  .superRefine((slugs, ctx) => {
    // Cada slug deve existir no catálogo estático
    for (const slug of slugs) {
      if (!isValidHeroSlug(slug)) {
        ctx.addIssue({
          code: "custom",
          message: `Herói não encontrado: ${slug}`,
        });
      }
    }
    // Sem duplicatas
    if (new Set(slugs).size !== slugs.length) {
      ctx.addIssue({ code: "custom", message: "Não pode repetir heróis" });
    }
  });

export async function updateFavoriteHeroes(slugs: string[]): Promise<void> {
  const parsed = FavoriteHeroesSchema.safeParse(slugs);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Heróis inválidos");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_heroes: parsed.data })
    .eq("id", user.id);

  if (error) {
    console.error("[updateFavoriteHeroes] error:", error);
    throw new Error("Não foi possível salvar os heróis favoritos");
  }

  revalidatePath("/me");
}

// ---------------------------------------------------------------------------
// updateHeroPortrait — Aba Hero Portrait do modal (D-20)
// ---------------------------------------------------------------------------

const HeroPortraitSchema = z
  .string()
  .min(1, "Slug obrigatório")
  .refine((slug) => isValidHeroSlug(slug), "Herói não encontrado");

export async function updateHeroPortrait(slug: string): Promise<void> {
  const parsed = HeroPortraitSchema.safeParse(slug);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Slug inválido");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("profiles")
    .update({ hero_portrait_slug: parsed.data })
    .eq("id", user.id);

  if (error) {
    console.error("[updateHeroPortrait] error:", error);
    throw new Error("Não foi possível salvar o hero portrait");
  }

  revalidatePath("/me");
}

// ---------------------------------------------------------------------------
// updateLastSeen — Heartbeat 60s do FriendsList (D-37)
// ---------------------------------------------------------------------------
// Chamado periodicamente pelo Client Component que mantém presence channel.
// Não revalida path (heartbeat silencioso — não invalida cache de páginas).

export async function updateLastSeen(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // silent fail — heartbeat não deve quebrar tela

  const { error } = await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("[updateLastSeen] error:", error);
    // não throw — heartbeat é best-effort
  }
}
