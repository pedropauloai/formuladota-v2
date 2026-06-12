"use client";

// AdminCoachDetail — DETALHE do coach selecionado no /admin/pros:
//   1. Identidade + forçar abrir/fechar a fila dele + números do dia
//   2. PT em curso com ações de emergência (AdminActivePTPanel)
//   3. Coach Notes pós-confirmação (CoachNotesPanel reaproveitado)
//   4. Fila dele (admin remove de qualquer fila)
//   5. Histórico recente com re-enrich (AdminHistoryList)
// Só o corpo rola — header fixo, página sem rolagem.

import { useState, useTransition } from "react";
import { Loader2, PowerOff, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm, usePrompt } from "@/components/ui/confirm";
import { CoachNotesPanel } from "./coach-notes-panel";
import { AdminActivePTPanel } from "./admin-active-pt-panel";
import { AdminHistoryList } from "./admin-history-list";
import { adminRemoveFromQueue, adminToggleCoachFila } from "./admin-actions";
import type {
  AdminCoachSummary,
  AdminHistoryMatch,
  AdminPendingPT,
  AdminQueueEntry,
} from "./admin-pros-types";
import { formatAge, formatBRL } from "./format";

interface Props {
  coach: AdminCoachSummary;
  queue: AdminQueueEntry[];
  pending: AdminPendingPT[];
  history: AdminHistoryMatch[];
  nowMs: number;
  onChanged: () => void;
}

export function AdminCoachDetail({
  coach,
  queue,
  pending,
  history,
  nowMs,
  onChanged,
}: Props) {
  // PT confirmada nesta sessão — mantém CoachNotesPanel visível após refetch
  const [notesFor, setNotesFor] = useState<AdminPendingPT | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DetailHeader coach={coach} nowMs={nowMs} onChanged={onChanged} />

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 xl:px-6">
        {pending.map((pt) => (
          <AdminActivePTPanel
            key={pt.matchId}
            pt={pt}
            nowMs={nowMs}
            onChanged={onChanged}
            onConfirmed={setNotesFor}
          />
        ))}

        {notesFor && (
          <section className="space-y-2">
            <CoachNotesPanel
              matchId={notesFor.matchId}
              entries={notesFor.students.map((s) => ({
                userId: s.userId,
                username: s.username ?? "(sem nome)",
              }))}
            />
            <button
              type="button"
              onClick={() => setNotesFor(null)}
              className="font-mono text-sm text-text-faded underline-offset-4 hover:text-text-display hover:underline"
            >
              concluir notas
            </button>
          </section>
        )}

        <QueueSection coach={coach} queue={queue} nowMs={nowMs} onChanged={onChanged} />

        <section className="space-y-2">
          <h3 className="font-display-condensed text-lg uppercase leading-none tracking-wider text-text-display">
            Histórico recente
          </h3>
          <AdminHistoryList history={history} onChanged={onChanged} />
        </section>
      </div>
    </div>
  );
}

// ─── Header: identidade + forçar fila + números do dia ──────────────────────

function DetailHeader({
  coach,
  nowMs,
  onChanged,
}: {
  coach: AdminCoachSummary;
  nowMs: number;
  onChanged: () => void;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border-subtle px-4 py-3 xl:px-6">
      <UserAvatar
        size="md"
        src={coach.avatarUrl ?? undefined}
        alt={coach.username ?? coach.slug}
        fallback={(coach.username ?? coach.slug).slice(0, 2)}
        presence={coach.filaAberta ? "online" : "offline"}
      />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display-condensed text-2xl uppercase leading-none tracking-wider text-text-display">
          {coach.username ?? coach.slug}
        </h2>
        <p className="truncate font-mono text-sm text-text-muted">
          {coach.slug}
          {coach.headline ? ` · ${coach.headline}` : ""}
          {coach.filaAberta && coach.filaAbertaEm
            ? ` · fila aberta há ${formatAge(coach.filaAbertaEm, nowMs)}`
            : " · fila fechada"}
        </p>
      </div>

      <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
        Hoje:{" "}
        <span className="tabular-nums text-text-display">{coach.hoje.pts} PTs</span>
        {" · "}
        <span className="tabular-nums text-text-display">
          {coach.hoje.alunos} alunos
        </span>
        {" · "}
        <span className="tabular-nums text-gold">
          R$ {formatBRL(coach.hoje.ganhoBrl)}
        </span>
      </p>

      <ForceFilaButton coach={coach} onChanged={onChanged} />
    </header>
  );
}

