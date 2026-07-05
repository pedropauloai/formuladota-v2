// Cron de FINALIZAÇÃO AUTOMÁTICA de partidas (Pedro 2026-07-02).
//
// Roda a cada 1 min (pg_cron + pg_net → esta rota). Para cada lobby 'in_progress'
// com dota_match_id, pergunta pra OpenDota se a partida terminou; se sim, finaliza
// (registra placar + MMR + fecha o lobby → libera os 10 pra re-filar). Se ainda está
// ao vivo/indexando, a OpenDota não devolve os 10 jogadores → pulamos e tentamos no
// próximo ciclo. Assim ninguém fica preso em partida "pra sempre".
//
// Auth: header Authorization: Bearer <CRON_SECRET> (mesmo segredo no Vercel e no
// job pg_cron, que lê do Supabase Vault). Sem segredo válido → 401.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requireServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchOpenDotaMatch } from "@/lib/dota/opendota";
import { finalizeMatchmakingLobby, finalizePendingMmr } from "@/lib/dota/finalize-match";
import { syncChangelogToDiscord } from "@/lib/changelog/discord-sync";
import { syncMatchResultsToDiscord, syncFormedMatchesToDiscord } from "@/lib/dota/results-discord";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Poucos lobbies por ciclo; margem pra o enrich (OpenDota) de cada um.
export const maxDuration = 60;

// Trava de segurança: no máximo N lobbies por invocação (evita rodada longa demais).
const MAX_PER_RUN = 10;

/** Comparação em tempo constante de segredos (consistente com o resto do código). */
function safeEqualSecret(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  const expected = requireServerEnv("CRON_SECRET");
  const authHeader = req.headers.get("authorization") ?? "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  // Auditoria 2026-07-03: comparação em tempo constante (antes era `!==` direto).
  if (!safeEqualSecret(presented, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Lobbies em andamento que já têm o ID real da Valve (o bot já lançou a partida).
  const { data: lobbies, error } = await supabase
    .from("lobbies")
    .select("id, dota_match_id")
    .eq("status", "in_progress")
    .not("dota_match_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<Record<string, unknown>> = [];
  // Partidas buscadas neste ciclo (dota_match_id → od) — o MESMO objeto serve
  // pro precheck, pra finalização e pra fase de MMR. Antes cada fase re-buscava
  // a mesma partida (até 3x por match/min), encostando no free tier (60 req/min).
  const fetchedThisRun = new Map<string, Awaited<ReturnType<typeof fetchOpenDotaMatch>>>();
  for (const lobby of lobbies ?? []) {
    const dotaMatchId = String(lobby.dota_match_id);
    // Pré-checa se a partida JÁ terminou na OpenDota (10 jogadores presentes).
    // fetchOpenDotaMatch lança se 404 (indexando) ou != 10 players (ao vivo) →
    // tratamos como "ainda não" e seguimos (sem criar linha de match prematura).
    let od;
    try {
      od = await fetchOpenDotaMatch(dotaMatchId);
      fetchedThisRun.set(dotaMatchId, od);
    } catch {
      results.push({ dotaMatchId, status: "aguardando" });
      continue;
    }
    // Terminou → finaliza (idempotente), reaproveitando o od do precheck.
    try {
      const res = await finalizeMatchmakingLobby(supabase, lobby.id, od);
      results.push({ dotaMatchId, status: res.success ? "finalizada" : "erro", detail: res.error ?? res.alreadyDone });
    } catch (e) {
      results.push({ dotaMatchId, status: "erro", detail: e instanceof Error ? e.message : "?" });
    }
  }

  // Fase B: aplica o MMR das partidas já finalizadas cujo replay JÁ foi parseado
  // (ou por fallback). Separado da finalização pra não atrasar a liberação dos
  // jogadores — o MMR usa o desempenho completo (presença em teamfight etc.).
  // Partidas recém-finalizadas NESTE ciclo reusam o od já buscado (zero re-fetch).
  let mmr: Awaited<ReturnType<typeof finalizePendingMmr>> | null = null;
  try {
    mmr = await finalizePendingMmr(supabase, { prefetched: fetchedThisRun });
  } catch (e) {
    mmr = { applied: 0, waitingParse: 0, results: [{ error: e instanceof Error ? e.message : "?" }] };
  }

  // Espelho /novidades → Discord (canal 🆕 atualizações). Isolado: qualquer
  // falha aqui NÃO afeta a finalização de partidas. No-op sem a env do webhook.
  let changelog: Awaited<ReturnType<typeof syncChangelogToDiscord>> | null = null;
  try {
    changelog = await syncChangelogToDiscord(supabase);
  } catch (e) {
    changelog = { posted: 0, skipped: 0 };
    console.error("[cron] sync changelog→discord falhou:", e instanceof Error ? e.message : e);
  }

  // Posts de partida no Discord: 📊 resultados (placar) + 🔎 fila (partida formada).
  // Isolados — falha aqui NÃO afeta a finalização. No-op sem as envs dos webhooks.
  let matchPosts: { results: number; formed: number } = { results: 0, formed: 0 };
  try {
    const [r, f] = await Promise.all([
      syncMatchResultsToDiscord(supabase),
      syncFormedMatchesToDiscord(supabase),
    ]);
    matchPosts = { results: r.posted, formed: f.posted };
  } catch (e) {
    console.error("[cron] posts de partida→discord falharam:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({
    ok: true,
    checked: (lobbies ?? []).length,
    finalized: results.filter((r) => r.status === "finalizada").length,
    results,
    mmr,
    changelog,
    matchPosts,
  });
}
