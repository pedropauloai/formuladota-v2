"use client";

// StartMatchModal — PRO seleciona 4 alunos da fila e inicia uma sessão coordenada.
//
// Fluxo:
//   1. PRO seleciona exatamente 4 alunos (checkboxes com limite)
//   2. PRO define nome custom da sala (default: "Sessão {dia} {hora}")
//   3. Confirma → chama startCoordinatedMatch Server Action
//   4. Pós-sucesso: modal fecha + painel revalida
//
// Voz da copy: Mestre+Guardiao — direto, sem hype, sem emoji.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X, Users, Mic, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  startCoordinatedMatch,
  type StartMatchResult,
} from "@/app/actions/match-coordination";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateDefaultRoomName(
  t: (key: string, values?: Record<string, string | number>) => string
): string {
  const now = new Date();
  const dayKeys = [
    "weekdaySun",
    "weekdayMon",
    "weekdayTue",
    "weekdayWed",
    "weekdayThu",
    "weekdayFri",
    "weekdaySat",
  ];
  const day = t(dayKeys[now.getDay()]!);
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  return t("defaultRoomName", { day, hour, minute });
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface QueueParticipant {
  userId: string;
  username: string | null;
  honorTier: string;
}

interface StartMatchModalProps {
  queueParticipants: QueueParticipant[];
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function StartMatchModal({
  queueParticipants,
  onClose,
}: StartMatchModalProps) {
  const t = useTranslations("proCockpit");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [roomName, setRoomName] = useState(() => generateDefaultRoomName(t));
  const [result, setResult] = useState<StartMatchResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const canAddMore = selectedIds.length < 4;
  const isReady = selectedIds.length === 4 && roomName.trim().length >= 3;

  function toggleStudent(userId: string): void {
    setSelectedIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      if (prev.length >= 4) return prev; // limite atingido
      return [...prev, userId];
    });
  }

  function handleConfirm(): void {
    if (!isReady) return;

    startTransition(async () => {
      const res = await startCoordinatedMatch({
        studentUserIds: selectedIds,
        customRoomName: roomName.trim(),
      });

      setResult(res);

      if (res.success) {
        // Fecha automaticamente apos 2s de sucesso
        setTimeout(() => onClose(), 2000);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-match-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border-strong bg-bg-base shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            <h2
              id="start-match-title"
              className="font-display text-sm uppercase tracking-widest text-brand-primary"
            >
              {t("startMatch")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors hover:text-white"
            aria-label={t("closeAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">
          {/* Selecao de alunos */}
          <div>
            <p className="mb-3 text-sm text-text-muted uppercase tracking-wider font-display font-semibold">
              {t("select4Students")}{" "}
              <span
                className={cn(
                  "font-bold",
                  selectedIds.length === 4
                    ? "text-gold"
                    : "text-text-muted"
                )}
              >
                ({selectedIds.length}/4)
              </span>
            </p>

            {queueParticipants.length === 0 ? (
              <p className="rounded-lg border border-border-subtle bg-bg-elevated p-4 text-sm text-text-muted">
                {t("noStudentsInQueue")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {queueParticipants.map((participant) => {
                  const isSelected = selectedIds.includes(participant.userId);
                  const isDisabled = !isSelected && !canAddMore;

                  return (
                    <li key={participant.userId}>
                      <button
                        onClick={() => toggleStudent(participant.userId)}
                        disabled={isDisabled}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                          isSelected
                            ? "border-brand-primary/50 bg-brand-primary/5 text-white"
                            : isDisabled
                            ? "border-border-subtle bg-bg-elevated text-text-faded cursor-not-allowed"
                            : "border-border-subtle bg-bg-elevated text-text-muted hover:border-brand-primary/20 hover:text-white"
                        )}
                        aria-pressed={isSelected}
                      >
                        {/* Checkbox visual */}
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            isSelected
                              ? "border-brand-primary bg-brand-primary/20"
                              : "border-border-strong"
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-sm bg-brand-primary" />
                          )}
                        </span>

                        <span className="flex-1 text-sm font-medium">
                          {participant.username ?? t("player")}
                        </span>

                        <span className="font-mono text-sm text-text-muted">
                          {participant.honorTier}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Nome da sala */}
          <div>
            <label
              htmlFor="room-name"
              className="mb-2 block text-sm text-text-muted uppercase tracking-wider font-display font-semibold"
            >
              <Mic className="inline h-3 w-3 mr-1" aria-hidden="true" />
              {t("voiceRoomName")}
            </label>
            <input
              id="room-name"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={50}
              placeholder={t("voiceRoomPlaceholder")}
              className="w-full rounded-lg border border-border-subtle bg-bg-elevated px-4 py-2.5 text-sm text-white placeholder:text-text-faded focus:border-brand-primary/40 focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
            />
            <p className="mt-1 text-sm text-text-faded">
              {t("charsCount", { count: roomName.length, max: 50 })}
            </p>
          </div>

          {/* Feedback de resultado */}
          {result && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                result.success
                  ? "border-success/20 bg-success/5 text-success"
                  : "border-red-500/20 bg-red-500/5 text-red-400"
              )}
              role="alert"
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <span>
                {result.success
                  ? t("matchStartedSuccess", { room: result.voiceChannelName ?? "" })
                  : result.error ?? t("unknownError")}
              </span>
            </div>
          )}

          {/* Botoes */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 text-text-muted hover:text-white"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isReady || isPending || !!result?.success}
              className="flex-1 bg-play-primary text-text-inverse hover:bg-play-primary-hover disabled:opacity-50"
            >
              {isPending ? t("starting") : t("confirmAndStart")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
