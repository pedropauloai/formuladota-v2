"use server";

// Server Action — PRO escreve uma análise pós-jogo (sessão coachada, migration
// 057). Escopo: precisa ser PRO (tem coach row) E o aluno já ter jogado com ele
// (mesma regra de /pro/students/[id]). RLS é a última linha; validamos antes.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReviewResult = { success: true } | { success: false; error: string };

const ReviewSchema = z.object({
  studentUserId: z.string().uuid(),
  matchId: z.string().uuid().optional(),
  summary: z.string().trim().min(1, "A análise não pode estar vazia.").max(2000),
  strengths: z.string().trim().max(1000).optional(),
  improvements: z.string().trim().max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function submitCoachingReview(input: {
  studentUserId: string;
  matchId?: string;
  summary: string;
  strengths?: string;
  improvements?: string;
  rating?: number;
}): Promise<ReviewResult> {
  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // É PRO? (tem coach row)
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!coach) return { success: false, error: "Apenas PROs escrevem análises." };

  // Escopo: o aluno já jogou com esse PRO?
  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coach.id)
    .eq("user_id", d.studentUserId);
  if (!count || count === 0) {
    return { success: false, error: "Esse aluno ainda não jogou nenhuma PT com você." };
  }

  const { error } = await supabase.from("coaching_reviews").insert({
    coach_id: coach.id,
    student_user_id: d.studentUserId,
    match_id: d.matchId ?? null,
    summary: d.summary,
    strengths: d.strengths ?? null,
    improvements: d.improvements ?? null,
    rating: d.rating ?? null,
  });
  if (error) {
    if (error.code === "42501") return { success: false, error: "Sem permissão (RLS)." };
    return { success: false, error: "Erro ao salvar análise: " + error.message };
  }

  revalidatePath(`/pro/students/${d.studentUserId}`);
  return { success: true };
}
