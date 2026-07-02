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
import { requireServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchOpenDotaMatch } from "@/lib/dota/opendota";
import { finalizeMatchmakingLobby } from "@/lib/dota/finalize-match";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Poucos lobbies por ciclo; margem pra o enrich (OpenDota) de cada um.
export const maxDuration = 60;

// Trava de segurança: no máximo N lobbies por invocação (evita rodada longa demais).
const MAX_PER_RUN = 10;

export async function POST(req: Request) {
  const expected = requireServerEnv("CRON_SECRET");
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
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
  for (const lobby of lobbies ?? []) {
    const dotaMatchId = String(lobby.dota_match_id);
    // Pré-checa se a partida JÁ terminou na OpenDota (10 jogadores presentes).
    // fetchOpenDotaMatch lança se 404 (indexando) ou != 10 players (ao vivo) →
    // tratamos como "ainda não" e seguimos (sem criar linha de match prematura).
    try {
      await fetchOpenDotaMatch(dotaMatchId);
    } catch {
      results.push({ dotaMatchId, status: "aguardando" });
      continue;
    }
    // Terminou → finaliza (idempotente).
    try {
      const res = await finalizeMatchmakingLobby(supabase, lobby.id);
      results.push({ dotaMatchId, status: res.success ? "finalizada" : "erro", detail: res.error ?? res.alreadyDone });
    } catch (e) {
      results.push({ dotaMatchId, status: "erro", detail: e instanceof Error ? e.message : "?" });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: (lobbies ?? []).length,
    finalized: results.filter((r) => r.status === "finalizada").length,
    results,
  });
}
