// Posts automáticos no Discord: 📊 resultados (placar final via card og:image) e
// 🔎 fila (partida formada, lineup nativo). Chamados pelo cron (finalize-matches),
// isolados em try/catch. No-op sem as envs dos webhooks. Controle de duplicidade
// via lobbies.result_discord_posted_at / formed_discord_posted_at (migration 146).

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { getMatchCardData } from "@/lib/dota/match-card";
import { mmrToDotaRank } from "@/lib/dota/rank-badges";
import type { DotaRank } from "@/components/ui/dota-rank-medal";

const BRAND_USERNAME = "FORMULADOTA";
const BRAND_AVATAR_URL = "https://www.formuladota.com/brand/formuladota-mark.png";
const BASE = "https://www.formuladota.com";
const MAX_PER_RUN = 4;

const RANK_PT: Record<DotaRank, string> = {
  herald: "Arauto",
  guardian: "Guardião",
  crusader: "Cruzeiro",
  archon: "Arconte",
  legend: "Lenda",
  ancient: "Ancião",
  divine: "Divino",
  immortal: "Imortal",
  "immortal-top-100": "Imortal",
  "immortal-leaderboard": "Imortal",
};

// role (matchmaking) → posição 1-5.
const ROLE_TO_POS: Record<string, number> = {
  safelane: 1,
  midlane: 2,
  offlane: 3,
  support: 4,
  support_dedicated: 5,
};

async function postWebhook(url: string, payload: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================ 📊 RESULTADOS ============================

export async function syncMatchResultsToDiscord(
  supabase: SupabaseClient,
): Promise<{ posted: number }> {
  const webhook = serverEnv.RESULTS_DISCORD_WEBHOOK_URL;
  if (!webhook) return { posted: 0 };

  const { data } = await supabase
    .from("lobbies")
    .select("id, dota_match_id")
    .eq("status", "completed")
    .not("dota_match_id", "is", null)
    .is("result_discord_posted_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);

  const pending = (data ?? []) as { id: string; dota_match_id: string }[];
  let posted = 0;
  for (const lobby of pending) {
    const dotaMatchId = String(lobby.dota_match_id);
    const card = await getMatchCardData(dotaMatchId).catch(() => null);
    const winnerText =
      card?.radiantWin == null
        ? ""
        : card.radiantWin
          ? "🟢 **Iluminados** venceram"
          : "🔴 **Temidos** venceram";
    const scoreLine = card
      ? `Iluminados **${card.radiantScore}** — **${card.direScore}** Temidos`
      : "";

    const ok = await postWebhook(webhook, {
      username: BRAND_USERNAME,
      avatar_url: BRAND_AVATAR_URL,
      embeds: [
        {
          author: { name: "FORMULADOTA · Resultado" },
          title: `Partida ${dotaMatchId}`,
          url: `${BASE}/partida/historico/${dotaMatchId}`,
          description: [scoreLine, winnerText].filter(Boolean).join("\n"),
          color: card?.radiantWin === false ? 0xc42121 : 0x00c466,
          image: { url: `${BASE}/partida/historico/${dotaMatchId}/opengraph-image` },
          footer: { text: "Ver placar completo em formuladota.com" },
        },
      ],
    });

    if (!ok) continue;
    await supabase
      .from("lobbies")
      .update({ result_discord_posted_at: new Date().toISOString() } as never)
      .eq("id", lobby.id);
    posted++;
  }
  return { posted };
}

// ============================ 🔎 FILA (partida formada) ============================

type LineupRow = { user_id: string | null; team: string; role: string | null };

export async function syncFormedMatchesToDiscord(
  supabase: SupabaseClient,
): Promise<{ posted: number }> {
  const webhook = serverEnv.QUEUE_DISCORD_WEBHOOK_URL;
  if (!webhook) return { posted: 0 };

  // Partida "formada" = já tem lobby no Dota (dota_match_id) e está em andamento.
  const { data } = await supabase
    .from("lobbies")
    .select("id, dota_match_id")
    .eq("status", "in_progress")
    .not("dota_match_id", "is", null)
    .is("formed_discord_posted_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);

  const pending = (data ?? []) as { id: string; dota_match_id: string }[];
  let posted = 0;
  for (const lobby of pending) {
    const { data: lp } = await supabase
      .from("lobby_players")
      .select("user_id, team, role")
      .eq("lobby_id", lobby.id);
    const rows = (lp ?? []) as LineupRow[];
    if (rows.length === 0) continue;

    // Identidade + MMR da season pra medalha.
    const uids = rows.map((r) => r.user_id).filter((v): v is string => Boolean(v));
    const nameById = new Map<string, string>();
    const mmrById = new Map<string, number>();
    if (uids.length) {
      const { data: season } = await supabase.from("seasons").select("id").eq("active", true).maybeSingle();
      const [{ data: idents }, { data: mmrs }] = await Promise.all([
        supabase.from("public_player_identities").select("id, username").in("id", uids),
        (season as { id?: string } | null)?.id
          ? supabase.from("player_season_mmr").select("user_id, mmr").eq("season_id", (season as { id: string }).id).in("user_id", uids)
          : Promise.resolve({ data: [] as { user_id: string; mmr: number }[] }),
      ]);
      for (const i of idents ?? []) if (i.id && i.username) nameById.set(i.id, i.username);
      for (const m of mmrs ?? []) mmrById.set(m.user_id, m.mmr);
    }

    const fmt = (team: string) =>
      rows
        .filter((r) => r.team === team)
        .map((r) => {
          const pos = r.role ? ROLE_TO_POS[r.role] ?? 0 : 0;
          const mmr = r.user_id ? mmrById.get(r.user_id) ?? null : null;
          const name = (r.user_id && nameById.get(r.user_id)) || "Jogador";
          const rankPt = RANK_PT[mmrToDotaRank(mmr)];
          return { pos, line: `\`Pos ${pos || "?"}\` **${name}** · ${rankPt}` };
        })
        .sort((a, b) => a.pos - b.pos)
        .map((x) => x.line)
        .join("\n") || "—";

    const ok = await postWebhook(webhook, {
      username: BRAND_USERNAME,
      avatar_url: BRAND_AVATAR_URL,
      embeds: [
        {
          author: { name: "FORMULADOTA · Fila" },
          title: "⚔️ Partida formada",
          url: `${BASE}/partida/${lobby.dota_match_id}`,
          description: `Acompanhe ao vivo em [formuladota.com](${BASE}/partida/${lobby.dota_match_id})`,
          color: 0xe6b800,
          fields: [
            { name: "🟢 Iluminados", value: fmt("radiant"), inline: true },
            { name: "🔴 Temidos", value: fmt("dire"), inline: true },
          ],
          footer: { text: "FORMULADOTA" },
        },
      ],
    });

    if (!ok) continue;
    await supabase
      .from("lobbies")
      .update({ formed_discord_posted_at: new Date().toISOString() } as never)
      .eq("id", lobby.id);
    posted++;
  }
  return { posted };
}
