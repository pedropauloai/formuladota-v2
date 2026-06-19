"use client";

// Ritual de Doutrinacao (niveis 0->6). NAO e prova — e iniciacao. Estrutura em
// Pilar -> Licao -> Questao (Pedro 2026-06-03, ver memory/project_quiz_4_pilares):
// as 130 questoes viram 4 Pilares; dentro de cada um, licoes curtas (2-3q por
// principio/anti-padrao/conceito). Sequencial: a proxima licao so abre quando a
// anterior e dominada. Errar nao reprova — a questao volta ate ser compreendida.
// Cada acerto credita XP real (sobe o nivel) via recordDoctrineAnswer.

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { m } from "motion/react";
import { Check, X, ArrowRight, Lock, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { xpProgress } from "@/lib/levels";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";
import { QUIZ_QUESTIONS } from "@/lib/quiz/questions";
import type { QuizQuestion } from "@/lib/quiz/types";
import {
  PILARES,
  ALL_LESSONS,
  isLessonComplete,
  isPilarComplete,
  nextLessonIndex,
  type QuizLesson,
} from "@/lib/quiz/lessons";
import { recordDoctrineAnswer } from "./actions";

const TOTAL = QUIZ_QUESTIONS.length;
const QUESTION_BY_ID = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));
// XP por acerto (migration 043). Durante a doutrina é a única fonte de XP, então
// estimar totalXp = acertos * 22 dá uma barra de XP precisa que sobe em tempo real.
const XP_PER_QUESTION = 22;

// --- i18n do CONTEÚDO do quiz (namespace "quiz") -------------------------
// IDs têm pontos (Q1.1); o next-intl usa ponto como separador de chave, então
// sanitizamos pra underscore (Q1_1). origin e título de lição são resolvidos por
// idioma (origin por padrão de citação; título reusa o namespace doctrine).
const quizSid = (id: string) => id.replace(/\./g, "_");

function localizeOrigin(origin: string, locale: string): string {
  if (locale !== "en") return origin;
  return origin
    .replace(/^Princípio /, "Principle ")
    .replace(/^Anti-padrão /, "Anti-pattern ")
    .replace(/^Conceito /, "Concept ")
    .replace(/^Fundamento /, "Fundamentals ");
}

// Título da lição localizado: princípios/anti-padrões reusam o título canônico
// (namespace doctrine, já traduzido); metodologia usa o próprio origin.
function useLessonTitle() {
  const td = useTranslations("doctrine");
  const locale = useLocale();
  return (lesson: QuizLesson) => {
    const n = lesson.origin.match(/\d+/)?.[0];
    if (n && lesson.section === "principio") return td(`principle.${n}.title`);
    if (n && lesson.section === "anti-padrao") return td(`antipattern.${n}.title`);
    return localizeOrigin(lesson.origin, locale);
  };
}

type View = "intro" | "trail" | "lesson" | "complete";

interface RitualDoutrinaProps {
  initialAnsweredIds: string[];
  initialDoctrinated: boolean;
  persona: string;
  avatar: string | null;
}

