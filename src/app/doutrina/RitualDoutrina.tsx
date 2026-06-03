"use client";

// Ritual de Doutrinacao (niveis 0->6). NAO e uma prova — e uma iniciacao.
// O Mestre apresenta situacoes; cada resposta ENSINA (a justificativa e o ensino,
// nao a nota). Errar nao reprova: a questao volta no fim do capitulo ate ser
// compreendida. Ao completar, o aluno alcanca o nivel 6 = Aprendiz = doutrinado.
// Ver docs/foundations/PROGRESSION_PUBLIC.md e PRODUCT_CORE.md (voz Mestre + Guardiao).
//
// Persistencia: localStorage via useSyncExternalStore (MVP pra Pedro revisar). A
// versao final liga no sistema de XP/niveis no banco (migration — pendente aprovacao).

import { useMemo, useState } from "react";
import { m } from "motion/react";
import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";
import { QUIZ_QUESTIONS } from "@/lib/quiz/questions";
import {
  QUIZ_CHAPTERS,
  type QuizChapter,
  type QuizQuestion,
  type QuizSection,
} from "@/lib/quiz/types";
import { recordDoctrineAnswer } from "./actions";

const TOTAL = QUIZ_QUESTIONS.length;

const ORDERED_CHAPTERS: QuizChapter[] = [...QUIZ_CHAPTERS].sort(
  (a, b) => a.order - b.order,
);

function questionsOf(section: QuizSection): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((q) => q.section === section);
}

type View = "intro" | "question" | "chapterDone" | "complete";

interface RitualDoutrinaProps {
  /** IDs ja respondidos corretamente (vindos do servidor — resume cross-device). */
  initialAnsweredIds: string[];
  /** Se o usuario ja completou a doutrina (nivel 6). */
  initialDoctrinated: boolean;
}

