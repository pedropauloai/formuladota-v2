"use client";

// StudentRow — card horizontal de aluno no painel PRO.
//
// Client Component: gerencia modais (coach note + ver perfil) e
// transições de estado local (loading dos botões).
//
// Validações de scope acontecem nas Server Actions — aqui apenas UI.

import { useState, useTransition } from "react";
import { UserPlus, MessageSquarePlus, ThumbsUp, ThumbsDown, ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { addCoachNote, recommendPromotion } from "@/app/pro/actions";
import type { StudentSummary } from "@/app/pro/actions";

// ---------------------------------------------------------------------------
// Sub-componente: modal simples de confirmação com textarea
// ---------------------------------------------------------------------------

interface ConfirmModalProps {
  title: string;
  placeholder: string;
  minLength: number;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
  confirmLabel: string;
  confirmVariant?: "positive" | "negative" | "neutral";
}

function ConfirmModal({
  title,
  placeholder,
  minLength,
  onConfirm,
  onCancel,
  loading,
  confirmLabel,
  confirmVariant = "neutral",
}: ConfirmModalProps) {
  const [text, setText] = useState("");

  const buttonClass = cn(
    "rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    confirmVariant === "positive" && "bg-success text-white hover:bg-success/80",
    confirmVariant === "negative" && "bg-error text-white hover:bg-error/80",
    confirmVariant === "neutral" && "bg-brand-primary text-white hover:bg-brand-primary/80"
  );

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-elevated p-6 shadow-2xl">
        <h3 className="font-display text-base uppercase tracking-widest text-text-display mb-4">
          {title}
        </h3>

        <textarea
          className={cn(
            "w-full rounded-lg border border-border-subtle bg-bg-base",
            "p-3 text-sm text-text-body placeholder:text-text-muted",
            "resize-none focus:outline-none focus:ring-1 focus:ring-brand-primary/50",
            "min-h-[100px]"
          )}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />

        <p className="mt-1 text-xs text-text-muted">
          {text.length}/{minLength} caracteres mínimos
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md px-4 py-2 text-sm text-text-muted hover:text-text-body transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(text)}
            disabled={loading || text.length < minLength}
            className={buttonClass}
          >
            {loading ? "Salvando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal: StudentRow
// ---------------------------------------------------------------------------

interface StudentRowProps {
  student: StudentSummary;
  /** Callback após ação bem-sucedida (para revalidar lista) */
  onActionSuccess?: () => void;
}

/**
 * Card horizontal de aluno no painel PRO.
 *
 * Exibe: avatar + nome + métricas (partidas, última partida, strikes).
 * Botões inline: Coach Note +5 / -5 / Recomendar promoção.
 * Link para detalhe: /pro/students/[id].
 */
export function StudentRow({ student, onActionSuccess }: StudentRowProps) {
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<
    "note-positive" | "note-negative" | "recommend" | null
  >(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const initials = (student.username ?? "?").slice(0, 2).toUpperCase();

  // Formata data relativa simples (ex: "há 3 dias")
  function formatRelative(dateStr: string | null): string {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "hoje";
    if (days === 1) return "ontem";
    if (days < 30) return `há ${days} dias`;
    const months = Math.floor(days / 30);
    return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  }

  function handleCoachNote(delta: 5 | -5, reason: string) {
    startTransition(async () => {
      const result = await addCoachNote({
        studentUserId: student.userId,
        delta,
        reason,
      });

      setModal(null);
      if (result.success) {
        setFeedback({ type: "success", message: "Nota registrada com sucesso." });
        onActionSuccess?.();
      } else {
        setFeedback({ type: "error", message: result.error ?? "Erro desconhecido." });
      }

      // Limpa feedback após 4s
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  function handleRecommend(justification: string) {
    startTransition(async () => {
      const result = await recommendPromotion(student.userId, justification);

      setModal(null);
      if (result.success) {
        setFeedback({ type: "success", message: "Recomendação enviada para Pedro." });
        onActionSuccess?.();
      } else {
        setFeedback({ type: "error", message: result.error ?? "Erro desconhecido." });
      }

      setTimeout(() => setFeedback(null), 4000);
    });
  }

  return (
    <>
      {/* Card principal */}
      <div
        className={cn(
          "relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          "rounded-xl border border-border-subtle bg-bg-elevated p-4",
          "transition-colors hover:border-border-primary/30"
        )}
      >
        {/* Esquerda: identidade do aluno */}
        <div className="flex items-center gap-3">
          <UserAvatar
            src={student.avatarUrl ?? undefined}
            alt={`Avatar de ${student.username ?? "Aluno"}`}
            fallback={initials}
            size="md"
          />

          <div className="flex flex-col">
            <span className="font-display text-sm font-semibold text-text-display">
              {student.username ?? "Aluno Anônimo"}
            </span>

            {/* Métricas inline */}
            <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
              <span>{student.totalMatches} PTs</span>
              <span>Ultima: {formatRelative(student.lastMatchAt)}</span>
              {student.strikeCount > 0 && (
                <span className="text-warning">
                  {student.strikeCount} strike{student.strikeCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Direita: ações */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Coach Note positivo */}
          <button
            type="button"
            onClick={() => setModal("note-positive")}
            disabled={isPending}
            title="Coach Note +5 Honor"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
              "bg-success/10 text-success border border-success/20",
              "hover:bg-success/20 transition-colors disabled:opacity-50"
            )}
          >
            <ThumbsUp size={12} aria-hidden="true" />
            +5
          </button>

          {/* Coach Note negativo */}
          <button
            type="button"
            onClick={() => setModal("note-negative")}
            disabled={isPending}
            title="Coach Note -5 Honor"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
              "bg-error/10 text-error border border-error/20",
              "hover:bg-error/20 transition-colors disabled:opacity-50"
            )}
          >
            <ThumbsDown size={12} aria-hidden="true" />
            -5
          </button>

          {/* Recomendar para promoção */}
          <button
            type="button"
            onClick={() => setModal("recommend")}
            disabled={isPending}
            title="Recomendar para promoção PRO"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
              "bg-brand-primary/10 text-brand-primary border border-brand-primary/20",
              "hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
            )}
          >
            <UserPlus size={12} aria-hidden="true" />
            Recomendar
          </button>

          {/* Ver perfil */}
          <a
            href={`/pro/students/${student.userId}`}
            className={cn(
              "flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium",
              "text-text-muted hover:text-text-body bg-bg-base border border-border-subtle",
              "hover:border-border-primary/30 transition-colors"
            )}
          >
            <MessageSquarePlus size={12} aria-hidden="true" />
            Ver perfil
            <ChevronRight size={12} aria-hidden="true" />
          </a>
        </div>

        {/* Feedback inline */}
        {feedback && (
          <div
            className={cn(
              "absolute bottom-2 right-4 text-xs px-3 py-1 rounded-full border",
              feedback.type === "success"
                ? "bg-success/10 text-success border-success/20"
                : "bg-error/10 text-error border-error/20"
            )}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Modais */}
      {modal === "note-positive" && (
        <ConfirmModal
          title="Coach Note +5 Honor"
          placeholder="Descreva o motivo do elogio (comportamento exemplar, ajuda ao time, etc.)..."
          minLength={10}
          onConfirm={(reason) => handleCoachNote(5, reason)}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel="Confirmar +5"
          confirmVariant="positive"
        />
      )}

      {modal === "note-negative" && (
        <ConfirmModal
          title="Coach Note -5 Honor"
          placeholder="Descreva o motivo da penalidade (comportamento inadequado, postura negativa, etc.)..."
          minLength={10}
          onConfirm={(reason) => handleCoachNote(-5, reason)}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel="Confirmar -5"
          confirmVariant="negative"
        />
      )}

      {modal === "recommend" && (
        <ConfirmModal
          title="Recomendar para Promoção PRO"
          placeholder="Justifique a recomendação — histórico de comportamento, partidas, contribuição à comunidade (mínimo 30 caracteres)..."
          minLength={30}
          onConfirm={(justification) => handleRecommend(justification)}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel="Enviar Recomendação"
          confirmVariant="neutral"
        />
      )}
    </>
  );
}