export function RitualDoutrina({
  initialAnsweredIds,
  initialDoctrinated,
  persona,
  avatar,
}: RitualDoutrinaProps) {
  const [correctIds, setCorrectIds] = useState<Set<string>>(
    () => new Set(initialAnsweredIds)
  );
  const [view, setView] = useState<View>("intro");
  const [activeLessonIdx, setActiveLessonIdx] = useState<number>(-1);
  // Fila de ids da licao atual ainda nao dominados (re-enfileira ao errar).
  const [queue, setQueue] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  const done = correctIds.size;
  const pct = Math.round((done / TOTAL) * 100);
  const allComplete = done >= TOTAL || initialDoctrinated;

  function openLesson(idx: number) {
    const lesson = ALL_LESSONS[idx];
    if (!lesson) return;
    const pending = lesson.questionIds.filter((id) => !correctIds.has(id));
    if (pending.length === 0) return; // ja completa
    setActiveLessonIdx(idx);
    setQueue(pending);
    setChosen(null);
    setView("lesson");
  }

  function startOrContinue() {
    if (allComplete) {
      setView("complete");
      return;
    }
    const idx = nextLessonIndex(correctIds);
    if (idx === -1) {
      setView("complete");
      return;
    }
    setView("trail");
  }

  const activeLesson = ALL_LESSONS[activeLessonIdx];
  const currentId = queue[0];
  const current = useMemo(
    () => (currentId ? QUESTION_BY_ID.get(currentId) : undefined),
    [currentId]
  );

  function answer(optionId: string) {
    if (chosen) return;
    setChosen(optionId);
  }

  async function advance() {
    if (!current || !chosen) return;
    const correctOption = current.options.find((o) => o.correct);
    const gotIt = correctOption?.id === chosen;

    const nextQueue = queue.slice();
    nextQueue.shift();

    if (gotIt) {
      const id = current.id;
      setCorrectIds((prev) => new Set(prev).add(id));
      // Persiste + credita XP no servidor (a barra do header sobe via `done`, otimista).
      void recordDoctrineAnswer(id, chosen);
    } else {
      nextQueue.push(current.id); // errou — volta no fim da licao
    }

    setChosen(null);

    if (nextQueue.length === 0) {
      // Licao concluida. Tudo terminado? senao volta pro trail.
      const newCorrect = gotIt
        ? new Set(correctIds).add(current.id)
        : correctIds;
      if (newCorrect.size >= TOTAL) {
        setView("complete");
      } else {
        setView("trail");
      }
    } else {
      setQueue(nextQueue);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <RitualHeader done={done} pct={pct} persona={persona} avatar={avatar} />

      <div className="flex flex-1 flex-col justify-center py-10">
        {view === "intro" && (
          <IntroView
            resuming={done > 0 && !allComplete}
            completed={allComplete}
            onStart={startOrContinue}
            onSeeMedal={() => setView("complete")}
          />
        )}

        {view === "trail" && (
          <TrailView
            correctIds={correctIds}
            onOpenLesson={openLesson}
            onComplete={() => setView("complete")}
          />
        )}

        {view === "lesson" && current && activeLesson && (
          <m.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATIONS.hero, ease: EASINGS.softLanding }}
          >
            <QuestionView
              lesson={activeLesson}
              remaining={queue.length}
              question={current}
              chosen={chosen}
              onAnswer={answer}
              onContinue={advance}
              onBack={() => setView("trail")}
            />
          </m.div>
        )}

        {view === "complete" && <CompleteView />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header — barra geral + nivel                                        */
/* ------------------------------------------------------------------ */

function RitualHeader({
  done,
  pct,
  persona,
  avatar,
}: {
  done: number;
  pct: number;
  persona: string;
  avatar: string | null;
}) {
  // Durante a doutrina o XP vem só do quiz, então acertos*22 é uma estimativa fiel
  // que sobe em tempo real a cada acerto (mesma math do servidor — migration 043).
  const t = useTranslations("doutrina");
  const { level, pct: xpPct } = xpProgress(done * XP_PER_QUESTION);
  return (
    <div className="flex items-center gap-3">
      <XpAvatarRing
        src={avatar}
        alt={t("avatarAlt", { persona })}
        fallback={persona.slice(0, 2)}
        level={level}
        pct={xpPct}
        size={40}
      />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            {t("title")}
          </span>
          <span className="font-display text-sm font-semibold text-text-body">
            {done}/{TOTAL}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progressAria")}
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
  const t = useTranslations("doutrina");
  return (
    <article className="space-y-8 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-brand-primary">
        {t("introEyebrow")}
      </p>
      <h1 className="font-display text-4xl font-bold leading-tight tracking-wide text-text-display md:text-5xl">
        {t.rich("introHeadline", {
          em: (chunks) => (
            <span
              className="text-brand-primary"
              style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
            >
              {chunks}
            </span>
          ),
        })}
      </h1>
      <p className="mx-auto max-w-xl font-body text-lg leading-relaxed text-text-muted">
        {t.rich("introBody", {
          strong: (chunks) => (
            <strong className="text-text-body">{chunks}</strong>
          ),
        })}
      </p>

      <div className="flex flex-col items-center gap-3 pt-4">
        {completed ? (
          <Button variant="primary" size="lg" onClick={onSeeMedal}>
            {t("seeMedal")} <ArrowRight size={18} />
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={onStart}>
            {resuming ? t("continueRitual") : t("startRitual")}{" "}
            <ArrowRight size={18} />
          </Button>
        )}
        {resuming && (
          <span className="font-display text-sm text-text-faded">
            {t("progressSaved")}
          </span>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Trail — mapa dos 4 Pilares + licoes (sequencial)                    */
/* ------------------------------------------------------------------ */

const PILAR_NUMERAL = ["I", "II", "III", "IV", "V"];

function TrailView({
  correctIds,
  onOpenLesson,
  onComplete,
}: {
  correctIds: Set<string>;
  onOpenLesson: (idx: number) => void;
  onComplete: () => void;
}) {
  const t = useTranslations("doutrina");
  const tq = useTranslations("quiz");
  const nextIdx = nextLessonIndex(correctIds);

  if (nextIdx === -1) {
    return (
      <div className="space-y-6 text-center">
        <p className="font-display text-lg text-text-body">
          {t("allPilarsMastered")}
        </p>
        <div className="flex justify-center">
          <Button variant="cinematic" size="lg" onClick={onComplete}>
            {t("seeMedal")} <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    );
  }

  // Offset global (índice da 1ª lição) de cada pilar — puro, sem contador mutável.
  const pilarOffsets = PILARES.map((_, i) =>
    PILARES.slice(0, i).reduce((sum, p) => sum + p.lessons.length, 0)
  );

  return (
    <div className="space-y-8">
      {PILARES.map((pilar, pIdx) => {
        const pilarDone = isPilarComplete(pilar, correctIds);
        const lessonsWithIdx = pilar.lessons.map((lesson, li) => ({
          lesson,
          idx: pilarOffsets[pIdx]! + li,
        }));
        // Pilar "ativo" = contém a próxima lição.
        const pilarActive = lessonsWithIdx.some((l) => l.idx === nextIdx);
        const pilarLocked = !pilarDone && !pilarActive && nextIdx < lessonsWithIdx[0]!.idx;

        return (
          <section key={pilar.section} className="space-y-3">
            <header className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-sm border-2 font-display text-sm font-bold",
                  pilarDone
                    ? "border-play-primary bg-play-primary/15 text-play-primary"
                    : pilarActive
                      ? "border-brand-primary bg-brand-primary/15 text-brand-primary"
                      : "border-border-subtle bg-bg-elevated text-text-faded"
                )}
              >
                {pilarDone ? <Check size={16} /> : PILAR_NUMERAL[pIdx]}
              </span>
              <div className="min-w-0">
                <h2
                  className={cn(
                    "font-display text-lg font-bold tracking-wide",
                    pilarLocked ? "text-text-faded" : "text-text-display"
                  )}
                >
                  {tq(`chapter.${pilar.section}.title`)}
                </h2>
                <p className="font-body text-sm text-text-muted">
                  {tq(`chapter.${pilar.section}.subtitle`)}
                </p>
              </div>
            </header>

            <ul className="space-y-1.5 pl-12">
              {lessonsWithIdx.map(({ lesson, idx }) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  state={
                    isLessonComplete(lesson, correctIds)
                      ? "done"
                      : idx === nextIdx
                        ? "active"
                        : "locked"
                  }
                  onOpen={() => onOpenLesson(idx)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function LessonRow({
  lesson,
  state,
  onOpen,
}: {
  lesson: QuizLesson;
  state: "done" | "active" | "locked";
  onOpen: () => void;
}) {
  const count = lesson.questionIds.length;
  const lessonTitle = useLessonTitle();
  return (
    <li>
      <button
        type="button"
        disabled={state !== "active"}
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors",
          state === "active"
            ? "border-brand-primary/50 bg-bg-elevated hover:border-brand-primary hover:bg-bg-surface cursor-pointer"
            : state === "done"
              ? "border-border-subtle bg-transparent"
              : "border-border-subtle bg-transparent opacity-50 cursor-default"
        )}
      >
        <span className="shrink-0">
          {state === "done" ? (
            <CheckCircle2 size={18} className="text-play-primary" />
          ) : state === "locked" ? (
            <Lock size={16} className="text-text-faded" />
          ) : (
            <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-brand-primary" />
          )}
        </span>
        <span
          className={cn(
            "flex-1 font-body text-sm",
            state === "locked" ? "text-text-faded" : "text-text-body"
          )}
        >
          {lessonTitle(lesson)}
        </span>
        <span className="shrink-0 font-mono text-xs text-text-faded">
          {count}
        </span>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Questao + feedback-ensino                                           */
/* ------------------------------------------------------------------ */

function QuestionView({
  lesson,
  remaining,
  question,
  chosen,
  onAnswer,
  onContinue,
  onBack,
}: {
  lesson: QuizLesson;
  remaining: number;
  question: QuizQuestion;
  chosen: string | null;
  onAnswer: (optionId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("doutrina");
  const tq = useTranslations("quiz");
  const locale = useLocale();
  const lessonTitle = useLessonTitle();
  const sid = quizSid(question.id);
  const correctId = question.options.find((o) => o.correct)?.id;
  const gotIt = chosen != null && chosen === correctId;
  const answered = chosen != null;

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 font-display text-sm text-text-faded hover:text-text-body transition-colors"
        >
          <ArrowLeft size={14} /> {t("pilarsBack")}
        </button>
        <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-brand-primary">
          {lessonTitle(lesson)} · {t("remaining", { count: remaining })}
        </p>
        <h2 className="font-display text-xl font-bold leading-snug tracking-wide text-text-display md:text-2xl">
          {tq(`q.${sid}.prompt`)}
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
                  "flex w-full items-start gap-3 rounded-[var(--radius-lg)] border-2 p-4 text-left transition-colors disabled:cursor-default",
                  stateClass
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm font-mono text-sm font-bold uppercase",
                    answered && isCorrect
                      ? "bg-play-primary text-text-display"
                      : answered && isChosen
                        ? "bg-error text-text-display"
                        : "bg-bg-surface text-text-muted"
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
                  {tq(`q.${sid}.${opt.id}`)}
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
                  gotIt ? "text-play-primary" : "text-error"
                )}
              >
                {gotIt ? t("feedbackCorrect") : t("feedbackWrong")}
              </p>
              <p className="font-body text-base leading-relaxed text-text-body">
                {tq(`q.${sid}.rationale`)}
              </p>
              <p className="font-display text-sm font-semibold text-text-faded">
                {localizeOrigin(question.origin, locale)}
                {!gotIt && t("questionWillReturn")}
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-5">
            <Button variant="primary" size="md" onClick={onContinue}>
              {gotIt ? t("continue") : t("tryAgain")} <ArrowRight size={18} />
            </Button>
          </div>
        </m.div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Conclusao — reveal da medalha Aprendiz                              */
/* ------------------------------------------------------------------ */

function CompleteView() {
  const t = useTranslations("doutrina");
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
          {t("levelReached")}
        </p>
        <h1 className="font-display text-4xl font-bold tracking-wide text-text-display">
          {t.rich("doctrinatedHeadline", {
            em: (chunks) => (
              <span
                className="text-brand-primary"
                style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
              >
                {chunks}
              </span>
            ),
          })}
        </h1>
        <p className="mx-auto max-w-xl font-body text-lg leading-relaxed text-text-muted">
          {t("doctrinatedBody")}
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
          {t("enterEnvironment")} <ArrowRight size={18} />
        </Button>
      </div>
    </m.article>
  );
}
