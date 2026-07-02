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
import { dashboardLayoutSchema } from "@/lib/queries/dashboard-layout";

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
// setOfficialNick — registro ÚNICO do nick oficial (Pedro 2026-07-02)
// ---------------------------------------------------------------------------
// Anti-anonimato: o nick vem do Discord, mas o user pode corrigir UMA vez
// (números/maiúsculas). `official_nick_set` (migration 108) trava o uso único.

const OfficialNickSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(2, "Mínimo 2 caracteres")
      .max(32, "Máximo 32 caracteres")
      .regex(/^[\p{L}\p{N} ._-]+$/u, "Use só letras, números, espaço e . _ -")
  );

export async function setOfficialNick(nick: string): Promise<void> {
  const parsed = OfficialNickSchema.safeParse(nick);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Nick inválido");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // Uso único: se já registrou o nick oficial, bloqueia.
  const { data: row } = await supabase
    .from("profiles")
    .select("official_nick_set")
    .eq("id", user.id)
    .single();
  if (row?.official_nick_set) {
    throw new Error("Você já registrou seu nick oficial — é uso único.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data, official_nick_set: true })
    .eq("id", user.id);

  if (error) {
    console.error("[setOfficialNick] error:", error);
    throw new Error("Não foi possível registrar o nick oficial");
  }

  revalidatePath("/me");
}

// ---------------------------------------------------------------------------
// updateSocialLinks — redes sociais do usuário (Pedro 2026-07-02)
// ---------------------------------------------------------------------------
// O Discord vem do login; aqui o user registra as outras redes (URL do perfil).
// Guardamos a URL completa por rede (sem adivinhar formato de handle).

const SOCIAL_KEYS = ["twitch", "youtube", "kick", "instagram", "twitter"] as const;

const urlOrEmpty = z
  .string()
  .trim()
  .max(200, "URL longa demais")
  .refine((s) => s === "" || /^https?:\/\/.+\..+/.test(s), "URL inválida (use https://…)");

const SocialLinksSchema = z.object({
  twitch: urlOrEmpty.optional(),
  youtube: urlOrEmpty.optional(),
  kick: urlOrEmpty.optional(),
  instagram: urlOrEmpty.optional(),
  twitter: urlOrEmpty.optional(),
});

export async function updateSocialLinks(
  links: Record<string, string>
): Promise<void> {
  const parsed = SocialLinksSchema.safeParse(links);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Links inválidos");
  }

  // Só guarda as redes preenchidas (string vazia = remover o vínculo).
  const clean: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const v = parsed.data[key]?.trim();
    if (v) clean[key] = v;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("profiles")
    .update({ social_links: clean })
    .eq("id", user.id);

  if (error) {
    console.error("[updateSocialLinks] error:", error);
    throw new Error("Não foi possível salvar as redes sociais");
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

// ---------------------------------------------------------------------------
// resetDashboardLayout — restaura layout DEFAULT (Pedro 2026-05-26)
// ---------------------------------------------------------------------------
// Seta dashboard_layout=NULL. Na próxima leitura, parseDashboardLayout retorna
// DEFAULT_LAYOUT (centralizado, cols 3-10). Client chama router.refresh() pra
// re-fetch o profile e o DashboardGrid remonta com o default.

export async function resetDashboardLayout(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_layout: null })
    .eq("id", user.id);

  if (error) {
    console.error("[resetDashboardLayout] error:", error);
    throw new Error("Não foi possível restaurar o layout padrão");
  }

  revalidatePath("/me");
}

// ---------------------------------------------------------------------------
// updateDashboardLayout — salva posicionamento dos widgets do /me (Phase 9.1)
// ---------------------------------------------------------------------------
// Chamada com debounce 1s pelo DashboardGrid client após cada drop em edit mode.
// Não revalidatePath — UI já tem state local; revalidação seria flicker desnecessário.

export async function updateDashboardLayout(layout: unknown): Promise<void> {
  const parsed = dashboardLayoutSchema.safeParse(layout);
  if (!parsed.success) {
    throw new Error("Layout inválido");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_layout: parsed.data })
    .eq("id", user.id);

  if (error) {
    console.error("[updateDashboardLayout] error:", error);
    throw new Error("Não foi possível salvar o layout");
  }
}

