"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSteamRedirectUrl } from "@/lib/steam";

// Server Action invocada via <form action={signInWithSteam}>.
// 1. Confere user logado (Discord auth via Supabase).
// 2. Gera CSRF state (UUID v4) e persiste em cookie httpOnly.
//    Cookie expira em 5min — janela do flow OpenID; Secure em prod, SameSite=Lax
//    pra não quebrar o redirect-back da Steam.
// 3. Constrói URL Steam OpenID 2.0 com state em return_to (lib steam.ts).
// 4. Redirect — Next.js converte em 303 See Other automaticamente.
//
// Steam vai redirecionar de volta pra /auth/steam/callback?state=<csrf>... após
// user autorizar. O callback lê o cookie, compara via timingSafeEqual e
// só então persiste — sem cookie ou state divergente, redirect ?error=csrf.
export async function signInWithSteam(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=login_required_for_steam");
  }

  // CSRF state — UUID v4 cripto-seguro (per CONTEXT.md decisão Return URL)
  const state = randomUUID();
  const jar = await cookies();
  jar.set("steam_csrf_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutos — janela do flow OpenID
    path: "/",
  });

  const steamUrl = getSteamRedirectUrl(state);
  redirect(steamUrl);
}
