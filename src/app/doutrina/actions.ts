"use server";

// Server Actions do Ritual de Doutrinacao (niveis 0->6).
// A CORRETUDE e validada NO SERVIDOR (contra QUIZ_QUESTIONS) — o cliente nunca
// decide o que conta. Progresso persistido em profiles.doctrine_quiz_progress (jsonb).
// Ao cobrir o banco inteiro, marca doctrine_accepted_at/version — a trigger
// `award_xp_on_doctrine_accept` (ja existente) concede o XP pelo caminho testado.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DOCTRINE_VERSION } from "@/lib/doctrine";
import { QUIZ_QUESTIONS } from "@/lib/quiz/questions";

const TOTAL = QUIZ_QUESTIONS.length;
const QUESTION_MAP = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));

function readProgress(raw: unknown): string[] {
  return Array.isArray(raw)
    ? (raw as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
}

export type DoctrineProgress = {
  answeredIds: string[];
  doctrinated: boolean;
  total: number;
};

export async function getDoctrineProgress(): Promise<DoctrineProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { answeredIds: [], doctrinated: false, total: TOTAL };

  const { data } = await supabase
    .from("profiles")
    .select("doctrine_quiz_progress, doctrine_accepted_at, doctrine_version")
    .eq("id", user.id)
    .single();

  const answeredIds = readProgress(data?.doctrine_quiz_progress);
  const doctrinated =
    !!data?.doctrine_accepted_at && data?.doctrine_version === DOCTRINE_VERSION;
  return { answeredIds, doctrinated, total: TOTAL };
}

const answerInput = z.object({
  questionId: z.string().min(1),
  optionId: z.enum(["a", "b", "c", "d"]),
});

export type AnswerResult =
  | { ok: false; reason: "invalid" | "unknown_question" | "unauthenticated" }
  | {
      ok: true;
      correct: boolean;
      answeredIds: string[];
      doctrinated: boolean;
      total: number;
    };

export async function recordDoctrineAnswer(
  questionId: string,
  optionId: string,
): Promise<AnswerResult> {
  const parsed = answerInput.safeParse({ questionId, optionId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const question = QUESTION_MAP.get(parsed.data.questionId);
  if (!question) return { ok: false, reason: "unknown_question" };

  const correct =
    question.options.find((o) => o.correct)?.id === parsed.data.optionId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("doctrine_quiz_progress, doctrine_accepted_at, doctrine_version")
    .eq("id", user.id)
    .single();

  const current = new Set(readProgress(profile?.doctrine_quiz_progress));
  const alreadyDoctrinated =
    !!profile?.doctrine_accepted_at &&
    profile?.doctrine_version === DOCTRINE_VERSION;

  // So conta questao CORRETA e ainda nao registrada.
  if (correct && !current.has(question.id)) {
    current.add(question.id);
    const answeredIds = [...current];

    const update: {
      doctrine_quiz_progress: string[];
      doctrine_accepted_at?: string;
      doctrine_version?: number;
    } = { doctrine_quiz_progress: answeredIds };

    // Cobriu o banco inteiro -> doutrinado (nivel 6). Marca aceite (trigger da XP).
    const completing = answeredIds.length >= TOTAL && !alreadyDoctrinated;
    if (completing) {
      update.doctrine_accepted_at = new Date().toISOString();
      update.doctrine_version = DOCTRINE_VERSION;
    }

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    if (error) {
      console.error("[recordDoctrineAnswer] update falhou:", error.message);
    }

    return {
      ok: true,
      correct,
      answeredIds,
      doctrinated: alreadyDoctrinated || answeredIds.length >= TOTAL,
      total: TOTAL,
    };
  }

  // Errou ou ja registrada: progresso inalterado.
  return {
    ok: true,
    correct,
    answeredIds: [...current],
    doctrinated: alreadyDoctrinated,
    total: TOTAL,
  };
}
