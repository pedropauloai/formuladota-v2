// Leitura do changelog (novidades). A RLS entrega só os publicados pro público;
// admin vê tudo. Tabela nova (migration 143) fora dos tipos gerados → cast cirúrgico.

import { createClient } from "@/lib/supabase/server";

export type ChangelogCategory = "novidade" | "melhoria" | "correcao" | "balanceamento";

export interface ChangelogEntry {
  id: string;
  publishedAt: string;
  title: string;
  category: ChangelogCategory;
  bodyMd: string;
}

type RawRow = {
  id: string;
  published_at: string;
  title: string;
  category: string;
  body_md: string;
};

const CATS: ChangelogCategory[] = ["novidade", "melhoria", "correcao", "balanceamento"];

function mapRow(r: RawRow): ChangelogEntry {
  return {
    id: r.id,
    publishedAt: r.published_at,
    title: r.title,
    category: (CATS.includes(r.category as ChangelogCategory) ? r.category : "novidade") as ChangelogCategory,
    bodyMd: r.body_md ?? "",
  };
}

/** Todas as entradas PUBLICADAS (mais recentes primeiro). */
export async function getPublishedChangelog(): Promise<ChangelogEntry[]> {
  const supabase = await createClient();
  const q = supabase.from("changelog_entries" as never) as unknown as {
    select: (c: string) => {
      eq: (c: string, v: boolean) => {
        order: (c: string, o: { ascending: boolean }) => PromiseLike<{ data: RawRow[] | null }>;
      };
    };
  };
  const { data } = await q
    .select("id, published_at, title, category, body_md")
    .eq("published", true)
    .order("published_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

/** Nº de novidades publicadas DEPOIS da última visita do usuário (pro badge). */
export async function getUnreadChangelogCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: prof } = await supabase
    .from("profiles")
    .select("changelog_seen_at")
    .eq("id", user.id)
    .maybeSingle();
  const seen = (prof as { changelog_seen_at?: string | null } | null)?.changelog_seen_at ?? null;

  // Poucas entradas — busca os published_at e conta em JS (evita count com o cast).
  const q = supabase.from("changelog_entries" as never) as unknown as {
    select: (c: string) => {
      eq: (c: string, v: boolean) => PromiseLike<{ data: { published_at: string }[] | null }>;
    };
  };
  const { data } = await q.select("published_at").eq("published", true);
  const rows = data ?? [];
  if (!seen) return rows.length;
  const seenMs = new Date(seen).getTime();
  return rows.filter((r) => new Date(r.published_at).getTime() > seenMs).length;
}
