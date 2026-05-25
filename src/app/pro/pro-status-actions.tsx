"use client";

// ProStatusActions — Client Component para ações de status PRO + edição de bio.
//
// Ações:
//   - Pausar PRO (chamada pausePro server action + router.refresh)
//   - Retomar PRO (chamada resumePro server action + router.refresh)
//   - Editar bio inline (updateMyBio + router.refresh)

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Edit3, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pausePro, resumePro } from "@/app/actions/pro-management";
import { updateMyBio } from "@/app/pro/actions";

interface ProStatusActionsProps {
  /** true = PRO ativo, false = PRO pausado */
  isActive: boolean;
}

/**
 * Botões de ação para gerenciar status PRO + edição de bio inline.
 * Chama Server Actions e faz router.refresh() após sucesso.
 */
export function ProStatusActions({ isActive }: ProStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Estado de edição de bio
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [isBioPending, startBioTransition] = useTransition();

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handlePause() {
    startTransition(async () => {
      const result = await pausePro();
      if (result.success) {
        showFeedback("success", "Status PRO pausado. Sua fila foi fechada automaticamente.");
        router.refresh();
      } else {
        showFeedback("error", result.error ?? "Erro ao pausar status.");
      }
    });
  }

  function handleResume() {
    startTransition(async () => {
      const result = await resumePro();
      if (result.success) {
        showFeedback("success", "Status PRO retomado.");
        router.refresh();
      } else {
        showFeedback("error", result.error ?? "Erro ao retomar status.");
      }
    });
  }

  function handleBioSave() {
    startBioTransition(async () => {
      const result = await updateMyBio(bioText);
      if (result.success) {
        setEditingBio(false);
        showFeedback("success", "Bio atualizada.");
        router.refresh();
      } else {
        showFeedback("error", result.error ?? "Erro ao salvar bio.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Ações de status */}
      <div className="flex items-center gap-3 flex-wrap">
        {isActive ? (
          /* Botão Pausar */
          <button
            type="button"
            onClick={handlePause}
            disabled={isPending}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
              "border border-warning/30 bg-warning/10 text-warning",
              "hover:bg-warning/20 transition-colors disabled:opacity-50"
            )}
          >
            <Pause size={14} aria-hidden="true" />
            {isPending ? "Pausando..." : "Pausar status PRO"}
          </button>
        ) : (
          /* Botão Retomar */
          <button
            type="button"
            onClick={handleResume}
            disabled={isPending}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
              "border border-success/30 bg-success/10 text-success",
              "hover:bg-success/20 transition-colors disabled:opacity-50"
            )}
          >
            <Play size={14} aria-hidden="true" />
            {isPending ? "Retomando..." : "Retomar status PRO"}
          </button>
        )}

        {/* Editar bio */}
        {!editingBio && (
          <button
            type="button"
            onClick={() => setEditingBio(true)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
              "border border-border-subtle bg-bg-base text-text-muted",
              "hover:text-text-body hover:border-border-primary/30 transition-colors"
            )}
          >
            <Edit3 size={14} aria-hidden="true" />
            Editar bio
          </button>
        )}
      </div>

      {/* Edição inline de bio */}
      {editingBio && (
        <div className="flex flex-col gap-2">
          <textarea
            className={cn(
              "w-full rounded-lg border border-border-subtle bg-bg-base",
              "p-3 text-sm text-text-body placeholder:text-text-muted",
              "resize-none focus:outline-none focus:ring-1 focus:ring-brand-primary/50",
              "min-h-[80px]"
            )}
            placeholder="Descreva seu estilo de coaching, especialidades e o que os alunos podem esperar..."
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            maxLength={500}
            disabled={isBioPending}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">{bioText.length}/500</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingBio(false)}
                disabled={isBioPending}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-text-muted hover:text-text-body transition-colors"
              >
                <X size={12} aria-hidden="true" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBioSave}
                disabled={isBioPending}
                className={cn(
                  "flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium",
                  "bg-brand-primary text-white hover:bg-brand-primary/80",
                  "transition-colors disabled:opacity-50"
                )}
              >
                <Check size={12} aria-hidden="true" />
                {isBioPending ? "Salvando..." : "Salvar bio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback de ação */}
      {feedback && (
        <div
          className={cn(
            "rounded-md px-4 py-2 text-sm border",
            feedback.type === "success"
              ? "bg-success/10 text-success border-success/20"
              : "bg-error/10 text-error border-error/20"
          )}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
