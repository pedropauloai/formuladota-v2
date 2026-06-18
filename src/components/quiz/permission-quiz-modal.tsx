"use client";

// PermissionQuizModal — pop-up de perguntas disparado quando o usuário tenta jogar
// (busca / lobby / ranked-com-pro) sem permissão. Responder ACERTANDO 5 perguntas libera
// 1 permissão de partida (ver memory/project_match_permissions). Estilo Duolingo: errou →
// o Mestre explica → a MESMA pergunta repete até acertar (Pedro: "explica e exige acertar").
//
// A correção é validada NO SERVIDOR (recordDoctrineAnswer); o cliente nunca decide o que
// conta. Ao receber permissions >= 1 do servidor, libera e chama onGranted.

import { useState, useEffect, useCallback } from "react";
import { Check, X, ArrowRight, Loader2, ShieldQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QUIZ_QUESTIONS } from "@/lib/quiz/questions";
import type { QuizQuestion } from "@/lib/quiz/types";
import { recordDoctrineAnswer, getDoctrineProgress } from "@/app/doutrina/actions";
import { QUESTIONS_PER_PERMISSION } from "@/lib/quiz/permissions";

interface Props {
  open: boolean;
  /** Texto curto do que o usuário ia fazer, ex: "entrar na fila do PRO". */
  modalidade: string;
  onClose: () => void;
  /** Chamado quando o usuário ganha 1 permissão (5 acertos). */
  onGranted: () => void;
}

