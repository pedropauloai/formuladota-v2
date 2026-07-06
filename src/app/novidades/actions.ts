"use server";

import { revalidatePath } from "next/cache";
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
  // O contador do sino (changelogUnread) é calculado no render server-side do shell.
  // Sem revalidar, a topbar fica com a contagem CONGELADA e o badge "+9" nunca zera
  // (o update no banco não re-renderiza o RSC). Revalida o layout → shell recalcula → 0.
  revalidatePath("/", "layout");
}
