// Espelho /novidades → Discord (canal 🆕 atualizações). Chamado pelo cron
// (finalize-matches, 1x/min) dentro de try/catch — nunca deve quebrar o cron.
//
// Três operações, todas via WEBHOOK (o webhook pode editar/apagar as mensagens que ele
// mesmo postou, sem precisar do bot):
//   1) POST    — entrada publicada ainda não espelhada (discord_posted_at NULL). Usa
//                ?wait=true pra receber o message_id e gravá-lo (discord_message_id).
//   2) EDIT    — entrada já postada e EDITADA depois (updated_at > discord_posted_at) →
//                PATCH da mensagem no Discord.
//   3) DELETE  — entrada RETIRADA do ar (published=false) que ainda tem mensagem no
//                Discord → apaga a mensagem e limpa o discord_message_id.
// Sem a env CHANGELOG_DISCORD_WEBHOOK_URL, é no-op (só o site).

import type { SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/env";

type Row = {
  id: string;
  published_at: string;
  title: string;
  category: string;
  body_md: string;
  discord_message_id: string | null;
  updated_at?: string | null;
  discord_posted_at?: string | null;
};

// Uma edição REAL do Pedro acontece minutos depois do post; o bump automático do trigger
// (quando o próprio sync grava discord_posted_at) é na mesma hora. Tolerância evita loop.
const EDIT_TOLERANCE_MS = 5000;

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
const BRAND_AVATAR_URL = "https://www.formuladota.com.br/brand/formuladota-mark.png";

/** Corpo do embed (comum a POST e EDIT). No PATCH o Discord ignora username/avatar. */
function buildEmbeds(entry: Row, site: string | undefined) {
  const style = CATEGORY_STYLE[entry.category] ?? DEFAULT_STYLE;
  return [
    {
      author: { name: `FORMULADOTA · ${style.label}` },
      title: entry.title.slice(0, 256),
      description: entry.body_md.slice(0, 4000),
      url: `${site}/novidades`,
      color: style.color,
      timestamp: entry.published_at,
      footer: { text: "Veja tudo em formuladota.com.br/novidades" },
    },
  ];
}

// Acesso destipado a changelog_entries (tabela fora dos tipos gerados) — casts cirúrgicos.
type Updater = {
  update: (v: Record<string, string | null>) => {
    eq: (c: string, v: string) => PromiseLike<{ error: unknown }>;
  };
};
type Terminal<T> = {
  order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => PromiseLike<{ data: T[] | null }> };
  limit: (n: number) => PromiseLike<{ data: T[] | null }>;
};
type Selector<T> = {
  select: (c: string) => {
    eq: (c: string, v: boolean) => Terminal<T> & {
      is: (c: string, v: null) => Terminal<T>;
      not: (c: string, op: string, v: null) => Terminal<T>;
    };
  };
};

export async function syncChangelogToDiscord(
  supabase: SupabaseClient
): Promise<{ posted: number; edited: number; deleted: number; skipped: number }> {
  const webhookUrl = serverEnv.CHANGELOG_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return { posted: 0, edited: 0, deleted: 0, skipped: 0 };
  const site = publicEnv.NEXT_PUBLIC_SITE_URL;

  const table = () => supabase.from("changelog_entries" as never);
  const upd = () => table() as unknown as Updater;

  let posted = 0;
  let edited = 0;
  let deleted = 0;
  let skipped = 0;

  // ── 1) POST — publicadas ainda não espelhadas (mais antigas primeiro). ──────────
  const { data: pending } = await (table() as unknown as Selector<Row>)
    .select("id, published_at, title, category, body_md, discord_message_id")
    .eq("published", true)
    .is("discord_posted_at", null)
    .order("published_at", { ascending: true })
    .limit(MAX_PER_RUN);

  for (const entry of pending ?? []) {
    let messageId: string | null = null;
    try {
      // ?wait=true → o Discord devolve o objeto da mensagem (com id).
      const res = await fetch(`${webhookUrl}?wait=true`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: BRAND_USERNAME,
          avatar_url: BRAND_AVATAR_URL,
          embeds: buildEmbeds(entry, site),
        }),
      });
      if (res.ok) {
        const msg = (await res.json()) as { id?: string };
        messageId = msg.id ?? null;
      }
    } catch {
      messageId = null;
    }
    if (!messageId) {
      skipped++;
      continue; // falha de rede/429 → não carimba, tenta de novo no próximo ciclo.
    }
    await upd()
      .update({ discord_posted_at: new Date().toISOString(), discord_message_id: messageId })
      .eq("id", entry.id);
    posted++;
  }

  // ── 2) EDIT — já postadas e editadas depois. O PostgREST não compara coluna-a-coluna,
  //       então busca as candidatas e filtra em JS (updated_at > discord_posted_at). ────
  const { data: maybeEdited } = await (table() as unknown as Selector<Row>)
    .select("id, published_at, title, category, body_md, discord_message_id, updated_at, discord_posted_at")
    .eq("published", true)
    .not("discord_message_id", "is", null)
    .limit(50);
  const editable = (maybeEdited ?? []).filter(
    (e) =>
      e.discord_posted_at &&
      e.updated_at &&
      new Date(e.updated_at).getTime() > new Date(e.discord_posted_at).getTime() + EDIT_TOLERANCE_MS
  );

  for (const entry of editable) {
    if (!entry.discord_message_id) continue;
    let ok = false;
    try {
      const res = await fetch(`${webhookUrl}/messages/${entry.discord_message_id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ embeds: buildEmbeds(entry, site) }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      skipped++;
      continue;
    }
    // Re-carimba pra updated_at não ficar > discord_posted_at (senão re-edita sempre).
    await upd().update({ discord_posted_at: new Date().toISOString() }).eq("id", entry.id);
    edited++;
  }

  // ── 3) DELETE — retiradas do ar (published=false) com mensagem ainda no Discord. ─
  const { data: retracted } = await (table() as unknown as Selector<Row>)
    .select("id, published_at, title, category, body_md, discord_message_id")
    .eq("published", false)
    .not("discord_message_id", "is", null)
    .order("published_at", { ascending: true })
    .limit(MAX_PER_RUN);

  for (const entry of retracted ?? []) {
    if (!entry.discord_message_id) continue;
    let ok = false;
    try {
      const res = await fetch(`${webhookUrl}/messages/${entry.discord_message_id}`, {
        method: "DELETE",
      });
      ok = res.ok || res.status === 404; // 404 = já apagada → segue e limpa o id.
    } catch {
      ok = false;
    }
    if (!ok) {
      skipped++;
      continue;
    }
    await upd().update({ discord_message_id: null }).eq("id", entry.id);
    deleted++;
  }

  return { posted, edited, deleted, skipped };
}
