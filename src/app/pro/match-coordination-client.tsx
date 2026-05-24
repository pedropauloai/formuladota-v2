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
        <div className="rounded-xl border border-[#A855F7]/30 bg-[#0A0A1A] p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-display text-sm uppercase tracking-widest text-[#A855F7]">
                Partida em Curso
              </p>
              {activeSession.voiceChannelName && (
                <p className="text-xs text-[#556070] font-mono">
                  {activeSession.voiceChannelName}
                </p>
              )}
              <p className="text-xs text-[#334455] font-mono">
                {activeSession.students.length} aluno{activeSession.students.length !== 1 ? "s" : ""}:{" "}
                {activeSession.students
                  .map((s) => s.username ?? "Jogador")
                  .join(", ")}
              </p>
            </div>

            <Button
              onClick={() => setShowFinishModal(true)}
              className="flex items-center gap-2 bg-[#A855F7] text-white hover:bg-[#9333EA]"
            >
              <StopCircle className="h-4 w-4" aria-hidden="true" />
              Finalizar Partida
            </Button>
          </div>
        </div>
      )}

      {/* Fila sem sessao ativa */}
      {!activeSession && hasQueue && (
        <div className="rounded-xl border border-[#0D0D2A] bg-[#0A0A1A] p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-display text-sm uppercase tracking-widest text-text-display">
                Fila
              </p>
              <p className="text-xs text-[#556070]">
                {queueParticipants.length} aluno{queueParticipants.length !== 1 ? "s" : ""} aguardando
                {queueParticipants.length < 4 && (
                  <span className="text-[#334455]">
                    {" "}— minimo 4 para iniciar
                  </span>
                )}
              </p>
            </div>

            <Button
              onClick={() => setShowStartModal(true)}
              disabled={!canStartMatch}
              className="flex items-center gap-2 bg-[#00F0FF] text-black hover:bg-[#00D4E0] disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                !canStartMatch
                  ? `Aguardando ${4 - queueParticipants.length} aluno(s) para completar a fila`
                  : undefined
              }
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Iniciar Partida
            </Button>
          </div>

          {/* Lista compacta de quem esta na fila */}
          {queueParticipants.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {queueParticipants.map((p) => (
                <span
                  key={p.userId}
                  className="flex items-center gap-1 rounded border border-[#0D0D2A] bg-[#050510] px-2 py-1 text-xs text-[#8899AA]"
                >
                  <Users className="h-3 w-3 text-[#334455]" aria-hidden="true" />
                  {p.username ?? "Jogador"}
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
