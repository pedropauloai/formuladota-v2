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
  // IMPORTANTE: castar o OBJETO (não o método) pra PRESERVAR o `this` binding. Extrair
  // `const rpc = supabase.rpc` desanexa o método → `this` undefined → "reading 'rest'"
  // e quebra o /novidades (bug em produção 2026-07-05→06).
  const sb = supabase as unknown as {
    rpc: (fn: string) => PromiseLike<{ error: unknown }>;
  };
  await sb.rpc("mark_changelog_seen");
  // O contador do sino (changelogUnread) é calculado no render server-side do shell.
  // Sem revalidar, a topbar fica com a contagem CONGELADA e o badge "+9" nunca zera
  // (o update no banco não re-renderiza o RSC). Revalida o layout → shell recalcula → 0.
  revalidatePath("/", "layout");
}
