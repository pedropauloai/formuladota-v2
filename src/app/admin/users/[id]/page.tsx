// /admin/users/[id] — Painel de detalhes do usuário V0.
// Server Component. 5 sub-painéis via Tabs inline.

import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DotaRankMedal } from "@/components/ui/dota-rank-medal";
import { mmrToDotaRank } from "@/lib/dota/rank-badges";
import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";
import {
  AdjustFichasModal,
  ApplyStrikeModal,
  HonorBonusModal,
  GrantAchievementModal,
  PromoveCoachModal,
  RevokeCoachModal,
  CoachNotesModal,
  EditUserModal,
} from "./user-modals";
import {
  ChevronLeft, CheckCircle, XCircle, Shield,
  AlertTriangle, HelpCircle,
} from "lucide-react";
import { PermissionsSection } from "./permissions-section";
import { getProRevenue } from "@/app/actions/pro-management";

export const revalidate = 0;

// Helper externo — isola Date.now() do contexto de render do component
function getNowMs(): number {
  return Date.now();
}

// ─── Helpers de tipo ─────────────────────────────────────────────────────────


function honorScoreToRank(score: number | null | undefined): HonorRank {
  const s = score ?? 0;
  if (s >= 800) return "mistico";
  if (s >= 600) return "lendario";
  if (s >= 300) return "as";
  if (s >= 150) return "piloto";
  if (s >= 50) return "aprendiz";
  return "novato";
}

type Translator = Awaited<ReturnType<typeof getTranslations>>;

function behaviorLabel(status: string | null, t: Translator): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: t("behaviorNone"), cls: "text-emerald-400 border-emerald-500/40" },
    warned: { label: t("behaviorWarned"), cls: "text-amber-400 border-amber-500/40" },
    suspended: { label: t("behaviorSuspended"), cls: "text-amber-500 border-amber-600/60" },
    banned: { label: t("behaviorBanned"), cls: "text-red-400 border-red-500/60" },
  };
  return map[status ?? ""] ?? { label: status ?? "—", cls: "text-text-muted border-border-subtle" };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border-subtle bg-bg-elevated overflow-hidden">
      <div className="border-b border-border-subtle px-5 py-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-text-display">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-subtle/50 last:border-0">
      <span className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded min-w-[120px]">
        {label}
      </span>
      <span className="font-display text-sm font-semibold text-text-body text-right">{value}</span>
    </div>
  );
}

function CriterioRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border-subtle/40 last:border-0">
      {ok ? (
        <CheckCircle size={14} className="text-emerald-400 shrink-0" />
      ) : (
        <XCircle size={14} className="text-text-faded shrink-0" />
      )}
      <span className={`font-sans text-sm ${ok ? "text-text-body" : "text-text-faded"}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Metadata dinâmica ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("username")
    .eq("id", id)
    .single();
  return {
    title: `${data?.username ?? id} — Admin FORMULADOTA`,
  };
}

// ─── Componente principal ────────────────────────────────────────────────────

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("misc2");
  const service = createServiceClient();

  // ── Perfil base (campos do schema real — database.ts)
  const { data: profile } = await service
    .from("profiles")
    .select(`
      id, username, email, role, is_admin,
      behavior_status, calibration_status, created_at,
      mmr_atual, doctrine_version, doctrine_accepted_at,
      banned_at, banned_reason,
      match_permissions_consumed, doctrine_quiz_progress, region
    `)
    .eq("id", id)
    .single();

  if (!profile) notFound();

  // ── Honor real (RPC migration 053 — soma do honor_ledger) + permissões (RPC 044)
  //    + nota privada mais recente (admin_notes, migration 011)
  const [honorRes, permissionsRes, adminNoteRes] = await Promise.all([
    service.rpc("get_honor_score", { p_user_id: id }),
    service.rpc("available_match_permissions", { p_uid: id }),
    service
      .from("admin_notes")
      .select("note")
      .eq("target_user_id", id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // ── Fichas
  const { data: fichasRow } = await service
    .from("user_fichas")
    .select("balance")
    .eq("user_id", id)
    .maybeSingle();
  const balance = fichasRow?.balance ?? 0;

  // ── Ledger de fichas (últimas 20)
  const { data: fichaLedger } = await service
    .from("ficha_ledger")
    .select("id, delta, source, reason, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  // ── Warnings / strikes
  const { data: warnings } = await service
    .from("user_warnings" as never)
    .select("id, severity, reason, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  // ── Pro promotion
  const { data: proPromo } = await service
    .from("pro_promotions")
    .select("id, status, created_at, promotion_notes, revoked_at, revoked_reason")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── Steam links (steam_links.persona = campo correto no schema)
  const { data: steamLink } = await service
    .from("steam_links")
    .select("steam_id_64, persona")
    .eq("user_id", id)
    .maybeSingle();

  // ── MMR da temporada ATIVA (player_season_mmr) — editável no painel admin.
  const { data: activeSeason } = await service
    .from("seasons")
    .select("id")
    .eq("active", true)
    .maybeSingle();
  let seasonMmr: number | null = null;
  if (activeSeason) {
    const { data: seasonRow } = await service
      .from("player_season_mmr")
      .select("mmr")
      .eq("user_id", id)
      .eq("season_id", activeSeason.id)
      .maybeSingle();
    seasonMmr = seasonRow?.mmr ?? null;
  }

  // ── Achievements
  const { data: achievements } = await service
    .from("achievements" as never)
    .select("id, variant, granted_at, reason")
    .eq("user_id", id)
    .order("granted_at", { ascending: false });

  // ── Revenue (se PRO)
  const isProAtivo = proPromo?.status === "active";
  let proRevenue = null;
  if (isProAtivo) {
    const revResult = await getProRevenue(id);
    if (revResult.success) proRevenue = revResult.data;
  }

  // ── Dados derivados (campos reais do schema — migrations 011/043/044/053)
  const honorScore = honorRes.data ?? 0;
  const honorRank = honorScoreToRank(honorScore);
  const availablePermissions = permissionsRes.data ?? 0;
  const quizCorrect = Array.isArray(profile.doctrine_quiz_progress)
    ? profile.doctrine_quiz_progress.length
    : 0;
  const dotaRank = mmrToDotaRank(profile.mmr_atual);
  const isBanned = Boolean(profile.banned_at);
  const calibrationStatus = (profile.calibration_status ?? "visitante") as
    | "visitante"
    | "calibrando"
    | "ranqueado";

  const strictStrikes = (warnings as Array<{ severity: string }> | null ?? []).filter(
    (w) => w.severity === "grave"
  ).length;

  // ── Critérios de elegibilidade PRO
  const nowMs = getNowMs();
  const accountAgeDays = (nowMs - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const doctrineSince = profile.doctrine_accepted_at
    ? (nowMs - new Date(profile.doctrine_accepted_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  // Critério "achievements de mentor" segue A DEFINIR (sem regra fechada no
  // schema) — exibido como pendente de definição, fora do cálculo de elegibilidade.
  const eligCriteria = {
    honor8: honorScore >= 800,
    seasons2: accountAgeDays >= 120, // ~2 seasons de 60 dias
    skillTier6: (profile.mmr_atual ?? 0) >= 4600,
    noGraveStrikes: strictStrikes === 0,
    doctrineOk: doctrineSince >= 180,
  };

  const criteriosAtendidosLabels = [
    ...(eligCriteria.honor8 ? [t("eligHonor8Short")] : []),
    ...(eligCriteria.seasons2 ? [t("eligSeasons2Short")] : []),
    ...(eligCriteria.skillTier6 ? [t("eligSkill6Short")] : []),
    ...(eligCriteria.noGraveStrikes ? [t("eligNoStrikesShort")] : []),
    ...(eligCriteria.doctrineOk ? [t("eligDoctrineShort")] : []),
  ];

  const totalEligCriteria = Object.values(eligCriteria).filter(Boolean).length;
  const isEligible = totalEligCriteria === 5;

  // ── Conduta label
  const conductInfo = behaviorLabel(profile.behavior_status, t);

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-2">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 font-mono text-sm text-text-faded hover:text-text-muted transition-colors"
        >
          <ChevronLeft size={12} />
          {t("usersBreadcrumb")}
        </Link>
        <span className="font-mono text-sm text-text-faded">/</span>
        <span className="font-display text-sm font-semibold text-text-body">
          {profile.username ?? id}
        </span>
      </nav>

      {/* ── Header do perfil ── */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              {t("adminUserEyebrow")}
            </p>
            <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-text-display">
              {profile.username ?? t("noName")}
            </h1>
            <p className="mt-1 font-mono text-sm text-text-faded">{profile.email}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {profile.is_admin && (
              <span className="rounded-md border border-yellow-500/60 px-2 py-1 font-display font-semibold text-sm uppercase tracking-wide text-yellow-400">
                Admin
              </span>
            )}
            {isProAtivo && (
              <span className="rounded-md border border-brand-primary/60 px-2 py-1 font-display font-semibold text-sm uppercase tracking-wide text-brand-primary">
                {t("proActive")}
              </span>
            )}
            {isBanned && (
              <span className="rounded-md border border-red-500/60 px-2 py-1 font-display font-semibold text-sm uppercase tracking-wide text-red-400">
                {t("behaviorBanned")}
              </span>
            )}
            {/* Edição direta dos dados (nome, MMR, ban, acesso). Pedro 2026-07-03. */}
            <EditUserModal
              targetUserId={id}
              username={profile.username ?? t("noName")}
              seasonMmr={seasonMmr}
              isBanned={isBanned}
              isAdmin={Boolean(profile.is_admin)}
              role={profile.role ?? "player"}
              region={(profile as { region?: string }).region ?? "BR"}
              steamId64={steamLink?.steam_id_64 ?? null}
            />
          </div>
        </div>
        <div className="brand-divider" />
      </header>

      {/* ================================================================== */}
      {/* SUB-PAINEL 1 — Identidade                                          */}
      {/* ================================================================== */}
      <SectionCard title={t("section1Identity")}>
        <div className="grid gap-2">
          <InfoRow label="Username" value={profile.username ?? "—"} />
          <InfoRow label="Email" value={profile.email ?? "—"} />
          <InfoRow
            label="Discord"
            value={t("discordLinkedOauth")}
          />
          <InfoRow
            label="Steam"
            value={
              steamLink
                ? `${steamLink.persona ?? "—"} (${steamLink.steam_id_64})`
                : t("notLinked")
            }
          />
          {/* Troca manual do vínculo Steam agora vive dentro do modal "Editar dados"
              (seção Steam ID), reusando swapSteamLink — sem botão duplicado aqui. */}
          <InfoRow
            label={t("signupLabel")}
            value={new Date(profile.created_at).toLocaleString("pt-BR")}
          />
          <InfoRow
            label={t("doctrineAcceptedLabel")}
            value={
              profile.doctrine_accepted_at
                ? t("doctrineAcceptedValue", {
                    version: profile.doctrine_version ?? "?",
                    date: new Date(profile.doctrine_accepted_at).toLocaleDateString("pt-BR"),
                  })
                : t("neverAccepted")
            }
          />
          <InfoRow label="Role" value={profile.role ?? "player"} />
        </div>

        <div className="mt-4">
          <CoachNotesModal
            targetUserId={id}
            username={profile.username ?? t("noName")}
            initialNotes={adminNoteRes.data?.note ?? ""}
          />
        </div>
      </SectionCard>

      {/* ================================================================== */}
      {/* SUB-PAINEL 2 — Fichas                                              */}
      {/* ================================================================== */}
      <SectionCard title={t("section2Fichas")}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded mb-1">
              {t("currentBalanceLabel")}
            </p>
            <p className="font-display text-4xl text-emerald-400">
              {balance}
              <span className="ml-2 font-mono text-sm text-text-faded">
                {t("fichaUnit", { count: balance })}
              </span>
            </p>
          </div>
          <AdjustFichasModal
            userId={id}
            username={profile.username ?? t("noName")}
            currentBalance={balance}
          />
        </div>

        {/* Ledger */}
        {(fichaLedger ?? []).length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-3 py-2 font-display font-semibold text-sm uppercase tracking-wide text-text-faded">{t("colDate")}</th>
                  <th className="text-left px-3 py-2 font-display font-semibold text-sm uppercase tracking-wide text-text-faded">Delta</th>
                  <th className="text-left px-3 py-2 font-display font-semibold text-sm uppercase tracking-wide text-text-faded">{t("colSource")}</th>
                  <th className="text-left px-3 py-2 font-display font-semibold text-sm uppercase tracking-wide text-text-faded">{t("colReason")}</th>
                </tr>
              </thead>
              <tbody>
                {(fichaLedger ?? []).map((l) => (
                  <tr key={l.id} className="border-b border-border-subtle/50 last:border-0">
                    <td className="px-3 py-2 font-mono text-sm text-text-faded">
                      {new Date(l.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className={`px-3 py-2 font-mono text-sm font-semibold ${l.delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {l.delta > 0 ? `+${l.delta}` : l.delta}
                    </td>
                    <td className="px-3 py-2 font-display font-semibold text-sm text-text-faded uppercase tracking-wide">
                      {l.source}
                    </td>
                    <td className="px-3 py-2 font-display text-sm font-semibold text-text-body max-w-[200px] truncate">
                      {l.reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="font-mono text-sm text-text-faded">{t("noLedgerMovements")}</p>
        )}
      </SectionCard>

      {/* ================================================================== */}
      {/* SUB-PAINEL 3 — Permissões de partida                               */}
      {/* ================================================================== */}
      <PermissionsSection
        userId={id}
        username={profile.username ?? t("noName")}
        available={availablePermissions}
        consumed={profile.match_permissions_consumed}
        quizCorrect={quizCorrect}
        isDoctrinated={Boolean(profile.doctrine_accepted_at)}
      />

      {/* ================================================================== */}
      {/* SUB-PAINEL 4 — Conduta                                             */}
      {/* ================================================================== */}
      <SectionCard title={t("section4Conduct")}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-text-faded" />
            <div>
              <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded mb-0.5">
                {t("conductStatus")}
              </p>
              <span
                className={`inline-block rounded-md border px-2 py-1 font-display text-sm font-semibold ${conductInfo.cls}`}
              >
                {conductInfo.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl text-text-muted">
              {(warnings as unknown[] | null ?? []).length}
            </span>
            <span className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
              {t("strikeUnit", { count: (warnings as unknown[] | null ?? []).length })}
            </span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-5">
          <ApplyStrikeModal
            targetUserId={id}
            username={profile.username ?? t("noName")}
          />
          <HonorBonusModal
            targetUserId={id}
            username={profile.username ?? t("noName")}
          />
        </div>

        {/* Histórico de warnings */}
        {(warnings as Array<{ id: string; severity: string; reason: string; created_at: string }> | null ?? []).length > 0 ? (
          <div className="space-y-2">
            {(warnings as Array<{ id: string; severity: string; reason: string; created_at: string }> | null ?? []).map((w) => (
              <div
                key={w.id}
                className="flex items-start gap-3 rounded-md border border-border-subtle/50 bg-bg-elevated/30 px-3 py-2"
              >
                <AlertTriangle
                  size={12}
                  className={w.severity === "grave" ? "text-red-400 mt-0.5" : "text-amber-400 mt-0.5"}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
                    {w.severity === "grave" ? t("strikeHeavy") : t("strikeLight")} ·{" "}
                    {new Date(w.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="font-display text-sm font-semibold text-text-body mt-0.5">
                    {w.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-mono text-sm text-text-faded">{t("noOccurrences")}</p>
        )}
      </SectionCard>

      {/* ================================================================== */}
      {/* SUB-PAINEL 5 — Honor + Skill                                        */}
      {/* ================================================================== */}
      <SectionCard title={t("section5HonorSkill")}>
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* HONOR */}
          <div className="flex flex-col items-center gap-3 p-4 rounded-md border border-border-subtle/50 bg-bg-elevated/20">
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
              HONOR
            </p>
            <HonorRankMedal
              rank={honorRank}
              size="lg"
              showLabel
              glow={honorRank === "mistico"}
              calibrationStatus={calibrationStatus === "visitante" ? "visitante" : undefined}
            />
            <p className="font-display text-2xl text-text-display">
              {honorScore}
              <span className="ml-1 font-mono text-sm text-text-faded">pts</span>
            </p>
          </div>

          {/* SKILL */}
          <div className="flex flex-col items-center gap-3 p-4 rounded-md border border-border-subtle/50 bg-bg-elevated/20">
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
              SKILL (Valve)
            </p>
            <DotaRankMedal
              rank={dotaRank}
              size="lg"
              showLabel
              glow={dotaRank === "immortal" || dotaRank === "divine"}
              calibrationStatus={calibrationStatus}
            />
            <p className="font-display text-2xl text-text-display">
              {profile.mmr_atual ?? "?"}
              <span className="ml-1 font-mono text-sm text-text-faded">MMR</span>
            </p>
          </div>
        </div>

        {/* Calibração */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
              {t("calibrationStatusLabel")}
            </p>
            <span className="font-display text-sm font-semibold text-text-body capitalize">
              {calibrationStatus}
            </span>
          </div>
          {calibrationStatus === "calibrando" && (
            <div className="h-1.5 w-full rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-primary/60"
                style={{ width: "50%" }}
              />
            </div>
          )}
        </div>

        {/* Achievements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
              Achievements
            </p>
            <GrantAchievementModal
              targetUserId={id}
              username={profile.username ?? t("noName")}
            />
          </div>
          {(achievements as Array<{ id: string; variant: string; granted_at: string }> | null ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(achievements as Array<{ id: string; variant: string; granted_at: string }> | null ?? []).map((a) => (
                <span
                  key={a.id}
                  className="rounded-md border border-yellow-500/40 bg-yellow-500/5 px-2 py-1 font-display font-semibold text-sm uppercase tracking-wide text-yellow-400"
                  title={new Date(a.granted_at).toLocaleDateString("pt-BR")}
                >
                  {a.variant}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-mono text-sm text-text-faded">{t("noAchievements")}</p>
          )}
        </div>
      </SectionCard>

      {/* ================================================================== */}
      {/* SUB-PAINEL 6 — Elegibilidade PRO                                   */}
      {/* ================================================================== */}
      <SectionCard title={t("section6ProEligibility")}>
        {/* Status geral */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isProAtivo
                ? "bg-brand-primary"
                : isEligible
                  ? "bg-emerald-400"
                  : "bg-text-faded"
            }`}
          />
          <p className="font-display text-base uppercase tracking-wide text-text-display">
            {isProAtivo
              ? t("proActive")
              : isEligible
                ? t("eligibleReady")
                : t("criteriaMetCount", { count: totalEligCriteria })}
          </p>
        </div>

        {/* Checklist de critérios */}
        <div className="rounded-md border border-border-subtle/50 overflow-hidden mb-5">
          <CriterioRow
            ok={eligCriteria.honor8}
            label={t("eligHonor8")}
          />
          <CriterioRow
            ok={eligCriteria.seasons2}
            label={t("eligSeasons2")}
          />
          <div className="flex items-center gap-3 py-2 border-b border-border-subtle/40 last:border-0">
            <HelpCircle size={14} className="text-text-faded shrink-0" />
            <span className="font-sans text-sm text-text-faded">
              {t("eligMentorTbd")}
            </span>
          </div>
          <CriterioRow
            ok={eligCriteria.skillTier6}
            label={t("eligSkill6")}
          />
          <CriterioRow
            ok={eligCriteria.noGraveStrikes}
            label={t("eligNoStrikes")}
          />
          <CriterioRow
            ok={eligCriteria.doctrineOk}
            label={t("eligDoctrine")}
          />
        </div>

        {/* PRO ativo: info de revenue */}
        {isProAtivo && proPromo && (
          <div className="mb-5 rounded-md border border-brand-primary/20 bg-brand-primary/5 p-4">
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-brand-primary mb-3">
              {t("proData")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-display font-semibold text-sm text-text-faded uppercase tracking-wide mb-1">{t("promotedOn")}</p>
                <p className="font-display text-sm font-semibold text-text-body">
                  {new Date(proPromo.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {proRevenue && (
                <>
                  <div>
                    <p className="font-display font-semibold text-sm text-text-faded uppercase tracking-wide mb-1">{t("totalSales")}</p>
                    <p className="font-display text-sm font-semibold text-text-body">{proRevenue.totalSales}</p>
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm text-text-faded uppercase tracking-wide mb-1">{t("proEarnings")}</p>
                    <p className="font-display text-lg text-emerald-400">R$ {proRevenue.proEarnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm text-text-faded uppercase tracking-wide mb-1">{t("totalRevenue")}</p>
                    <p className="font-display text-lg text-text-display">R$ {proRevenue.totalRevenue.toFixed(2)}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Ações PRO */}
        <div className="flex gap-2 flex-wrap">
          {!isProAtivo && (
            <PromoveCoachModal
              targetUserId={id}
              username={profile.username ?? t("noName")}
              criteriosAtendidos={criteriosAtendidosLabels}
            />
          )}
          {isProAtivo && (
            <RevokeCoachModal
              targetUserId={id}
              username={profile.username ?? t("noName")}
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
