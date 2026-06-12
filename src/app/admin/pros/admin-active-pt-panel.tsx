"use client";

// AdminActivePTPanel — PT em curso de um coach, com ações de EMERGÊNCIA do
// admin (quando o PRO não resolve):
//   - Confirmar com match ID: validação anti-Turbo (adminPreviewMatchValidation)
//     → enrichMatchFromOpenDota (já admin-gated; confirma + enriquece + trigger
//     cobra fichas) — mesmo fluxo de 2 passos do cockpit do PRO.
//   - Confirmar sem dados (fallback OpenDota fora do ar): adminConfirmPTRealized.
//   - Cancelar PT: adminCancelPT (sem cobrança).
// Após confirmar, avisa o pai (onConfirmed) pra exibir o CoachNotesPanel.

import { useState, useTransition } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm, usePrompt } from "@/components/ui/confirm";
import { enrichMatchFromOpenDota } from "./actions";
import {
  adminCancelPT,
  adminConfirmPTRealized,
  adminPreviewMatchValidation,
} from "./admin-pt-actions";
import type { AdminPendingPT } from "./admin-pros-types";
import { formatElapsed } from "./format";

interface Props {
  pt: AdminPendingPT;
  nowMs: number;
  /** Refetch do snapshot após qualquer mutação. */
  onChanged: () => void;
  /** PT confirmada — pai exibe CoachNotesPanel com esses alunos. */
  onConfirmed: (pt: AdminPendingPT) => void;
}

export function AdminActivePTPanel({ pt, nowMs, onChanged, onConfirmed }: Props) {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [dotaMatchId, setDotaMatchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validationFail, setValidationFail] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    setValidationFail(null);
    const id = dotaMatchId.trim();
    if (!/^\d{8,12}$/.test(id)) {
      setError("Match ID Dota deve ter entre 8 e 12 dígitos numéricos.");
      return;
    }
    startTransition(async () => {
      // Passo 1 — anti-Turbo (ranked oficial + participantes + recência)
      const preview = await adminPreviewMatchValidation(pt.matchId, id);
      if (!preview.success) {
        setError(preview.error ?? "Erro na validação OpenDota.");
        return;
      }
      if (!preview.valid) {
        setValidationFail(preview.reason ?? "Partida reprovada na validação.");
        return;
      }
      // Passo 2 — enriquece E confirma (trigger PG cobra as fichas)
      const res = await enrichMatchFromOpenDota(pt.matchId, id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onConfirmed(pt);
      onChanged();
    });
  }

  async function handleConfirmManual() {
    const ok = await confirm({
      title: "Confirmar PT sem dados OpenDota?",
      message:
        "Cobra 1 ficha de cada aluno sem importar KDA/GPM. Use só se o OpenDota estiver fora do ar. Irreversível.",
      confirmLabel: "Confirmar mesmo assim",
      variant: "destructive",
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await adminConfirmPTRealized(pt.matchId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onConfirmed(pt);
      onChanged();
    });
  }

  async function handleCancel() {
    const reason = await prompt({
      title: "Cancelar PT (intervenção admin)",
      message:
        "Motivo do cancelamento (será salvo e auditado, mín 3 caracteres). Nenhuma ficha é cobrada.",
      placeholder: "Ex: PRO sumiu, partida abortada, suporte ao aluno",
      required: true,
      multiline: true,
      confirmLabel: "Cancelar PT",
      variant: "destructive",
    });
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("Motivo precisa ter pelo menos 3 caracteres.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await adminCancelPT(pt.matchId, reason);
      if (!res.success) setError(res.error);
      else onChanged();
    });
  }

  return (
    <article className="space-y-3 rounded-sm border border-warning/40 bg-warning/5 p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display-condensed text-lg uppercase leading-none tracking-wider text-warning">
          PT em curso · há{" "}
          <span className="tabular-nums">{formatElapsed(pt.createdAt, nowMs)}</span>
        </h3>
        <span className="font-mono text-sm text-text-faded">
          #{pt.matchId.slice(0, 8)}
        </span>
      </header>

      {/* Alunos em campo */}
      <ul className="flex flex-wrap gap-1.5">
        {pt.students.map((s) => (
          <li
            key={s.userId}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-bg-elevated px-1.5 py-1"
          >
            <UserAvatar
              size="sm"
              src={s.avatarUrl ?? undefined}
              alt={s.username ?? "Aluno"}
              fallback={(s.username ?? "?").slice(0, 2)}
              className="scale-75"
            />
            <span className="font-display text-sm font-semibold text-text-body">
              {s.username ?? "(sem nome)"}
            </span>
          </li>
        ))}
        {pt.students.length === 0 && (
          <li className="font-mono text-sm text-text-faded">
            Nenhuma entry in_match vinculada (estado inconsistente — cancele).
          </li>
        )}
      </ul>

      {/* Confirmar: match ID → anti-Turbo → enrich + cobrança */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-44 flex-1 flex-col gap-1.5">
          <span className="font-display-condensed text-base uppercase leading-none tracking-wider text-text-muted">
            Match ID Dota (pós-partida)
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={dotaMatchId}
            onChange={(e) => setDotaMatchId(e.target.value)}
            placeholder="ex: 7891234567"
            className="w-full rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-sm text-text-body placeholder:text-text-faded"
          />
        </label>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          disabled={dotaMatchId.trim().length === 0}
          loading={pending}
        >
          <Check size={16} aria-hidden="true" />
          Confirmar PT
        </Button>
      </div>

      {validationFail && (
        <div className="flex flex-col gap-2 rounded-sm border border-warning/40 bg-warning/10 p-3">
          <p className="inline-flex items-start gap-2 font-body text-sm leading-relaxed text-warning">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {validationFail}
          </p>
          <button
            type="button"
            onClick={handleConfirmManual}
            className="self-start font-display text-sm font-semibold uppercase tracking-wide text-text-muted underline-offset-4 transition-colors hover:text-text-display hover:underline"
          >
            Confirmar sem dados (manual)
          </button>
        </div>
      )}

      {error && <p className="font-mono-ui text-sm text-error">{error}</p>}

      <button
        type="button"
        onClick={handleCancel}
        disabled={pending}
        className="font-mono text-sm text-text-faded underline-offset-4 transition-colors hover:text-error hover:underline disabled:opacity-50"
      >
        cancelar PT (sem cobrança)
      </button>
    </article>
  );
}
