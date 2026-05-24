"use client";

// CoachNotesPanel — Painel inline de Coach Notes + Strike leve por aluno.
// Exibido quando Pedro confirma uma PT realizada.
//
// 3 botões por aluno:
//   - Coach Note +5 (honor_ledger source='coach_note_positive' delta=+5)
//   - Coach Note -5 (honor_ledger source='coach_note_negative' delta=-5)
//   - Strike leve  (honor_ledger source='admin_strike_light' delta=-20)
//
// Cada ação tem input de nota opcional e registra em admin_audit_log.

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown, ShieldAlert, Loader2, Check } from "lucide-react";
import { applyCoachNote, applyStrike } from "@/app/admin/users/actions";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CoachNoteEntry {
  userId: string;
  username: string;
}

interface CoachNotesPanelProps {
  entries: CoachNoteEntry[];
  matchId: string;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function CoachNotesPanel({ entries, matchId }: CoachNotesPanelProps) {
  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-bg-elevated/20 p-3 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-faded">
        Coach Notes — registrar conduta dos alunos desta PT
      </p>
      <div className="space-y-2">
        {entries.map((entry) => (
          <StudentNoteRow
            key={entry.userId}
            userId={entry.userId}
            username={entry.username}
            matchId={matchId}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Linha por aluno ─────────────────────────────────────────────────────────

function StudentNoteRow({
  userId,
  username,
  matchId,
}: {
  userId: string;
  username: string;
  matchId: string;
}) {
  const [note, setNote] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function feedback(msg: string, error = false) {
    setResult(msg);
    setIsError(error);
    setTimeout(() => setResult(null), 3000);
  }

  function handleCoachNote(delta: 5 | -5) {
    const action = delta > 0 ? "note_pos" : "note_neg";
    setPendingAction(action);
    startTransition(async () => {
      const res = await applyCoachNote({
        targetUserId: userId,
        delta,
        reason: note.trim() || undefined,
        matchId,
      });
      setPendingAction(null);
      if (!res.success) {
        feedback(res.error, true);
      } else {
        feedback(delta > 0 ? "+5 HONOR registrado" : "-5 HONOR registrado");
        setNote("");
      }
    });
  }

  function handleStrike() {
    if (!window.confirm(`Aplicar strike leve em ${username}? (-20 HONOR)`)) return;
    setPendingAction("strike");
    startTransition(async () => {
      const res = await applyStrike({
        targetUserId: userId,
        severity: "leve",
        reason: note.trim() || `Strike leve pós-PT ${matchId}`,
      });
      setPendingAction(null);
      if (!res.success) {
        feedback(res.error, true);
      } else {
        feedback("Strike leve aplicado");
        setNote("");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-subtle/40 bg-bg-base/40 p-3 space-y-2">
      <p className="font-mono text-xs font-semibold text-text-body">{username}</p>

      {/* Nota opcional */}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota opcional (aparece no log)..."
        className="w-full rounded-md border border-border-subtle bg-bg-base/60 px-2 py-1.5 font-mono text-[10px] text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary/40"
      />

      {/* Botões */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleCoachNote(5)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-success hover:bg-success/20 transition-colors disabled:opacity-50"
        >
          {pendingAction === "note_pos" ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <ThumbsUp size={10} />
          )}
          +5
        </button>
        <button
          type="button"
          onClick={() => handleCoachNote(-5)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-warning hover:bg-warning/20 transition-colors disabled:opacity-50"
        >
          {pendingAction === "note_neg" ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <ThumbsDown size={10} />
          )}
          -5
        </button>
        <button
          type="button"
          onClick={handleStrike}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-error/40 bg-error/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-error hover:bg-error/20 transition-colors disabled:opacity-50"
        >
          {pendingAction === "strike" ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <ShieldAlert size={10} />
          )}
          Strike leve
        </button>
      </div>

      {/* Feedback inline */}
      {result && (
        <div className={`flex items-center gap-1.5 font-mono text-[10px] ${isError ? "text-error" : "text-success"}`}>
          {!isError && <Check size={10} />}
          {result}
        </div>
      )}
    </div>
  );
}