export function PermissionQuizModal({ open, modalidade, onClose, onGranted }: Props) {
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [granted, setGranted] = useState(false);

  // Carrega o progresso atual ao abrir e monta a fila das próximas não-respondidas.
  useEffect(() => {
    if (!open) return;
    let active = true;
    // setState dentro do async (não no corpo direto do effect) — reseta e carrega o
    // progresso ao abrir. `active` evita setState após fechar/desmontar.
    void (async () => {
      setLoading(true);
      setGranted(false);
      setChosen(null);
      try {
        const p = await getDoctrineProgress();
        if (!active) return;
        const answered = new Set(p.answeredIds);
        setAnsweredCount(p.answeredCount);
        setPendingIds(
          QUIZ_QUESTIONS.filter((q) => !answered.has(q.id)).map((q) => q.id)
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  const current: QuizQuestion | undefined = QUIZ_QUESTIONS.find(
    (q) => q.id === pendingIds[0]
  );
  const correctId = current?.options.find((o) => o.correct)?.id;
  const gotIt = chosen != null && chosen === correctId;
  const answered = chosen != null;

  // Quantos acertos faltam pra fechar o ciclo de 5 (a próxima permissão).
  const inCycle = answeredCount % QUESTIONS_PER_PERMISSION;
  const towardNext = inCycle; // 0..4 já feitos no ciclo atual

  const advance = useCallback(async () => {
    if (!current || chosen == null || saving) return;

    if (chosen !== correctId) {
      // Errou — repete a mesma questão (exige acertar).
      setChosen(null);
      return;
    }

    setSaving(true);
    const res = await recordDoctrineAnswer(current.id, chosen);
    setSaving(false);
    setChosen(null);

    if (res.ok) {
      setAnsweredCount(res.answeredCount);
      setPendingIds((prev) => prev.slice(1));
      if (res.permissions >= 1 || res.doctrinated) {
        setGranted(true);
      }
    } else {
      // Falha de rede/servidor — só repete a questão.
      setPendingIds((prev) => prev);
    }
  }, [current, chosen, correctId, saving]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Responda pra liberar a partida"
    >
      <div className="relative w-full max-w-lg rounded-[var(--radius-lg)] border border-brand-primary/40 bg-bg-deep/95 p-6 shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.25em] text-brand-primary">
              <ShieldQuestion size={16} aria-hidden="true" />
              Responda pra jogar
            </p>
            <p className="font-body text-sm text-text-muted">
              Acerte {QUESTIONS_PER_PERMISSION} perguntas pra liberar 1 partida
              e {modalidade}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-sm p-1 text-text-faded hover:bg-bg-elevated hover:text-text-body transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Progresso do ciclo (X / 5) */}
        {!granted && (
          <div className="mb-5 flex items-center gap-2" aria-hidden="true">
            {Array.from({ length: QUESTIONS_PER_PERMISSION }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i < towardNext ? "bg-brand-primary" : "bg-bg-elevated"
                )}
                style={
                  i < towardNext
                    ? { boxShadow: "0 0 8px var(--color-brand-primary-glow)" }
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-muted">
            <Loader2 size={24} className="animate-spin" aria-hidden="true" />
          </div>
        ) : granted ? (
          <GrantedView modalidade={modalidade} onGranted={onGranted} />
        ) : !current ? (
          <div className="py-10 text-center">
            <p className="font-body text-text-muted">
              Você já respondeu todas as perguntas disponíveis. Acesso liberado.
            </p>
            <div className="mt-5 flex justify-end">
              <Button variant="primary" size="md" onClick={onGranted}>
                Continuar <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <article className="space-y-5">
            <h2 className="font-display text-lg font-bold leading-snug tracking-wide text-text-display">
              {current.prompt}
            </h2>

            <ul className="space-y-2.5" role="list">
              {current.options.map((opt) => {
                const isCorrect = opt.id === correctId;
                const isChosen = opt.id === chosen;
                const stateClass = !answered
                  ? "border-border-subtle bg-bg-elevated hover:border-brand-primary"
                  : isCorrect
                    ? "border-play-primary bg-play-primary/10"
                    : isChosen
                      ? "border-error bg-error/10"
                      : "border-border-subtle bg-bg-elevated opacity-60";
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      disabled={answered || saving}
                      onClick={() => setChosen(opt.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[var(--radius-md)] border-2 p-3 text-left transition-colors disabled:cursor-default",
                        stateClass
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm font-mono text-sm font-bold uppercase",
                          answered && isCorrect
                            ? "bg-play-primary text-text-display"
                            : answered && isChosen
                              ? "bg-error text-text-display"
                              : "bg-bg-surface text-text-muted"
                        )}
                      >
                        {answered && isCorrect ? (
                          <Check size={12} />
                        ) : answered && isChosen ? (
                          <X size={12} />
                        ) : (
                          opt.id
                        )}
                      </span>
                      <span className="font-body text-sm leading-relaxed text-text-body">
                        {opt.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {answered && (
              <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/60 p-3 animate-in fade-in duration-200">
                <p
                  className={cn(
                    "mb-1 font-display text-sm font-bold uppercase tracking-widest",
                    gotIt ? "text-play-primary" : "text-error"
                  )}
                >
                  {gotIt ? "Certo." : "O Mestre corrige."}
                </p>
                <p className="font-body text-sm leading-relaxed text-text-body">
                  {current.rationale}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              {answered && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={advance}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : gotIt ? (
                    <>
                      Continuar <ArrowRight size={16} />
                    </>
                  ) : (
                    "Tentar de novo"
                  )}
                </Button>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

function GrantedView({
  modalidade,
  onGranted,
}: {
  modalidade: string;
  onGranted: () => void;
}) {
  return (
    <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-2 border-play-primary bg-play-primary/10">
        <Sparkles size={26} className="text-play-primary" aria-hidden="true" />
      </div>
      <h2 className="font-display text-2xl font-bold tracking-wide text-text-display">
        Permissão liberada
      </h2>
      <p className="mx-auto mt-2 max-w-sm font-body text-sm leading-relaxed text-text-muted">
        Você ganhou 1 permissão de partida. Pode {modalidade} agora.
      </p>
      <div className="mt-6 flex justify-center">
        <Button variant="cinematic" size="lg" onClick={onGranted}>
          Jogar agora <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