function ForceFilaButton({
  coach,
  onChanged,
}: {
  coach: AdminCoachSummary;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleToggle() {
    const closing = coach.filaAberta;
    const ok = await confirm({
      title: closing
        ? `Forçar FECHAMENTO da fila de ${coach.username ?? coach.slug}?`
        : `Forçar ABERTURA da fila de ${coach.username ?? coach.slug}?`,
      message: closing
        ? `Todos os ${coach.waitingCount} aguardando serão removidos da fila (fichas intactas). Ação auditada.`
        : "A fila passa a receber alunos em nome do PRO. Ação auditada.",
      confirmLabel: closing ? "Fechar fila" : "Abrir fila",
      variant: closing ? "destructive" : undefined,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await adminToggleCoachFila(coach.coachId, !coach.filaAberta);
      if (!res.success) setError(res.error);
      else onChanged();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={coach.filaAberta ? "secondary" : "primary"}
        size="sm"
        onClick={handleToggle}
        loading={pending}
      >
        {coach.filaAberta ? (
          <PowerOff size={14} aria-hidden="true" />
        ) : (
          <Radio size={14} aria-hidden="true" />
        )}
        {coach.filaAberta ? "Forçar fechar fila" : "Forçar abrir fila"}
      </Button>
      {error && <p className="font-mono-ui text-sm text-error">{error}</p>}
    </div>
  );
}

// ─── Fila do coach (admin remove de qualquer fila) ──────────────────────────

function QueueSection({
  coach,
  queue,
  nowMs,
  onChanged,
}: {
  coach: AdminCoachSummary;
  queue: AdminQueueEntry[];
  nowMs: number;
  onChanged: () => void;
}) {
  const prompt = usePrompt();
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleRemove(entry: AdminQueueEntry) {
    const reason = await prompt({
      title: `Remover ${entry.username ?? "aluno"} da fila`,
      message: "Motivo da remoção (auditado, mín 3 caracteres). Ficha fica intacta.",
      placeholder: "Ex: aluno pediu suporte, conduta, fila travada",
      required: true,
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("Motivo precisa ter pelo menos 3 caracteres.");
      return;
    }
    setError(null);
    setRemovingId(entry.entryId);
    startTransition(async () => {
      const res = await adminRemoveFromQueue(entry.entryId, reason);
      setRemovingId(null);
      if (!res.success) setError(res.error);
      else onChanged();
    });
  }

  return (
    <section className="space-y-2">
      <h3 className="font-display-condensed text-lg uppercase leading-none tracking-wider text-text-display">
        Fila ({queue.length}
        {coach.filaAberta ? ` · máx ${coach.filaMaxVagas} por PT` : ""})
      </h3>

      {queue.length === 0 ? (
        <p className="rounded-sm border border-dashed border-border-subtle bg-bg-elevated/30 p-4 text-center font-display text-sm font-semibold text-text-muted">
          {coach.filaAberta
            ? "Fila aberta e vazia. Quem quer evoluir ainda não chegou."
            : "Fila fechada — nada aguardando."}
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle/60 rounded-sm border border-border-subtle bg-bg-base/40">
          {queue.map((e, i) => (
            <li key={e.entryId} className="flex items-center gap-2.5 px-3 py-2">
              <span className="w-5 font-display text-sm font-bold tabular-nums text-text-faded">
                {i + 1}
              </span>
              <UserAvatar
                size="sm"
                src={e.avatarUrl ?? undefined}
                alt={e.username ?? "Aluno"}
                fallback={(e.username ?? "?").slice(0, 2)}
                className="scale-90"
              />
              <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-text-body">
                {e.username ?? "(sem nome)"}
              </span>
              <span className="font-mono text-sm tabular-nums text-text-muted">
                há {formatAge(e.joinedAt, nowMs)}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(e)}
                disabled={removingId !== null}
                aria-label={`Remover ${e.username ?? "aluno"} da fila`}
                className="flex size-7 items-center justify-center rounded-sm text-text-faded transition-colors hover:bg-error/15 hover:text-error disabled:opacity-50"
              >
                {removingId === e.entryId ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <X size={14} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="font-mono-ui text-sm text-error">{error}</p>}
    </section>
  );
}
