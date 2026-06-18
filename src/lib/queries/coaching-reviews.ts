// Leitura das análises de coaching (sessões coachadas — migration 057).
// RLS garante o escopo: o aluno lê as próprias, o PRO as que escreveu, admin tudo.
// Resolve o nome do PRO em batch (sem N+1); coaches têm perfil público (migr. 007).

import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface CoachingReview {
  id: string;
  summary: string;
  strengths: string | null;
  improvements: string | null;
  rating: number | null;
  createdAt: string;
  matchId: string | null;
  coachName: string;
}

export async function getCoachingReviewsForUser(
  supabase: ServerClient,
  studentUserId: string
): Promise<CoachingReview[]> {
  const { data: reviews } = await supabase
    .from("coaching_reviews")
    .select("id, summary, strengths, improvements, rating, created_at, match_id, coach_id")
    .eq("student_user_id", studentUserId)
    .order("created_at", { ascending: false });
  if (!reviews || reviews.length === 0) return [];

  // Resolve nome do PRO em 2 queries batch (coach → profile_id → username).
  const coachIds = [...new Set(reviews.map((r) => r.coach_id))];
  const { data: coaches } = await supabase
    .from("coaches")
    .select("id, profile_id")
    .in("id", coachIds);
  const profileIds = (coaches ?? []).map((c) => c.profile_id);
  const { data: profs } = profileIds.length
    ? await supabase.from("profiles").select("id, username").in("id", profileIds)
    : { data: [] };

  const profileNameById = new Map((profs ?? []).map((p) => [p.id, p.username ?? "PRO"]));
  const coachNameById = new Map(
    (coaches ?? []).map((c) => [c.id, profileNameById.get(c.profile_id) ?? "PRO"])
  );

  return reviews.map((r) => ({
    id: r.id,
    summary: r.summary,
    strengths: r.strengths,
    improvements: r.improvements,
    rating: r.rating,
    createdAt: r.created_at,
    matchId: r.match_id,
    coachName: coachNameById.get(r.coach_id) ?? "PRO",
  }));
}
