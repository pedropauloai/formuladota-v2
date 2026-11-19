// As tarefas das rotas de cron: cada uma isolada, com o resultado na resposta e o estado no banco.
// A rota responde 500 quando alguma falha (o pg_net guarda o código em net._http_response), e o
// canal privado do Discord recebe um aviso quando a falha passa de 15 minutos.

import "server-only";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendOpsAlert } from "./alert";
import { decideTaskStatus, type TaskState } from "./task-status";

export interface TaskOutcome {
  task: string;
  state: TaskState;
  result?: unknown;
  error?: string;
}

interface TaskOptions<T> {
  /** Resultado que não diz nada sobre a saúde da tarefa (ex.: esperando a hora de tentar). */
  isNeutral?: (value: T) => boolean;
  /** Mensagem de falha para um resultado que não lançou exceção, ou null quando está tudo bem. */
  failureOf?: (value: T) => string | null;
}

/** Roda uma tarefa sem deixar a exceção dela derrubar as outras. */
export async function runTask<T>(task: string, fn: () => Promise<T>, options: TaskOptions<T> = {}): Promise<TaskOutcome> {
  try {
    const value = await fn();
    const failure = options.failureOf?.(value) ?? null;
    if (failure) {
      console.error(`[cron] ${task}:`, failure);
      return { task, state: "falha", result: value, error: failure };
    }
    return { task, state: options.isNeutral?.(value) ? "neutro" : "ok", result: value };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[cron] ${task} falhou:`, error);
    return { task, state: "falha", error };
  }
}

// Nome de cada tarefa no aviso, na língua de quem lê o canal.
const TASK_LABELS: Record<string, string> = {
  partidas: "finalizar as partidas",
  mmr: "MMR das partidas",
  "posts-discord": "posts de partida no Discord",
  "voz-times": "salas de voz dos times",
  "loja-conciliacao": "conciliação da loja com o Mercado Pago",
  "loja-credencial": "credencial da vitrine da loja",
  meta: "meta de heróis (/meta)",
  "novidades-discord": "espelho das novidades no Discord",
  battlepass: "conferência do Battlepass com o Mercado Pago",
};

function alertText(task: string, kind: "falha" | "voltou", error: string | undefined, since: string | null): string {
  const label = TASK_LABELS[task] ?? task;
  if (kind === "voltou") return `Cron do site: a tarefa "${label}" voltou a funcionar.`;
  const desde = since ? new Date(since).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "agora";
  const detalhe = (error ?? "sem detalhe").replace(/`/g, "'").slice(0, 300);
  return `Cron do site: a tarefa "${label}" está falhando desde ${desde}. Erro: \`${detalhe}\``;
}

/** Grava o estado das tarefas e avisa no Discord quando uma passa a falhar ou volta. */
export async function recordOutcomes(outcomes: TaskOutcome[], now = new Date()): Promise<void> {
  const relevant = outcomes.filter((o) => o.state !== "neutro");
  if (relevant.length === 0) return;
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("cron_task_status")
    .select("task, failing_since, alerted")
    .in("task", relevant.map((o) => o.task));
  if (error) throw new Error(`ler cron_task_status falhou: ${error.message}`);
  const byTask = new Map((rows ?? []).map((r) => [r.task, r]));

  for (const outcome of relevant) {
    const decision = decideTaskStatus(outcome.task, byTask.get(outcome.task), outcome.state, outcome.error, now);
    if (!decision.write) continue;
    const write = { ...decision.write, updated_at: now.toISOString() };
    if (decision.alert) {
      const sent = await sendOpsAlert(
        alertText(outcome.task, decision.alert, outcome.error, decision.write.failing_since),
        decision.alert === "falha"
      );
      // Aviso que não saiu fica para a próxima rodada.
      if (decision.alert === "falha") write.alerted = sent;
    }
    const { error: upsertError } = await supabase.from("cron_task_status").upsert(write, { onConflict: "task" });
    if (upsertError) throw new Error(`gravar cron_task_status falhou: ${upsertError.message}`);
  }
}

/** Resposta da rota: 500 quando alguma tarefa falhou, com o resultado de cada uma. */
export function cronResponse(outcomes: TaskOutcome[]): NextResponse {
  const failed = outcomes.filter((o) => o.state === "falha").map((o) => o.task);
  const tasks = Object.fromEntries(
    outcomes.map((o) => [o.task, o.state === "falha" ? { erro: o.error, resultado: o.result } : o.result])
  );
  return NextResponse.json({ ok: failed.length === 0, failed, tasks }, { status: failed.length > 0 ? 500 : 200 });
}

/** Fecha a rodada: grava o estado (sem deixar essa gravação esconder o resultado) e responde. */
export async function finishCronRun(outcomes: TaskOutcome[]): Promise<NextResponse> {
  try {
    await recordOutcomes(outcomes);
  } catch (err) {
    console.error("[cron] estado das tarefas:", err instanceof Error ? err.message : err);
  }
  return cronResponse(outcomes);
}
