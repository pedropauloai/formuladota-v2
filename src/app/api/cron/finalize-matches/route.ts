// Cron de FINALIZAÇÃO AUTOMÁTICA de partidas (Pedro 2026-07-02).
//
// Roda a cada 1 min (pg_cron + pg_net → esta rota). Para cada lobby 'in_progress'
// com dota_match_id, pergunta pra OpenDota se a partida terminou; se sim, finaliza
// (registra placar + MMR + fecha o lobby → libera os 10 pra re-filar). Se ainda está
// ao vivo/indexando, a OpenDota não devolve os 10 jogadores → pulamos e tentamos no
// próximo ciclo. Assim ninguém fica preso em partida "pra sempre".
//
// Só tarefas de partida moram aqui. Loja, meta e novidades ficam no cron do site
// (/api/cron/site), para que pausar este job não pause a loja.
//
// Auth: header Authorization: Bearer <CRON_SECRET> (o job pg_cron lê do Supabase Vault).
// Alguma tarefa falhou → 500, e o aviso no Discord sai pelo estado em cron_task_status.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchOpenDotaMatch, isOpenDotaPending } from "@/lib/dota/opendota";
import { finalizeMatchmakingLobby, finalizePendingMmr } from "@/lib/dota/finalize-match";
import { syncMatchResultsToDiscord, syncFormedMatchesToDiscord } from "@/lib/dota/results-discord";
import { ensureTeamVoiceRooms, teardownTeamVoiceRooms } from "@/lib/dota/team-voice";
import { isCronAuthorized } from "@/lib/cron/auth";
import { finishCronRun, runTask } from "@/lib/cron/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Trava de segurança: no máximo N lobbies por invocação (evita rodada longa demais).
const MAX_PER_RUN = 10;

type FetchedMatches = Map<string, Awaited<ReturnType<typeof fetchOpenDotaMatch>>>;
type ServiceClient = ReturnType<typeof createServiceClient>;

interface LobbyRun {
  checked: number;
  finalized: number;
  results: Array<Record<string, unknown>>;
  /** Falhas de verdade (OpenDota bloqueada, fora do ar, erro ao gravar); "ainda não" não conta. */
  failures: string[];
}

async function finalizeInProgressLobbies(
  supabase: ServiceClient,
  fetchedThisRun: FetchedMatches
): Promise<LobbyRun> {
  // Lobbies em andamento que já têm o ID real da Valve (o bot já lançou a partida).
  const { data: lobbies, error } = await supabase
    .from("lobbies")
    .select("id, dota_match_id")
    .eq("status", "in_progress")
    .not("dota_match_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) throw new Error(`listar lobbies em andamento falhou: ${error.message}`);

  const run: LobbyRun = { checked: lobbies?.length ?? 0, finalized: 0, results: [], failures: [] };
  for (const lobby of lobbies ?? []) {
    const dotaMatchId = String(lobby.dota_match_id);
    // Pré-checa se a partida JÁ terminou na OpenDota (10 jogadores presentes).
    let od;
    try {
      od = await fetchOpenDotaMatch(dotaMatchId);
      fetchedThisRun.set(dotaMatchId, od);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      // 404 (indexando) ou sem os 10 jogadores (ao vivo): só "ainda não". 429 e 5xx são falha.
      if (isOpenDotaPending(e)) {
        run.results.push({ dotaMatchId, status: "aguardando" });
      } else {
        run.results.push({ dotaMatchId, status: "falha", detail });
        run.failures.push(`${dotaMatchId}: ${detail}`);
      }
      continue;
    }
    // Terminou → finaliza (idempotente), reaproveitando o od do precheck.
    try {
      const res = await finalizeMatchmakingLobby(supabase, lobby.id, od);
      if (res.success) run.finalized += 1;
      else run.failures.push(`${dotaMatchId}: ${res.error ?? "erro ao finalizar"}`);
      run.results.push({ dotaMatchId, status: res.success ? "finalizada" : "erro", detail: res.error ?? res.alreadyDone });
    } catch (e) {
      const detail = e instanceof Error ? e.message : "?";
      run.failures.push(`${dotaMatchId}: ${detail}`);
      run.results.push({ dotaMatchId, status: "erro", detail });
    }
  }
  return run;
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();

  // Partidas buscadas neste ciclo (dota_match_id → od): o MESMO objeto serve pro precheck,
  // pra finalização e pra fase de MMR, sem buscar a mesma partida duas vezes.
  const fetchedThisRun: FetchedMatches = new Map();
  const partidas = await runTask("partidas", () => finalizeInProgressLobbies(supabase, fetchedThisRun), {
    failureOf: (run) => (run.failures.length > 0 ? run.failures.join("; ") : null),
  });

  // Fase B: aplica o MMR das partidas finalizadas cujo replay já foi parseado (ou por fallback).
  // Separado da finalização pra não atrasar a liberação dos jogadores.
  const mmr = await runTask("mmr", () => finalizePendingMmr(supabase, { prefetched: fetchedThisRun }));

  // Posts de partida no Discord (resultados e partida formada) e salas de voz por time.
  const [posts, voz] = await Promise.all([
    runTask("posts-discord", async () => {
      const [r, f] = await Promise.all([syncMatchResultsToDiscord(supabase), syncFormedMatchesToDiscord(supabase)]);
      return { results: r.posted, formed: f.posted };
    }),
    runTask("voz-times", async () => {
      const [c, d] = await Promise.all([ensureTeamVoiceRooms(supabase), teardownTeamVoiceRooms(supabase)]);
      return { created: c.created, removed: d.removed };
    }),
  ]);

  return finishCronRun([partidas, mmr, posts, voz]);
}
