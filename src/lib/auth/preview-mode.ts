"use server";

// Preview mode — admin pode ativar "Ver como usuário comum" pra testar a
// experiência sem precisar de segunda conta. Cookie HttpOnly 1h.
//
// effectiveIsAdmin = realIsAdmin AND NOT previewActive
//
// togglePreviewMode é a única forma de alternar. Server action protegida:
// só admins reais conseguem setar o cookie (verifica via DB).

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const COOKIE_NAME = "preview_mode";
const COOKIE_MAX_AGE_SEC = 60 * 60; // 1h

export async function getPreviewModeActive(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === "common";
}

export async function togglePreviewMode(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return;

  const cookieStore = await cookies();
  const current = cookieStore.get(COOKIE_NAME)?.value;

  if (current === "common") {
    cookieStore.delete(COOKIE_NAME);
  } else {
    cookieStore.set(COOKIE_NAME, "common", {
      maxAge: COOKIE_MAX_AGE_SEC,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  revalidatePath("/", "layout");
}