export function RitualDoutrina({
  initialAnsweredIds,
  initialDoctrinated,
}: RitualDoutrinaProps) {
  // Progresso vem do servidor (props) — sem localStorage. Cada acerto persiste
  // via recordDoctrineAnswer (otimista; o servidor e a fonte de verdade no reload).
  const [correctIds, setCorrectIds] = useState<Set<string>>(
    () => new Set(initialAnsweredIds),
  );

  const [view, setView] = useState<View>("intro");
  const [chapterPos, setChapterPos] = useState(0);
  // Fila de ids do capitulo atual ainda nao dominados (re-enfileira ao errar).
  const [queue, setQueue] = useState<string[]>([]);
  // Opcao escolhida na questao atual — null = ainda respondendo; set = modo feedback.
  const [chosen, setChosen] = useState<string | null>(null);

  const done = correctIds.size;
  const pct = Math.round((done / TOTAL) * 100);

  // Proximo capitulo (a partir de `pos`) com questoes pendentes. pos = -1 se acabou.
  function buildFrom(
    pos: number,
    solved: Set<string>,
  ): { pos: number; queue: string[] } {
    for (let i = pos; i < ORDERED_CHAPTERS.length; i++) {
      const ch = ORDERED_CHAPTERS[i];
      if (!ch) continue;
      const pending = questionsOf(ch.section)
        .filter((q) => !solved.has(q.id))
        .map((q) => q.id);
      if (pending.length > 0) return { pos: i, queue: pending };
    }
    return { pos: -1, queue: [] };
  }

  function start() {
    const { pos, queue: q } = buildFrom(0, correctIds);
    if (pos === -1) {
      setView("complete");
      return;
    }
    setChapterPos(pos);
    setQueue(q);
    setChosen(null);
    setView("question");
  }

  const currentChapter = ORDERED_CHAPTERS[chapterPos];
  const currentId = queue[0];
  const current = useMemo(
    () => QUIZ_QUESTIONS.find((q) => q.id === currentId),
    [currentId],
  );

  function answer(optionId: string) {
    if (chosen) return; // ja respondeu; aguardando "continuar"
    setChosen(optionId);
  }

  function advance() {
    if (!current || !chosen) return;
    const correctOption = current.options.find((o) => o.correct);
    const gotIt = correctOption?.id === chosen;

    const nextQueue = queue.slice();
    nextQueue.shift();
    if (gotIt) {
      // Otimista: marca local na hora + persiste no servidor (fonte de verdade no reload).
      const id = current.id;
      setCorrectIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      void recordDoctrineAnswer(id, chosen).catch(() => {});
    } else {
      nextQueue.push(current.id); // errou — re-encontro no fim do capitulo
    }

    setChosen(null);

    if (nextQueue.length === 0) {
      const nextPos = chapterPos + 1;
      setQueue([]);
      if (nextPos >= ORDERED_CHAPTERS.length) {
        setView("complete");
      } else {
        setChapterPos(nextPos);
        setView("chapterDone");
      }
    } else {
      setQueue(nextQueue);
    }
  }

  function continueToNextChapter() {
    const { pos, queue: q } = buildFrom(chapterPos, correctIds);
    if (pos === -1) {
      setView("complete");
      return;
    }
    setChapterPos(pos);
    setQueue(q);
    setChosen(null);
    setView("question");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <RitualHeader done={done} pct={pct} />

      <div className="flex flex-1 flex-col justify-center py-10">
        {view === "intro" && (
          <IntroView
            resuming={done > 0 && done < TOTAL && !initialDoctrinated}
            completed={done >= TOTAL || initialDoctrinated}
            onStart={start}
            onSeeMedal={() => setView("complete")}
          />
        )}

        {view === "question" && current && currentChapter && (
          <m.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATIONS.hero, ease: EASINGS.softLanding }}
          >
            <QuestionView
              chapter={currentChapter}
              chapterNumber={chapterPos + 1}
              chapterTotal={ORDERED_CHAPTERS.length}
              question={current}
              chosen={chosen}
              onAnswer={answer}
              onContinue={advance}
            />
          </m.div>
        )}

        {view === "chapterDone" && (
          <ChapterDoneView
            justFinished={ORDERED_CHAPTERS[chapterPos - 1]}
            onContinue={continueToNextChapter}
          />
        )}

        {view === "complete" && <CompleteView />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header + barra de XP rumo ao nivel 6                                */
/* ------------------------------------------------------------------ */

function RitualHeader({ done, pct }: { done: number; pct: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Ritual de Doutrinação
        </span>
        <span className="font-display text-sm font-semibold text-text-body">
          {done} / {TOTAL} · rumo ao nível 6
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso rumo ao nível 6 (Aprendiz)"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated"
      >
        <div
          className="h-full bg-brand-primary transition-all duration-500"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 12px var(--color-brand-primary-glow)",
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Intro                                                               */
/* ------------------------------------------------------------------ */

function IntroView({
  resuming,
  completed,
  onStart,
  onSeeMedal,
}: {
  resuming: boolean;
  completed: boolean;
  onStart: () => void;
  onSeeMedal: () => void;
}) {
  return (
    <article className="space-y-8 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary">
        Antes de jogar, você aprende
      </p>
      <h1 className="font-display text-4xl font-bold leading-tight tracking-wide text-text-display md:text-5xl">
        O Mestre vai te{" "}
        <span
          className="text-brand-primary"
          style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
        >
          questionar
        </span>
        .
      </h1>
      <p className="mx-auto max-w-xl font-body text-lg leading-relaxed text-text-muted">
        Não é uma prova — é uma iniciação. A cada situação, você decide. A cada
        resposta, o Mestre te ensina. Errar não reprova; faz a questão voltar até
        você compreender. Ao final, você alcança o{" "}
        <strong className="text-text-body">nível 6 — Aprendiz</strong>, e o
        ambiente se abre.
      </p>

      <div className="flex flex-col items-center gap-3 pt-4">
        {completed ? (
          <Button variant="primary" size="lg" onClick={onSeeMedal}>
            Ver minha medalha <ArrowRight size={18} />
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={onStart}>
            {resuming ? "Continuar o ritual" : "Começar o ritual"}{" "}
            <ArrowRight size={18} />
          </Button>
        )}
        {resuming && (
          <span className="font-display text-sm text-text-faded">
            Seu progresso fica salvo — pode sair e voltar quando quiser.
          </span>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Questao + feedback-ensino                                           */
/* ------------------------------------------------------------------ */

function QuestionView({
  chapter,
  chapterNumber,
  chapterTotal,
  question,
  chosen,
  onAnswer,
  onContinue,
}: {
  chapter: QuizChapter;
  chapterNumber: number;
  chapterTotal: number;
  question: QuizQuestion;
  chosen: string | null;
  onAnswer: (optionId: string) => void;
  onContinue: () => void;
}) {
  const correctId = question.options.find((o) => o.correct)?.id;
  const gotIt = chosen != null && chosen === correctId;
  const answered = chosen != null;

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Capítulo {chapterNumber}/{chapterTotal} · {chapter.title}
        </p>
        <h2 className="font-display text-xl font-bold leading-snug tracking-wide text-text-display md:text-2xl">
          {question.prompt}
        </h2>
      </header>

      <ul className="space-y-3" role="list">
        {question.options.map((opt) => {
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
                disabled={answered}
                onClick={() => onAnswer(opt.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[var(--radius-lg)] border-2 p-4 text-left transition-colors",
                  "disabled:cursor-default",
                  stateClass,
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm font-mono text-sm font-bold uppercase",
                    answered && isCorrect
                      ? "bg-play-primary text-text-display"
                      : answered && isChosen
                        ? "bg-error text-text-display"
                        : "bg-bg-surface text-text-muted",
                  )}
                >
                  {answered && isCorrect ? (
                    <Check size={14} />
                  ) : answered && isChosen ? (
                    <X size={14} />
                  ) : (
                    opt.id
                  )}
                </span>
                <span className="font-body text-base leading-relaxed text-text-body">
                  {opt.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATIONS.hero, ease: EASINGS.softLanding }}
        >
          <Card variant="elevated">
            <CardContent className="space-y-3">
              <p
                className={cn(
                  "font-display text-sm font-bold uppercase tracking-widest",
                  gotIt ? "text-play-primary" : "text-error",
                )}
              >
                {gotIt ? "Certo." : "O Mestre corrige."}
              </p>
              <p className="font-body text-base leading-relaxed text-text-body">
                {question.rationale}
              </p>
              <p className="font-display text-sm font-semibold text-text-faded">
                {question.origin}
                {!gotIt && " · esta questão volta mais tarde."}
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-5">
            <Button variant="primary" size="md" onClick={onContinue}>
              Continuar <ArrowRight size={18} />
            </Button>
          </div>
        </m.div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Capitulo concluido                                                  */
/* ------------------------------------------------------------------ */

function ChapterDoneView({
  justFinished,
  onContinue,
}: {
  justFinished?: QuizChapter;
  onContinue: () => void;
}) {
  return (
    <m.article
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATIONS.hero, ease: EASINGS.softLanding }}
      className="space-y-6 text-center"
    >
      <p className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-play-primary">
        Capítulo dominado
      </p>
      <h2 className="font-display text-3xl font-bold tracking-wide text-text-display">
        {justFinished?.title ?? "Capítulo concluído"}
      </h2>
      <p className="mx-auto max-w-md font-body text-base leading-relaxed text-text-muted">
        Você compreendeu este trecho da Fórmula. O próximo te espera.
      </p>
      <div className="flex justify-center pt-2">
        <Button variant="primary" size="lg" onClick={onContinue}>
          Próximo capítulo <ArrowRight size={18} />
        </Button>
      </div>
    </m.article>
  );
}

/* ------------------------------------------------------------------ */
/* Conclusao — reveal da medalha Aprendiz                              */
/* ------------------------------------------------------------------ */

function CompleteView() {
  return (
    <m.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATIONS.hero, ease: EASINGS.softLanding }}
      className="space-y-8 text-center"
    >
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 0.15,
          duration: DURATIONS.hero,
          ease: EASINGS.softLanding,
        }}
        className="flex justify-center"
      >
        <HonorRankMedal rank="aprendiz" size="xl" showLabel glow />
      </m.div>

      <div className="space-y-3">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary">
          Nível 6 alcançado
        </p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-text-display">
          Você está{" "}
          <span
            className="text-brand-primary"
            style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
          >
            doutrinado
          </span>
          .
        </h1>
        <p className="mx-auto max-w-xl font-body text-lg leading-relaxed text-text-muted">
          Você provou que conhece a cultura da Fórmula. O lobby livre está aberto.
          Daqui pra cima, quem te leva mais alto não é o quiz — é a sua conduta
          em partida.
        </p>
      </div>

      <div className="flex justify-center pt-2">
        <Button
          variant="cinematic"
          size="lg"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          Entrar no ambiente <ArrowRight size={18} />
        </Button>
      </div>
    </m.article>
  );
}
