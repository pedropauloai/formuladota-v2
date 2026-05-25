"use client";

// StudentDetailClient — ações client-side no detalhe de aluno.
//
// Botões coach note +5/-5 e recomendar promoção.
// Chama Server Actions e faz router.refresh() após sucesso.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCoachNote, recommendPromotion } from "@/app/pro/actions";

interface StudentDetailClientProps {
  studentId: string;
  studentName: string;
}

/** Modal de confirmação com textarea para motivo/justificativa */
function ConfirmModal({
  title,
  placeholder,
  minLength,
  onConfirm,
  onCancel,
  loading,
  confirmLabel,
  confirmVariant,
}: {
  title: string;
  placeholder: string;
  minLength: number;
  onConfirm: (text: string) => void;
  onCancel: () => void;
  loading: boolean;
  confirmLabel: string;
  confirmVariant: "positive" | "negative" | "neutral";
}) {
  const [text, setText] = useState("");

  const btnClass = cn(
    "rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
    confirmVariant === "positive" && "bg-success text-white hover:bg-success/80",
    confirmVariant === "negative" && "bg-error text-white hover:bg-error/80",
    confirmVariant === "neutral" && "bg-brand-primary text-white hover:bg-brand-primary/80"
  );

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
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
          {text.length}/{minLength} mínimo
        </p>
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md px-4 py-2 text-sm text-text-muted hover:text-text-body transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(text)}
            disabled={loading || text.length < minLength}
            className={btnClass}
          >
            {loading ? "Salvando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Ações interativas no detalhe do aluno:
 * Coach Note +5, -5, Recomendar promoção.
 */
export function StudentDetailClient({
  studentId,
  studentName,
}: StudentDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<
    "note-positive" | "note-negative" | "recommend" | null
  >(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleCoachNote(delta: 5 | -5, reason: string) {
    startTransition(async () => {
      const result = await addCoachNote({
        studentUserId: studentId,
        delta,
        reason,
      });
      setModal(null);
      if (result.success) {
        showFeedback("success", `Honor ${delta > 0 ? "+5" : "-5"} registrado para ${studentName}.`);
        router.refresh();
      } else {
        showFeedback("error", result.error ?? "Erro ao registrar nota.");
      }
    });
  }

  function handleRecommend(justification: string) {
    startTransition(async () => {
      const result = await recommendPromotion(studentId, justification);
      setModal(null);
      if (result.success) {
        showFeedback("success", "Recomendação enviada para Pedro.");
        router.refresh();
      } else {
        showFeedback("error", result.error ?? "Erro ao enviar recomendação.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setModal("note-positive")}
          disabled={isPending}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            "bg-success/10 text-success border border-success/20",
            "hover:bg-success/20 transition-colors disabled:opacity-50"
          )}
        >
          <ThumbsUp size={14} aria-hidden="true" />
          Coach Note +5
        </button>

        <button
          type="button"
          onClick={() => setModal("note-negative")}
          disabled={isPending}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            "bg-error/10 text-error border border-error/20",
            "hover:bg-error/20 transition-colors disabled:opacity-50"
          )}
        >
          <ThumbsDown size={14} aria-hidden="true" />
          Coach Note -5
        </button>

        <button
          type="button"
          onClick={() => setModal("recommend")}
          disabled={isPending}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            "bg-brand-primary/10 text-brand-primary border border-brand-primary/20",
            "hover:bg-brand-primary/20 transition-colors disabled:opacity-50"
          )}
        >
          <UserPlus size={14} aria-hidden="true" />
          Recomendar para PRO
        </button>
      </div>

      {feedback && (
        <div
          className={cn(
            "mt-3 rounded-md px-4 py-2 text-sm border",
            feedback.type === "success"
              ? "bg-success/10 text-success border-success/20"
              : "bg-error/10 text-error border-error/20"
          )}
        >
          {feedback.message}
        </div>
      )}

      {modal === "note-positive" && (
        <ConfirmModal
          title={`Coach Note +5 — ${studentName}`}
          placeholder="Descreva o comportamento positivo observado..."
          minLength={10}
          onConfirm={(r) => handleCoachNote(5, r)}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel="Confirmar +5"
          confirmVariant="positive"
        />
      )}

      {modal === "note-negative" && (
        <ConfirmModal
          title={`Coach Note -5 — ${studentName}`}
          placeholder="Descreva o comportamento inadequado observado..."
          minLength={10}
          onConfirm={(r) => handleCoachNote(-5, r)}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel="Confirmar -5"
          confirmVariant="negative"
        />
      )}

      {modal === "recommend" && (
        <ConfirmModal
          title={`Recomendar ${studentName} para PRO`}
          placeholder="Justifique a recomendação: histórico, conduta, contribuição à comunidade FormulaDota (mínimo 30 caracteres)..."
          minLength={30}
          onConfirm={handleRecommend}
          onCancel={() => setModal(null)}
          loading={isPending}
          confirmLabel="Enviar Recomendação"
          confirmVariant="neutral"
        />
      )}
    </>
  );
}
