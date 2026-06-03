// Camada de LIÇÃO do quiz — agrupa as 130 questões em Pilar → Lição → Questão.
// Decisão Pedro 2026-06-03 (ver memory/project_quiz_4_pilares): 130 de uma vez é um
// paredão; cada lição é curta (2-3q por princípio/anti-padrão/conceito) e o usuário faz
// uma por vez. Pura organização no client — a persistência continua por questão.
//
// Os 4 Pilares já existem como QUIZ_CHAPTERS. Aqui agrupamos as questões de cada pilar
// pelo campo `origin` ("Princípio 1", "Anti-padrão 11", "Conceito M5", "Fundamento L5"),
// e damos à lição o TÍTULO real do princípio/anti-padrão (de doctrine.ts).

import { PRINCIPLES, ANTIPATTERNS } from "@/lib/doctrine";
import { QUIZ_QUESTIONS } from "./questions";
import { QUIZ_CHAPTERS, type QuizSection } from "./types";

export interface QuizLesson {
  /** ID estável: "<section>:<origin>". */
  id: string;
  section: QuizSection;
  /** Origem citável: "Princípio 1". */
  origin: string;
  /** Título humano da lição (ex: "A culpa NUNCA é do outro"). */
  title: string;
  questionIds: string[];
}

export interface QuizPilar {
  section: QuizSection;
  title: string;
  subtitle: string;
  order: number;
  lessons: QuizLesson[];
}

function numFromOrigin(origin: string): number | null {
  const m = origin.match(/(\d+)/);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

// Título da lição: princípios/anti-padrões têm título canônico em doctrine.ts;
// metodologia (conceito/fundamento) usa o próprio `origin` como título.
function lessonTitle(section: QuizSection, origin: string): string {
  const n = numFromOrigin(origin);
  if (n != null && section === "principio") {
    const p = PRINCIPLES.find((x) => x.id === n);
    if (p) return p.title;
  }
  if (n != null && section === "anti-padrao") {
    const a = ANTIPATTERNS.find((x) => x.id === n);
    if (a) return a.title;
  }
  return origin;
}

// Monta os 4 Pilares ordenados, cada um com suas lições (agrupadas por origin,
// preservando a ordem de aparição das questões).
function buildPilares(): QuizPilar[] {
  return [...QUIZ_CHAPTERS]
    .sort((a, b) => a.order - b.order)
    .map((ch) => {
      const byOrigin = new Map<string, string[]>();
      for (const q of QUIZ_QUESTIONS) {
        if (q.section !== ch.section) continue;
        const arr = byOrigin.get(q.origin) ?? [];
        arr.push(q.id);
        byOrigin.set(q.origin, arr);
      }
      const lessons: QuizLesson[] = [...byOrigin.entries()].map(
        ([origin, ids]) => ({
          id: `${ch.section}:${origin}`,
          section: ch.section,
          origin,
          title: lessonTitle(ch.section, origin),
          questionIds: ids,
        })
      );
      return {
        section: ch.section,
        title: ch.title,
        subtitle: ch.subtitle,
        order: ch.order,
        lessons,
      };
    });
}

export const PILARES: QuizPilar[] = buildPilares();

/** Lista achatada de todas as lições, na ordem Pilar I→IV, lição a lição. */
export const ALL_LESSONS: QuizLesson[] = PILARES.flatMap((p) => p.lessons);

/** Uma lição está completa quando TODAS as suas questões foram acertadas. */
export function isLessonComplete(
  lesson: QuizLesson,
  correctIds: ReadonlySet<string>
): boolean {
  return lesson.questionIds.every((id) => correctIds.has(id));
}

/** Um pilar está completo quando todas as suas lições estão completas. */
export function isPilarComplete(
  pilar: QuizPilar,
  correctIds: ReadonlySet<string>
): boolean {
  return pilar.lessons.every((l) => isLessonComplete(l, correctIds));
}

/**
 * Índice da primeira lição ainda não concluída em ALL_LESSONS (a "próxima lição").
 * Retorna -1 se tudo concluído. A navegação é sequencial: só a próxima fica liberada.
 */
export function nextLessonIndex(correctIds: ReadonlySet<string>): number {
  return ALL_LESSONS.findIndex((l) => !isLessonComplete(l, correctIds));
}
