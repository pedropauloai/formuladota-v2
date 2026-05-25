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

function generateDefaultRoomName(): string {
  const now = new Date();
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const day = days[now.getDay()];
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  return `Sessao ${day} ${hour}h${minute}`;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [roomName, setRoomName] = useState(generateDefaultRoomName);
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
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[#00F0FF]/30 bg-[#0A0A1A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0D0D2A] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#00F0FF]" aria-hidden="true" />
            <h2
              id="start-match-title"
              className="font-display text-sm uppercase tracking-widest text-[#00F0FF]"
            >
              Iniciar Partida
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#556070] transition-colors hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">
          {/* Selecao de alunos */}
          <div>
            <p className="mb-3 text-sm text-[#556070] uppercase tracking-wider font-mono">
              Selecione 4 alunos{" "}
              <span
                className={cn(
                  "font-bold",
                  selectedIds.length === 4
                    ? "text-[#00F0FF]"
                    : "text-[#A855F7]"
                )}
              >
                ({selectedIds.length}/4)
              </span>
            </p>

            {queueParticipants.length === 0 ? (
              <p className="rounded-lg border border-[#0D0D2A] bg-[#050510] p-4 text-sm text-[#556070]">
                Nenhum aluno na fila no momento.
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
                            ? "border-[#00F0FF]/50 bg-[#00F0FF]/5 text-white"
                            : isDisabled
                            ? "border-[#0D0D2A] bg-[#050510] text-[#556070] cursor-not-allowed"
                            : "border-[#0D0D2A] bg-[#050510] text-[#8899AA] hover:border-[#00F0FF]/20 hover:text-white"
                        )}
                        aria-pressed={isSelected}
                      >
                        {/* Checkbox visual */}
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            isSelected
                              ? "border-[#00F0FF] bg-[#00F0FF]/20"
                              : "border-[#334455]"
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-sm bg-[#00F0FF]" />
                          )}
                        </span>

                        <span className="flex-1 text-sm font-medium">
                          {participant.username ?? "Jogador"}
                        </span>

                        <span className="font-mono text-sm text-[#556070]">
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
              className="mb-2 block text-sm text-[#556070] uppercase tracking-wider font-mono"
            >
              <Mic className="inline h-3 w-3 mr-1" aria-hidden="true" />
              Nome da sala de voz
            </label>
            <input
              id="room-name"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={50}
              placeholder="Ex: Sessao Sabado 19h"
              className="w-full rounded-lg border border-[#0D0D2A] bg-[#050510] px-4 py-2.5 text-sm text-white placeholder-[#334455] focus:border-[#00F0FF]/40 focus:outline-none focus:ring-1 focus:ring-[#00F0FF]/20"
            />
            <p className="mt-1 text-sm text-[#334455]">
              {roomName.length}/50 caracteres
            </p>
          </div>

          {/* Feedback de resultado */}
          {result && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                result.success
                  ? "border-[#00F0FF]/20 bg-[#00F0FF]/5 text-[#00F0FF]"
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
                  ? `Partida iniciada. Sala "${result.voiceChannelName}" criada no Discord.`
                  : result.error ?? "Erro desconhecido."}
              </span>
            </div>
          )}

          {/* Botoes */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 text-[#556070] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isReady || isPending || !!result?.success}
              className="flex-1 bg-[#00F0FF] text-black hover:bg-[#00D4E0] disabled:opacity-50"
            >
              {isPending ? "Iniciando..." : "Confirmar e Iniciar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
