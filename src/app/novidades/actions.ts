"use server";

import { createClient } from "@/lib/supabase/server";

/** Zera o badge de novidades do usuário (chamado ao abrir /novidades). */
export async function markChangelogSeen(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // RPC SECURITY DEFINER (migration 143) — atualiza profiles.changelog_seen_at
  // da própria linha (id = auth.uid()), driblando a RLS por coluna de profiles.
  const rpc = supabase.rpc as unknown as (fn: string) => PromiseLike<{ error: unknown }>;
  await rpc("mark_changelog_seen");
}
