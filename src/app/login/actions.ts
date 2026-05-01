"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export async function signInWithDiscord() {
  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? publicEnv.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: "identify email",
    },
  });

  if (error) {
    console.error("[auth] erro Discord OAuth:", error.message);
    redirect("/login?error=oauth");
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
