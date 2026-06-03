"use server";

// Server Actions do Ritual de Doutrinacao (niveis 0->6).
// A CORRETUDE e validada NO SERVIDOR (contra QUIZ_QUESTIONS) — o cliente nunca
// decide o que conta. Progresso persistido em profiles.doctrine_quiz_progress (jsonb).
//
// Cada acerto NOVO credita XP real por questao (rpc grant_doctrine_question_xp — sobe o
// nivel 0->30) e avanca o saldo de PERMISSOES de partida (5 acertos = 1 permissao, ver
// memory/project_match_permissions). Ao cobrir o banco inteiro, marca doctrine_accepted
// (= nivel 6 = doutrinado = acesso livre).

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DOCTRINE_VERSION } from "@/lib/doctrine";
import { QUIZ_QUESTIONS } from "@/lib/quiz/questions";
import { QUESTIONS_PER_PERMISSION } from "@/lib/quiz/permissions";

const TOTAL = QUIZ_QUESTIONS.length;
const QUESTION_MAP = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));

function readProgress(raw: unknown): string[] {
  return Array.isArray(raw)
    ? (raw as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
}

// Saldo de permissoes = floor(acertos / 5) - consumidas. Nunca negativo.
function availablePermissions(answeredCount: number, consumed: number): number {
  return Math.max(
    0,
    Math.floor(answeredCount / QUESTIONS_PER_PERMISSION) - consumed
  );
}

export type DoctrineProgress = {
  answeredIds: string[];
  answeredCount: number;
  doctrinated: boolean;
  total: number;
  /** Nivel da conta (0-30) — do sistema HONOR/XP. */
  level: number;
  /** Permissoes de partida disponiveis (saldo). */
  permissions: number;
};

async function readLevel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("user_levels")
    .select("current_level")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.current_level ?? 1;
}

export async function getDoctrineProgress(): Promise<DoctrineProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      answeredIds: [],
      answeredCount: 0,
      doctrinated: false,
      total: TOTAL,
      level: 1,
      permissions: 0,
    };

  const { data } = await supabase
    .from("profiles")
    .select(
      "doctrine_quiz_progress, doctrine_accepted_at, doctrine_version, match_permissions_consumed"
    )
    .eq("id", user.id)
    .single();

  const answeredIds = readProgress(data?.doctrine_quiz_progress);
  const doctrinated =
    !!data?.doctrine_accepted_at && data?.doctrine_version === DOCTRINE_VERSION;
  const level = await readLevel(supabase, user.id);
  return {
    answeredIds,
    answeredCount: answeredIds.length,
    doctrinated,
    total: TOTAL,
    level,
    permissions: availablePermissions(
      answeredIds.length,
      data?.match_permissions_consumed ?? 0
    ),
  };
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
      answeredCount: number;
      doctrinated: boolean;
      total: number;
      level: number;
      leveledUp: boolean;
      permissions: number;
    };

export async function recordDoctrineAnswer(
  questionId: string,
  optionId: string
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
    .select(
      "doctrine_quiz_progress, doctrine_accepted_at, doctrine_version, match_permissions_consumed"
    )
    .eq("id", user.id)
    .single();

  const current = new Set(readProgress(profile?.doctrine_quiz_progress));
  const consumed = profile?.match_permissions_consumed ?? 0;
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

    // Cobriu o banco inteiro -> doutrinado (nivel 6 / acesso livre). Marca aceite.
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

    // Credita XP real por questao (sobe o nivel). Best-effort: se falhar, o progresso
    // e a permissao ja estao salvos (derivam de doctrine_quiz_progress) — so o XP atrasa.
    let level = 1;
    let leveledUp = false;
    const { data: xpResult, error: xpError } = await supabase.rpc(
      "grant_doctrine_question_xp"
    );
    if (xpError) {
      console.error("[recordDoctrineAnswer] grant XP falhou:", xpError.message);
      level = await readLevel(supabase, user.id);
    } else if (xpResult && typeof xpResult === "object") {
      const r = xpResult as { level?: number; leveled_up?: boolean };
      level = r.level ?? (await readLevel(supabase, user.id));
      leveledUp = r.leveled_up ?? false;
    }

    return {
      ok: true,
      correct,
      answeredIds,
      answeredCount: answeredIds.length,
      doctrinated: alreadyDoctrinated || answeredIds.length >= TOTAL,
      total: TOTAL,
      level,
      leveledUp,
      permissions: availablePermissions(answeredIds.length, consumed),
    };
  }

  // Errou ou ja registrada: progresso inalterado.
  const answeredIds = [...current];
  return {
    ok: true,
    correct,
    answeredIds,
    answeredCount: answeredIds.length,
    doctrinated: alreadyDoctrinated,
    total: TOTAL,
    level: await readLevel(supabase, user.id),
    leveledUp: false,
    permissions: availablePermissions(answeredIds.length, consumed),
  };
}
