// /pro/students/[id] — Detalhe de aluno (vista PRO, scope limitado).
//
// Server Component:
//   - Valida que o caller é PRO ativo
//   - Valida que o aluno [id] já jogou com esse PRO (scope)
//   - Exibe: perfil read-only + Honor history + strikes + ações coach note

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/ui/avatar";
import { StudentDetailClient } from "./student-detail-client";
import { CoachingReviewPanel } from "./coaching-review-panel";
import { getStudentHonorHistory } from "@/app/pro/actions";
import { getCoachingReviewsForUser } from "@/lib/queries/coaching-reviews";
import { CoachingReviewsList } from "@/components/profile/coaching-reviews-list";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Detalhe do Aluno — Painel PRO",
};

// Revalida a cada 30s — histórico de honor pode mudar
export const revalidate = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Label legível para source de honor */
function honorSourceLabel(source: string): string {
  const map: Record<string, string> = {
    coach_note_positive: "Nota do Coach (+)",
    coach_note_negative: "Nota do Coach (-)",
    match_completed: "Partida concluída",
    match_bonus: "Bônus de partida",
    season_reset: "Reset de temporada",
    manual_admin: "Ajuste admin",
  };
  return map[source] ?? source;
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id: studentId } = await params;

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

  const username = studentProfile.username ?? "Aluno Anônimo";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <main className="flex flex-col gap-8 p-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted">
        <a href="/pro" className="hover:text-text-body transition-colors">
          Painel PRO
        </a>
        <span>/</span>
        <a href="/pro#alunos" className="hover:text-text-body transition-colors">
          Meus Alunos
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
            Perfil do Aluno
          </h2>

          <div className="flex items-center gap-4">
            <UserAvatar
              src={studentProfile.avatar_url ?? undefined}
              alt={`Avatar de ${username}`}
              fallback={initials}
              size="lg"
            />

            <div className="flex flex-col gap-1">
              <span className="font-display text-xl font-bold uppercase tracking-widest text-text-display">
                {username}
              </span>

              <div className="flex items-center gap-4 text-sm text-text-muted">
                <span>
                  MMR: {studentProfile.mmr_atual ? `${studentProfile.mmr_atual}` : "—"}
                </span>
                <span>
                  Honor: {honorScore ?? 0} pts ({honorTierStr ?? "aprendiz"})
                </span>
                <span>
                  {matchCount} PT{matchCount !== 1 ? "s" : ""} comigo
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
                {studentProfile.behavior_status === "ok" ? "Conduta OK" : studentProfile.behavior_status}
              </span>
            </div>
          </div>

          {/* Strikes */}
          {strikeCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/5 border border-warning/15 px-4 py-2">
              <span className="text-sm text-warning font-medium">
                {strikeCount} strike{strikeCount > 1 ? "s" : ""} registrado{strikeCount > 1 ? "s" : ""}
              </span>
              <span className="text-sm text-text-muted">
                (notas negativas de coaches)
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
          Ações
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
          Análises de coaching
        </h2>
        <div className="space-y-4">
          <CoachingReviewPanel studentId={studentId} studentName={username} />
          <CoachingReviewsList
            reviews={coachingReviews}
            emptyLabel="Você ainda não escreveu nenhuma análise pra esse aluno."
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
          Histórico de Honor
        </h2>

        {honorHistory.length === 0 ? (
          <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6 text-center text-text-muted text-sm">
            Nenhum evento de honor registrado ainda.
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
                    {honorSourceLabel(entry.source)}
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
