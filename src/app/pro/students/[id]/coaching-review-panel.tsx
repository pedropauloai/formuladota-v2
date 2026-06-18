"use client";

// Painel do PRO pra escrever a análise de coaching de um aluno (sessão coachada).
// Form recolhível: resumo (obrigatório) + pontos fortes + a melhorar + nota 1-5.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { submitCoachingReview } from "@/app/pro/coaching-reviews-actions";

const textareaCls =
  "w-full rounded-md border border-border-subtle bg-bg-base px-3 py-2 font-body text-sm text-text-body placeholder:text-text-faded focus:border-brand-primary focus:outline-none resize-none";

export function CoachingReviewPanel({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [rating, setRating] = useState(0);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (summary.trim().length === 0) {
      toast({ type: "error", title: "Escreva o resumo da análise." });
      return;
    }
    startTransition(async () => {
      const r = await submitCoachingReview({
        studentUserId: studentId,
        summary,
        strengths: strengths || undefined,
        improvements: improvements || undefined,
        rating: rating || undefined,
      });
      if (!r.success) {
        toast({ type: "error", title: r.error });
        return;
      }
      toast({ type: "success", title: "Análise salva." });
      setSummary("");
      setStrengths("");
      setImprovements("");
      setRating(0);
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <MessageSquarePlus size={14} aria-hidden="true" /> Escrever análise de coaching
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4 space-y-3">
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-body">
        Análise de {studentName}
      </p>

      <textarea
        rows={3}
        maxLength={2000}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Resumo do desempenho na sessão (obrigatório)…"
        className={textareaCls}
      />
      <textarea
        rows={2}
        maxLength={1000}
        value={strengths}
        onChange={(e) => setStrengths(e.target.value)}
        placeholder="Pontos fortes (opcional)…"
        className={textareaCls}
      />
      <textarea
        rows={2}
        maxLength={1000}
        value={improvements}
        onChange={(e) => setImprovements(e.target.value)}
        placeholder="A melhorar (opcional)…"
        className={textareaCls}
      />

      <div className="flex items-center gap-3">
        <span className="font-display text-xs font-semibold uppercase tracking-wide text-text-faded">
          Nota
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(rating === i + 1 ? 0 : i + 1)}
              aria-label={`Nota ${i + 1}`}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={18}
                className={i < rating ? "text-gold fill-current" : "text-text-faded"}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={submit} disabled={isPending}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Salvar análise
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
