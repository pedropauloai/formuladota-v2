"use server";

// Server Actions de avatar custom (Phase 9 — D-21).
// Upload do arquivo acontece no Client Component (plan 09-08) via
// supabase.storage diretamente — esta Server Action APENAS persiste a URL
// pública resultante em profiles.avatar_custom_url, com validação que a
// URL é mesmo do bucket profile-avatars (defesa contra URL maliciosa).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Aceita URLs do tipo:
//   https://{projectref}.supabase.co/storage/v1/object/public/profile-avatars/...
//   https://{projectref}.supabase.in/storage/v1/object/public/profile-avatars/...
const AvatarUrlSchema = z
  .string()
  .url("URL inválida")
  .refine(
    (url) =>
      /\.supabase\.(co|in)\/storage\/v1\/object\/public\/profile-avatars\//.test(
        url
      ),
    "URL não é do bucket profile-avatars"
  );

export async function saveCustomAvatarUrl(publicUrl: string): Promise<void> {
  const parsed = AvatarUrlSchema.safeParse(publicUrl);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "URL inválida");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // Defesa extra: URL deve conter o folder do próprio user
  if (!parsed.data.includes(`/profile-avatars/${user.id}/`)) {
    throw new Error("URL não pertence ao seu folder");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_custom_url: parsed.data })
    .eq("id", user.id);

  if (error) {
    console.error("[saveCustomAvatarUrl] error:", error);
    throw new Error("Não foi possível salvar o avatar");
  }

  revalidatePath("/me");
  revalidatePath("/", "layout"); // avatar aparece na sidebar global
}

export async function clearCustomAvatar(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_custom_url: null })
    .eq("id", user.id);

  if (error) {
    console.error("[clearCustomAvatar] error:", error);
    throw new Error("Não foi possível resetar o avatar");
  }

  revalidatePath("/me");
  revalidatePath("/", "layout");
}
