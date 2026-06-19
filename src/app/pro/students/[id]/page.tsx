// /pro/students/[id] — Detalhe de aluno (vista PRO, scope limitado).
//
// Server Component:
//   - Valida que o caller é PRO ativo
//   - Valida que o aluno [id] já jogou com esse PRO (scope)
//   - Exibe: perfil read-only + Honor history + strikes + ações coach note

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/ui/avatar";
import { StudentDetailClient } from "./student-detail-client";
import { CoachingReviewPanel } from "./coaching-review-panel";
import { getStudentHonorHistory } from "@/app/pro/actions";
import { getCoachingReviewsForUser } from "@/lib/queries/coaching-reviews";
import { CoachingReviewsList } from "@/components/profile/coaching-reviews-list";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("proCockpit");
  return {
    title: t("studentDetailMetaTitle"),
  };
}

// Revalida a cada 30s — histórico de honor pode mudar
export const revalidate = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Label legível para source de honor */
function honorSourceLabel(
  source: string,
  t: (key: string) => string
): string {
  const keyMap: Record<string, string> = {
    coach_note_positive: "honorSourceCoachNotePositive",
    coach_note_negative: "honorSourceCoachNoteNegative",
    match_completed: "honorSourceMatchCompleted",
    match_bonus: "honorSourceMatchBonus",
    season_reset: "honorSourceSeasonReset",
    manual_admin: "honorSourceManualAdmin",
  };
  const key = keyMap[source];
  return key ? t(key) : source;
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id: studentId } = await params;

  const t = await getTranslations("proCockpit");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Valida PRO ativo
  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (!promo) redirect("/me?msg=not_a_pro");

  // Busca coachId do PRO
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!coach) redirect("/pro");

  // Valida que aluno jogou com esse PRO (scope)
  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coach.id)
    .eq("user_id", studentId);

  if (!matchCount || matchCount === 0) {
    // Aluno não é aluno desse PRO → 404 com scope protegido
    notFound();
  }

  // Busca perfil do aluno
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("username, avatar_url, mmr_atual, behavior_status, created_at")
    .eq("id", studentId)
    .single();

  if (!studentProfile) notFound();

  // Busca honor score do aluno
  const { data: honorScore } = await supabase.rpc("get_honor_score", {
    p_user_id: studentId,
  });

  // Busca honor tier
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 0,
  });

  // Busca histórico de honor (scope limitado ao PRO)
  const honorResult = await getStudentHonorHistory(studentId);
  const honorHistory = honorResult.data ?? [];

  // Strikes = entradas negativas no ledger
  const strikeCount = honorHistory.filter((e) => e.delta < 0).length;

  // Análises de coaching que ESTE PRO escreveu pra esse aluno (RLS limita o escopo).
  const coachingReviews = await getCoachingReviewsForUser(supabase, studentId);

  const username = studentProfile.username ?? t("anonymousStudent");
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <main className="flex flex-col gap-8 p-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted">
        <a href="/pro" className="hover:text-text-body transition-colors">
          {t("panelTitle")}
        </a>
        <span>/</span>
        <a href="/pro#alunos" className="hover:text-text-body transition-colors">
          {t("navStudents")}
        </a>
        <span>/</span>
        <span className="text-text-body">{username}</span>
      </nav>

      {/* ----------------------------------------------------------------
          Perfil read-only do aluno
          ---------------------------------------------------------------- */}
      <section aria-labelledby="heading-aluno-perfil">
        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6 flex flex-col gap-4">
          <h2
            id="heading-aluno-perfil"
            className="font-display text-sm uppercase tracking-widest text-text-muted"
          >
            {t("studentProfile")}
          </h2>

          <div className="flex items-center gap-4">
            <UserAvatar
              src={studentProfile.avatar_url ?? undefined}
              alt={t("avatarAlt", { name: username })}
              fallback={initials}
              size="lg"
            />

            <div className="flex flex-col gap-1">
              <span className="font-display text-xl font-bold uppercase tracking-widest text-text-display">
                {username}
              </span>

              <div className="flex items-center gap-4 text-sm text-text-muted">
                <span>
                  {t("mmrLabel")}: {studentProfile.mmr_atual ? `${studentProfile.mmr_atual}` : "—"}
                </span>
                <span>
                  {t("honorPts", { score: honorScore ?? 0, tier: honorTierStr ?? "aprendiz" })}
                </span>
                <span>
                  {t("ptsWithMe", { count: matchCount })}
                </span>
              </div>

              {/* Status de comportamento */}
              <span
                className={cn(
                  "mt-1 self-start text-sm px-2 py-0.5 rounded-full border uppercase tracking-wider",
                  studentProfile.behavior_status === "ok"
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20"
                )}
              >
                {studentProfile.behavior_status === "ok" ? t("conductOk") : studentProfile.behavior_status}
              </span>
            </div>
          </div>

          {/* Strikes */}
          {strikeCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/5 border border-warning/15 px-4 py-2">
              <span className="text-sm text-warning font-medium">
                {t("strikesRegistered", { count: strikeCount })}
              </span>
              <span className="text-sm text-text-muted">
                {t("strikesHint")}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Ações: coach notes + recomendação
          ---------------------------------------------------------------- */}
      <section aria-labelledby="heading-acoes">
        <h2
          id="heading-acoes"
          className="font-display text-sm uppercase tracking-widest text-text-display mb-3"
        >
          {t("actions")}
        </h2>

        <StudentDetailClient studentId={studentId} studentName={username} />
      </section>

      {/* ----------------------------------------------------------------
          Análises de coaching (sessões coachadas — o PRO observa + analisa)
          ---------------------------------------------------------------- */}
      <section aria-labelledby="heading-coaching">
        <h2
          id="heading-coaching"
          className="font-display text-sm uppercase tracking-widest text-text-display mb-3"
        >
          {t("coachingReviews")}
        </h2>
        <div className="space-y-4">
          <CoachingReviewPanel studentId={studentId} studentName={username} />
          <CoachingReviewsList
            reviews={coachingReviews}
            emptyLabel={t("coachingReviewsEmpty")}
          />
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Histórico de Honor (scope limitado ao PRO)
          ---------------------------------------------------------------- */}
      <section aria-labelledby="heading-honor-history">
        <h2
          id="heading-honor-history"
          className="font-display text-sm uppercase tracking-widest text-text-display mb-3"
        >
          {t("honorHistory")}
        </h2>

        {honorHistory.length === 0 ? (
          <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6 text-center text-text-muted text-sm">
            {t("honorHistoryEmpty")}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {honorHistory.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "flex items-start justify-between rounded-lg border px-4 py-3",
                  entry.delta > 0
                    ? "border-success/20 bg-success/5"
                    : "border-error/20 bg-error/5"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-text-body">
                    {honorSourceLabel(entry.source, t)}
                  </span>
                  {entry.reason && (
                    <span className="text-sm text-text-muted">
                      {entry.reason}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-0.5 ml-4 shrink-0">
                  <span
                    className={cn(
                      "text-sm font-mono font-bold",
                      entry.delta > 0 ? "text-success" : "text-error"
                    )}
                  >
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta}
                  </span>
                  <span className="text-sm text-text-muted">
                    {new Date(entry.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
