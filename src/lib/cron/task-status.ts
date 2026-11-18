// Decide, para cada tarefa do cron, o que gravar em cron_task_status e se avisa no Discord:
// um aviso quando a falha passa de 15 minutos e outro quando a tarefa volta. Lógica pura.

export const ALERT_AFTER_MS = 15 * 60 * 1000;

/** "neutro": a rodada não diz nada sobre a saúde da tarefa (ex.: esperando a hora de tentar). */
export type TaskState = "ok" | "falha" | "neutro";

export interface TaskStatusRow {
  task: string;
  failing_since: string | null;
  alerted: boolean;
}

export interface TaskStatusWrite {
  task: string;
  failing_since: string | null;
  last_error: string | null;
  alerted: boolean;
}

export interface StatusDecision {
  /** Linha a gravar; null quando nada mudou (tarefa saudável seguindo saudável). */
  write: TaskStatusWrite | null;
  alert: "falha" | "voltou" | null;
}

export function decideTaskStatus(
  task: string,
  row: TaskStatusRow | undefined,
  state: TaskState,
  error: string | undefined,
  now: Date
): StatusDecision {
  if (state === "neutro") return { write: null, alert: null };
  if (state === "ok") {
    if (!row?.failing_since) return { write: null, alert: null };
    return {
      write: { task, failing_since: null, last_error: null, alerted: false },
      alert: row.alerted ? "voltou" : null,
    };
  }
  const since = row?.failing_since ?? now.toISOString();
  const alreadyAlerted = Boolean(row?.alerted);
  const due = !alreadyAlerted && now.getTime() - new Date(since).getTime() >= ALERT_AFTER_MS;
  return {
    write: { task, failing_since: since, last_error: error?.slice(0, 500) ?? null, alerted: alreadyAlerted },
    alert: due ? "falha" : null,
  };
}
