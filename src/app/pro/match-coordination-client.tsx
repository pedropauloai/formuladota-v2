"use client";

// MatchCoordinationClient — Painel de coordenação de partida no /pro.
//
// Client Component: gerencia estado dos modals (Start/Finish).
// Recebe dados do Server Component (fila + sessao ativa).
//
// Exibe:
//   - Sessão ativa (se houver) com botão "Finalizar Partida"
//   - Botão "Iniciar Partida" (se 4+ alunos em fila e sem sessão ativa)
//   - Nada (se fila vazia e sem sessão ativa)

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play, StopCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartMatchModal, type QueueParticipant } from "@/components/pro/start-match-modal";
import { FinishMatchModal, type SessionStudent } from "@/components/pro/finish-match-modal";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ActiveSession {
  matchId: string;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
  startedAt: string;
  students: SessionStudent[];
}

interface MatchCoordinationClientProps {
  queueParticipants: QueueParticipant[];
  activeSession: ActiveSession | null;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function MatchCoordinationClient({
  queueParticipants,
  activeSession,
}: MatchCoordinationClientProps) {
  const t = useTranslations("proCockpit");
  const [showStartModal, setShowStartModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const canStartMatch = !activeSession && queueParticipants.length >= 4;
  const hasQueue = queueParticipants.length > 0;

  // Se não há sessão ativa e fila tem menos de 4 alunos: não renderizar nada
  if (!activeSession && !hasQueue) return null;

  return (
    <>
      {/* Sessao ativa */}
      {activeSession && (
        <div className="rounded-xl border border-brand-primary/30 bg-bg-base p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-display text-sm uppercase tracking-widest text-brand-primary">
                {t("matchInProgress")}
              </p>
              {activeSession.voiceChannelName && (
                <p className="text-sm text-text-muted font-mono">
                  {activeSession.voiceChannelName}
                </p>
              )}
              <p className="text-sm text-text-faded font-mono">
                {t("studentsCount", { count: activeSession.students.length })}:{" "}
                {activeSession.students
                  .map((s) => s.username ?? t("player"))
                  .join(", ")}
              </p>
            </div>

            <Button
              onClick={() => setShowFinishModal(true)}
              className="flex items-center gap-2 bg-brand-primary text-text-inverse hover:bg-brand-primary-hover"
            >
              <StopCircle className="h-4 w-4" aria-hidden="true" />
              {t("finishMatch")}
            </Button>
          </div>
        </div>
      )}

      {/* Fila sem sessao ativa */}
      {!activeSession && hasQueue && (
        <div className="rounded-xl border border-border-subtle bg-bg-base p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-display text-sm uppercase tracking-widest text-text-display">
                {t("queue")}
              </p>
              <p className="text-sm text-text-muted">
                {t("studentsWaiting", { count: queueParticipants.length })}
                {queueParticipants.length < 4 && (
                  <span className="text-text-faded">
                    {" "}{t("minToStart")}
                  </span>
                )}
              </p>
            </div>

            <Button
              onClick={() => setShowStartModal(true)}
              disabled={!canStartMatch}
              className="flex items-center gap-2 bg-play-primary text-text-inverse hover:bg-play-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                !canStartMatch
                  ? t("waitingForStudents", { count: 4 - queueParticipants.length })
                  : undefined
              }
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {t("startMatch")}
            </Button>
          </div>

          {/* Lista compacta de quem esta na fila */}
          {queueParticipants.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {queueParticipants.map((p) => (
                <span
                  key={p.userId}
                  className="flex items-center gap-1 rounded border border-border-subtle bg-bg-elevated px-2 py-1 text-sm text-text-muted"
                >
                  <Users className="h-3 w-3 text-text-faded" aria-hidden="true" />
                  {p.username ?? t("player")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showStartModal && (
        <StartMatchModal
          queueParticipants={queueParticipants}
          onClose={() => setShowStartModal(false)}
        />
      )}

      {showFinishModal && activeSession && (
        <FinishMatchModal
          matchId={activeSession.matchId}
          voiceChannelName={activeSession.voiceChannelName}
          startedAt={activeSession.startedAt}
          students={activeSession.students}
          onClose={() => setShowFinishModal(false)}
        />
      )}
    </>
  );
}
