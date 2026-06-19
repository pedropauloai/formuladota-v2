"use client";

// CockpitActionPanel — coluna AÇÃO do cockpit, guiada por estado:
//   (a) fila fechada       → instrução curta, nada mais
//   (b) aberta, sem PT     → mini-slots da próxima PT + CTA INICIAR PT
//   (c) PT em curso        → cronômetro + match ID + CONFIRMAR PT + cancelar
//
// CONFIRMAR PT funde os 2 passos manuais de hoje num fluxo só:
//   1. previewMatchValidation (anti-Turbo/ranked + participantes, não muta DB)
//   2. enrichMatchFromOpenDota (importa players E vira status='realizada' —
//      o trigger PG cobra as fichas no mesmo passo)
// confirmPTRealized NÃO roda antes do enrich de propósito: ele seta enriched_at
// e o guard do enrich bloquearia. O enrich sozinho confirma + enriquece.
// Fallback "confirmar sem dados" (confirmPTRealized) cobre OpenDota fora do ar.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, Swords, UserRound } from "lucide-react";
import {
  startPT,
  confirmPTRealized,
  cancelPT,
  enrichMatchFromOpenDota,
} from "@/app/admin/pros/actions";
import { previewMatchValidation } from "@/app/actions/match-coordination";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm, usePrompt } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import type { CockpitActivePT, CockpitQueueEntry } from "./cockpit-data";

interface PanelProps {
  filaAberta: boolean;
  activePT: CockpitActivePT | null;
  /** Entries selecionadas pra próxima PT, na ordem da fila. */
  selectedEntries: CockpitQueueEntry[];
  maxPT: number;
  nowMs: number;
  /** Reseta a seleção pro padrão (top da fila) após iniciar PT. */
  onPTStarted: () => void;
}

export function CockpitActionPanel({
  filaAberta,
  activePT,
  selectedEntries,
  maxPT,
  nowMs,
  onPTStarted,
}: PanelProps) {
  const t = useTranslations("proCockpit");

  // (c) PT em curso tem prioridade — mesmo com fila fechada a PT continua
  if (activePT) return <ActivePTPanel activePT={activePT} nowMs={nowMs} />;

  // (a) fila fechada — instrução curta e nada mais
  if (!filaAberta) {
    return (
      <PanelShell title={t("actionTitle")}>
        <p className="font-body text-sm leading-relaxed text-text-muted">
          {t("actionClosedHint")}
        </p>
      </PanelShell>
    );
  }

  // (b) fila aberta, sem PT em curso — montar e iniciar a próxima PT
  return (
    <NextPTPanel
      selectedEntries={selectedEntries}
      maxPT={maxPT}
      onPTStarted={onPTStarted}
    />
  );
}

// ---------------------------------------------------------------------------
// PanelShell — moldura comum da coluna AÇÃO
// ---------------------------------------------------------------------------

function PanelShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="font-display-condensed text-xl uppercase leading-none tracking-wider text-text-display">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// (b) NextPTPanel — mini-slots + INICIAR PT
// ---------------------------------------------------------------------------

