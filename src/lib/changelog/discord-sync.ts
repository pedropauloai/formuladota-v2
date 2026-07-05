// Espelho /novidades → Discord (canal 🆕 atualizações). Chamado pelo cron
// (finalize-matches, 1x/min) dentro de try/catch — nunca deve quebrar o cron.
//
// Posta cada entrada PUBLICADA ainda não espelhada (discord_posted_at NULL) via
// webhook e carimba discord_posted_at. As 16 retroativas já entraram carimbadas
// (migration 145), então só entradas NOVAS aparecem no Discord. Sem a env
// CHANGELOG_DISCORD_WEBHOOK_URL, é no-op (só o site).

import type { SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/env";

type PendingRow = {
  id: string;
  published_at: string;
  title: string;
  category: string;
  body_md: string;
};

// Cor + rótulo do embed por categoria (espelha os selos do site).
type Style = { color: number; label: string };
const DEFAULT_STYLE: Style = { color: 0x3b82f6, label: "🆕 Novidade" };
const CATEGORY_STYLE: Record<string, Style> = {
  novidade: DEFAULT_STYLE,
  melhoria: { color: 0x22c55e, label: "⚙️ Melhoria" },
  correcao: { color: 0xeab308, label: "🔧 Correção" },
  balanceamento: { color: 0xc42121, label: "⚖️ Balanceamento" },
};

const MAX_PER_RUN = 5;

// Identidade oficial no Discord (override do webhook por mensagem). URL DIRETA no
// www (o apex faz 307 e o Discord não segue redirect de avatar de forma confiável).
const BRAND_USERNAME = "FORMULADOTA";
const BRAND_AVATAR_URL = "https://www.formuladota.com/brand/formuladota-mark.png";

export async function syncChangelogToDiscord(
  supabase: SupabaseClient,
): Promise<{ posted: number; skipped: number }> {
  const webhookUrl = serverEnv.CHANGELOG_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return { posted: 0, skipped: 0 };

  // Pendentes = publicadas e ainda não espelhadas. Mais antigas primeiro (ordem
  // cronológica no canal). Tabela fora dos tipos gerados → cast cirúrgico.
  const q = supabase.from("changelog_entries" as never) as unknown as {
    select: (c: string) => {
      eq: (c: string, v: boolean) => {
        is: (c: string, v: null) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => PromiseLike<{ data: PendingRow[] | null }>;
          };
        };
      };
    };
  };
  const { data } = await q
    .select("id, published_at, title, category, body_md")
    .eq("published", true)
    .is("discord_posted_at", null)
    .order("published_at", { ascending: true })
    .limit(MAX_PER_RUN);

  const pending = data ?? [];
  if (pending.length === 0) return { posted: 0, skipped: 0 };

  const site = publicEnv.NEXT_PUBLIC_SITE_URL;
  let posted = 0;
  let skipped = 0;

  for (const entry of pending) {
    const style = CATEGORY_STYLE[entry.category] ?? DEFAULT_STYLE;
    const payload = {
      username: BRAND_USERNAME,
      avatar_url: BRAND_AVATAR_URL,
      embeds: [
        {
          author: { name: `FORMULADOTA · ${style.label}` },
          title: entry.title.slice(0, 256),
          // Discord renderiza **negrito** e listas "- " nativamente.
          description: entry.body_md.slice(0, 4000),
          url: `${site}/novidades`,
          color: style.color,
          timestamp: entry.published_at,
          footer: { text: "Veja tudo em formuladota.com/novidades" },
        },
      ],
    };

    // Falha de rede/429 → NÃO carimba (tenta de novo no próximo ciclo).
    let ok = false;
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      ok = res.ok; // Discord devolve 204 no sucesso.
    } catch {
      ok = false;
    }

    if (!ok) {
      skipped++;
      continue;
    }

    const upd = supabase.from("changelog_entries" as never) as unknown as {
      update: (v: Record<string, string>) => {
        eq: (c: string, v: string) => PromiseLike<{ error: unknown }>;
      };
    };
    await upd.update({ discord_posted_at: new Date().toISOString() }).eq("id", entry.id);
    posted++;
  }

  return { posted, skipped };
}
