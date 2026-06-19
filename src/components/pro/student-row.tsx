"use client";

// StudentRow — card horizontal de aluno no painel PRO.
//
// Client Component: gerencia modais (coach note + ver perfil) e
// transições de estado local (loading dos botões).
//
// Validações de scope acontecem nas Server Actions — aqui apenas UI.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("proCockpit");
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

        <p className="mt-1 text-sm text-text-muted">
          {t("minChars", { current: text.length, min: minLength })}
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md px-4 py-2 text-sm text-text-muted hover:text-text-body transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(text)}
            disabled={loading || text.length < minLength}
            className={buttonClass}
          >
            {loading ? t("saving") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper externo: formata data relativa simples (ex: "há 3 dias")
// Mantido fora do componente para evitar Date.now() impure em render context
// ---------------------------------------------------------------------------

function formatRelative(
  dateStr: string | null,
  t: (key: string, values?: Record<string, string | number>) => string
): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return t("relativeToday");
  if (days === 1) return t("relativeYesterday");
  if (days < 30) return t("relativeDays", { count: days });
  const months = Math.floor(days / 30);
  return t("relativeMonths", { count: months });
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
  const t = useTranslations("proCockpit");
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<
    "note-positive" | "note-negative" | "recommend" | null
  >(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const initials = (student.username ?? "?").slice(0, 2).toUpperCase();

  function handleCoachNote(delta: 5 | -5, reason: string) {
    startTransition(async () => {
      const result = await addCoachNote({
        studentUserId: student.userId,
        delta,
        reason,
      });

      setModal(null);
      if (result.success) {
        setFeedback({ type: "success", message: t("noteRegisteredSuccess") });
        onActionSuccess?.();
      } else {
        setFeedback({ type: "error", message: result.error ?? t("unknownError") });
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
        setFeedback({ type: "success", message: t("recommendationSent") });
        onActionSuccess?.();
      } else {
        setFeedback({ type: "error", message: result.error ?? t("unknownError") });
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
            alt={t("avatarAlt", { name: student.username ?? t("student") })}
            fallback={initials}
            size="md"
          />

          <div className="flex flex-col">
            <span className="font-display text-sm font-semibold text-text-display">
              {student.username ?? t("anonymousStudent")}
            </span>

            {/* Métricas inline */}
            <div className="flex items-center gap-3 mt-0.5 text-sm text-text-muted">
              <span>{t("ptsCount", { count: student.totalMatches })}</span>
              <span>{t("lastMatch", { value: formatRelative(student.lastMatchAt, t) })}</span>
              {student.strikeCount > 0 && (
                <span className="text-warning">
                  {t("strikesCount", { count: student.strikeCount })}
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
            title={t("coachNotePlusHonor")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
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
            title={t("coachNoteMinusHonor")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
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
            title={t("recommendForPromotionTitle")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              "bg-brand-primary/10 text-brand-primary border border-brand-primary/20",
              "hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
            )}
          >
            <UserPlus size={12} aria-hidden="true" />
            {t("recommend")}
          </button>

          {/* Ver perfil */}
          <a
            href={`/pro/students/${student.userId}`}
            className={cn(
              "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium",
              "text-text-muted hover:text-text-body bg-bg-base border border-border-subtle",
              "hover:border-border-primary/30 transition-colors"
            )}
          >
            <MessageSquarePlus size={12} aria-hidden="true" />
            {t("viewProfile")}
            <ChevronRight size={12} aria-hidden="true" />
          </a>
        </div>

        {/* Feedback inline */}
        {feedback && (
          <div
            className={cn(
              "absolute bottom-2 right-4 text-sm px-3 py-1 rounded-full border",
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
          title={t("coachNotePlusHonor")}
          placeholder={t("notePositivePlaceholderRow")}
          minLength={10}
          onConfirm={(reason) => handleCoachNote(5, reason)}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel={t("confirmPlus")}
          confirmVariant="positive"
        />
      )}

      {modal === "note-negative" && (
        <ConfirmModal
          title={t("coachNoteMinusHonor")}
          placeholder={t("noteNegativePlaceholderRow")}
          minLength={10}
          onConfirm={(reason) => handleCoachNote(-5, reason)}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel={t("confirmMinus")}
          confirmVariant="negative"
        />
      )}

      {modal === "recommend" && (
        <ConfirmModal
          title={t("recommendForPromotionTitle")}
          placeholder={t("recommendPlaceholderRow")}
          minLength={30}
          onConfirm={(justification) => handleRecommend(justification)}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel={t("sendRecommendation")}
          confirmVariant="neutral"
        />
      )}
    </>
  );
}