function NextPTPanel({
  selectedEntries,
  maxPT,
  onPTStarted,
}: {
  selectedEntries: CockpitQueueEntry[];
  maxPT: number;
  onPTStarted: () => void;
}) {
  const t = useTranslations("proCockpit");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const slots = Array.from({ length: maxPT }, (_, i) => selectedEntries[i] ?? null);

  function handleStart() {
    setError(null);
    const ids = selectedEntries.map((e) => e.entryId);
    startTransition(async () => {
      const res = await startPT(ids);
      if (!res.success) {
        setError(res.error);
      } else {
        onPTStarted();
        router.refresh();
      }
    });
  }

  return (
    <PanelShell title={t("nextPtTitle")}>
      {/* Mini-slots: quem entra na PT (você + 4 alunos = 5 vagas no grupo) */}
      <ul className="flex flex-col gap-1.5">
        {slots.map((entry, i) => (
          <li
            key={entry?.entryId ?? `vazio-${i}`}
            className={cn(
              "flex h-10 items-center gap-2 rounded-sm border px-2",
              entry
                ? "border-border-subtle bg-bg-elevated"
                : "border-dashed border-border-subtle bg-bg-base/40"
            )}
          >
            {entry ? (
              <>
                <UserAvatar
                  size="sm"
                  src={entry.avatarUrl ?? undefined}
                  alt={entry.username ?? t("student")}
                  fallback={(entry.username ?? "?").slice(0, 2)}
                  className="scale-75"
                />
                <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-text-body">
                  {entry.username ?? t("anonymous")}
                </span>
                <span className="font-display text-sm font-bold tabular-nums text-gold">
                  {entry.mmr != null ? entry.mmr.toLocaleString("pt-BR") : "—"}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-2 font-display-condensed text-base uppercase leading-none tracking-wider text-text-faded">
                <UserRound size={14} aria-hidden="true" />
                {t("freeSlot")}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* CTA de compromisso — vermelho brand, h-12 (variant primary + size md) */}
      <Button
        variant="primary"
        size="md"
        className="w-full"
        onClick={handleStart}
        disabled={selectedEntries.length === 0}
        loading={pending}
      >
        <Swords size={16} aria-hidden="true" />
        {t("startPt", { count: selectedEntries.length, max: maxPT })}
      </Button>

      {error && <p className="font-mono-ui text-sm text-error">{error}</p>}

      <p className="font-mono text-sm leading-relaxed text-text-faded">
        {t("chargeHint")}
      </p>
    </PanelShell>
  );
}

// ---------------------------------------------------------------------------
// (c) ActivePTPanel — cronômetro + confirmar/cancelar
// ---------------------------------------------------------------------------

function formatElapsed(startedAt: string, nowMs: number): string {
  const total = Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function ActivePTPanel({
  activePT,
  nowMs,
}: {
  activePT: CockpitActivePT;
  nowMs: number;
}) {
  const t = useTranslations("proCockpit");
  const router = useRouter();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [dotaMatchId, setDotaMatchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  /** Motivo da reprovação na validação OpenDota (anti-Turbo etc). */
  const [validationFail, setValidationFail] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    setValidationFail(null);
    const id = dotaMatchId.trim();
    if (!/^\d{8,12}$/.test(id)) {
      setError(t("matchIdFormatError"));
      return;
    }
    startTransition(async () => {
      // Passo 1 — validação anti-Turbo (ranked oficial + participantes + recência)
      const preview = await previewMatchValidation({
        matchId: activePT.matchId,
        dotaMatchId: id,
      });
      if (!preview.success) {
        setError(preview.error ?? t("openDotaValidationError"));
        return;
      }
      if (!preview.valid) {
        setValidationFail(preview.reason ?? t("matchRejectedValidation"));
        return;
      }
      // Passo 2 — enriquece E confirma: status vira 'realizada' (trigger cobra fichas)
      const res = await enrichMatchFromOpenDota(activePT.matchId, id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  async function handleConfirmManual() {
    const ok = await confirm({
      title: t("confirmManualTitle"),
      message: t("confirmManualMessage"),
      confirmLabel: t("confirmAnyway"),
      variant: "destructive",
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmPTRealized(activePT.matchId);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  async function handleCancel() {
    const reason = await prompt({
      title: t("cancelPtTitle"),
      message: t("cancelPtMessage"),
      placeholder: t("cancelPtPlaceholder"),
      required: true,
      multiline: true,
      confirmLabel: t("cancelPtConfirm"),
      variant: "destructive",
    });
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError(t("reasonMinError"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await cancelPT(activePT.matchId, reason);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <PanelShell title={t("activePtTitle")}>
      {/* Cronômetro desde o início da PT */}
      <div className="rounded-sm border border-brand-primary/30 bg-brand-primary/5 px-3 py-4 text-center">
        <p
          className="font-display-condensed text-5xl uppercase leading-none tracking-wider tabular-nums text-text-display"
          aria-label={t("elapsedAria")}
        >
          {formatElapsed(activePT.startedAt, nowMs)}
        </p>
        <p className="mt-1.5 font-display-condensed text-base uppercase leading-none tracking-wider text-text-muted">
          {t("studentsInGame", { count: activePT.students.length })}
        </p>
      </div>

      {/* Alunos da PT */}
      <ul className="flex flex-wrap gap-1.5">
        {activePT.students.map((s) => (
          <li
            key={s.userId}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle bg-bg-elevated px-1.5 py-1"
          >
            <UserAvatar
              size="sm"
              src={s.avatarUrl ?? undefined}
              alt={s.username ?? t("student")}
              fallback={(s.username ?? "?").slice(0, 2)}
              className="scale-75"
            />
            <span className="font-display text-sm font-semibold text-text-body">
              {s.username ?? t("anonymous")}
            </span>
          </li>
        ))}
      </ul>

      {/* Confirmar: match ID Dota → valida anti-Turbo → enriquece + cobra fichas */}
      <label className="flex flex-col gap-1.5">
        <span className="font-display-condensed text-base uppercase leading-none tracking-wider text-text-muted">
          {t("matchIdLabel")}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={dotaMatchId}
          onChange={(e) => setDotaMatchId(e.target.value)}
          placeholder={t("matchIdPlaceholder")}
          className="w-full rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-sm text-text-body placeholder:text-text-faded"
        />
      </label>

      <Button
        variant="primary"
        size="md"
        className="w-full"
        onClick={handleConfirm}
        disabled={dotaMatchId.trim().length === 0}
        loading={pending}
      >
        <Check size={16} aria-hidden="true" />
        {t("confirmPt")}
      </Button>

      {/* Resultado da validação anti-Turbo quando reprova */}
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
            {t("confirmManualLink")}
          </button>
        </div>
      )}

      {error && <p className="font-mono-ui text-sm text-error">{error}</p>}

      {/* Cancelar — discreto, sem peso visual */}
      <button
        type="button"
        onClick={handleCancel}
        disabled={pending}
        className="self-center font-mono text-sm text-text-faded underline-offset-4 transition-colors hover:text-error hover:underline disabled:opacity-50"
      >
        {t("cancelPtLink")}
      </button>
    </PanelShell>
  );
}
