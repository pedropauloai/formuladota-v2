"use client";

// FinishMatchModal — PRO finaliza sessao ativa informando o dota_match_id.
//
// Fluxo:
//   1. Modal exibe alunos participantes da sessao ativa
//   2. PRO digita dota_match_id (8-12 digitos)
//   3. Botao "Validar via OpenDota" — chama previewMatchValidation (preview, sem mutar DB)
//   4. Preview mostra: confirmados/total + texto descritivo
//   5. PRO clica "Confirmar e Finalizar" → chama finishCoordinatedMatch
//   6. Pós-sucesso: modal fecha + painel revalida
//
// Voz da copy: Mestre+Guardiao — direto, sem hype, sem emoji.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X, Hash, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  finishCoordinatedMatch,
  previewMatchValidation,
  type FinishMatchResult,
  type PreviewValidationResult,
} from "@/app/actions/match-coordination";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface SessionStudent {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
}

interface FinishMatchModalProps {
  matchId: string;
  voiceChannelName: string | null;
  startedAt: string;
  students: SessionStudent[];
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(isoString: string): string {
  const started = new Date(isoString);
  const diffMs = Date.now() - started.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hours}h${rem > 0 ? ` ${rem}min` : ""}`;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function FinishMatchModal({
  matchId,
  voiceChannelName,
  startedAt,
  students,
  onClose,
}: FinishMatchModalProps) {
  const t = useTranslations("proCockpit");
  const [dotaMatchId, setDotaMatchId] = useState("");
  const [preview, setPreview] = useState<PreviewValidationResult | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isFinishing, startFinish] = useTransition();
  const [finalResult, setFinalResult] = useState<FinishMatchResult | null>(null);

  const matchIdPattern = /^\d{8,12}$/;
  const isValidFormat = matchIdPattern.test(dotaMatchId);
  const isAnyPending = isPreviewing || isFinishing;

  function handlePreview(): void {
    if (!isValidFormat) return;

    startPreview(async () => {
      const res = await previewMatchValidation({ matchId, dotaMatchId });
      setPreview(res);
    });
  }

  function handleFinish(): void {
    if (!isValidFormat) return;

    startFinish(async () => {
      const res = await finishCoordinatedMatch({ matchId, dotaMatchId });
      setFinalResult(res);

      if (res.success) {
        setTimeout(() => onClose(), 2500);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-match-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isAnyPending ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border-strong bg-bg-base shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle p-5">
          <div className="flex items-center gap-3">
            <Hash className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            <h2
              id="finish-match-title"
              className="font-display text-sm uppercase tracking-widest text-brand-primary"
            >
              {t("finishMatch")}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isAnyPending}
            className="rounded p-1 text-text-muted transition-colors hover:text-white disabled:opacity-40"
            aria-label={t("closeAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">
          {/* Info da sessao */}
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-3">
            <Clock className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <span className="text-sm text-text-muted">
              {voiceChannelName ?? t("unnamedSession")} —{" "}
              <span className="text-text-faded">{t("durationInProgress", { duration: formatDuration(startedAt) })}</span>
            </span>
          </div>

          {/* Alunos da sessao */}
          {students.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-text-muted uppercase tracking-wider font-display font-semibold">
                {t("participants")}
              </p>
              <ul className="flex flex-wrap gap-2" role="list">
                {students.map((student) => (
                  <li
                    key={student.userId}
                    className="rounded border border-border-subtle bg-bg-elevated px-3 py-1 text-sm text-text-muted"
                  >
                    {student.username ?? t("player")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Input Match ID */}
          <div>
            <label
              htmlFor="dota-match-id"
              className="mb-2 block text-sm text-text-muted uppercase tracking-wider font-display font-semibold"
            >
              {t("matchIdDota2")}
            </label>
            <div className="flex gap-2">
              <input
                id="dota-match-id"
                type="text"
                value={dotaMatchId}
                onChange={(e) => {
                  // Aceita apenas digitos
                  const clean = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setDotaMatchId(clean);
                  setPreview(null); // reset preview se input mudar
                }}
                placeholder={t("matchIdPlaceholderFinish")}
                maxLength={12}
                disabled={isAnyPending || !!finalResult?.success}
                className="flex-1 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-2.5 text-sm text-white placeholder:text-text-faded font-mono focus:border-brand-primary/40 focus:outline-none focus:ring-1 focus:ring-brand-primary/20 disabled:opacity-50"
                aria-describedby="match-id-hint"
              />
              <Button
                onClick={handlePreview}
                disabled={!isValidFormat || isAnyPending || !!finalResult?.success}
                variant="ghost"
                className="shrink-0 text-info hover:bg-info/10 hover:text-info disabled:opacity-40"
              >
                {isPreviewing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  t("validate")
                )}
              </Button>
            </div>
            <p
              id="match-id-hint"
              className="mt-1 text-sm text-text-faded"
            >
              {t("matchIdHint")}
            </p>
          </div>

          {/* Preview de validacao */}
          {preview && !finalResult && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                preview.valid
                  ? "border-success/20 bg-success/5 text-success"
                  : "border-amber-500/20 bg-amber-500/5 text-amber-400"
              )}
              role="status"
            >
              {preview.valid ? (
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="flex flex-col gap-1">
                {preview.valid ? (
                  <>
                    <span className="font-medium">
                      {t("participantsConfirmed", {
                        found: preview.participantsFound ?? 0,
                        expected: preview.participantsExpected ?? 0,
                      })}
                    </span>
                    <span className="text-sm text-success/70">
                      {t("matchValidConfirm")}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{t("validationFailed")}</span>
                    <span className="text-sm text-amber-400/70">
                      {preview.reason ?? t("validationUnknownError")}
                    </span>
                    <span className="text-sm text-amber-400/70 mt-1">
                      {t("canStillConfirm")}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Resultado final */}
          {finalResult && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                finalResult.success
                  ? "border-success/20 bg-success/5 text-success"
                  : "border-red-500/20 bg-red-500/5 text-red-400"
              )}
              role="alert"
            >
              {finalResult.success ? (
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="flex flex-col gap-1">
                {finalResult.success ? (
                  <>
                    <span className="font-medium">{t("matchFinished")}</span>
                    <span className="text-sm text-success/70">
                      {finalResult.validated
                        ? t("tokensConsumedValidated")
                        : t("tokensConsumedUnverified")}
                    </span>
                  </>
                ) : (
                  <span>{finalResult.error ?? t("finishMatchError")}</span>
                )}
              </div>
            </div>
          )}

          {/* Botoes */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isAnyPending}
              className="flex-1 text-text-muted hover:text-white"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleFinish}
              disabled={!isValidFormat || isAnyPending || !!finalResult?.success}
              className="flex-1 bg-brand-primary text-text-inverse hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {isFinishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("finishing")}
                </>
              ) : (
                t("confirmAndFinish")
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
