import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/identity";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { Card, CardContent } from "@/components/ui/card";

// Tela mostrada para usuários com behavior_status='suspended'.
// Usuário não consegue acessar partidas/sessões/compras até suspended_until passar.
// Refatorado V2.5 (DF8.4 cleanup — 2026-05-24):
//   - <Card variant="elevated"> + tokens V2.5 (text-warning, text-text-*, border-border-*)
//   - Fluxo de gate intacto (redirect /perfil se não-suspended ou prazo expirou)
export async function generateMetadata() {
  const t = await getTranslations("account");
  return { title: t("suspendedMetaTitle") };
}

export default async function SuspendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/"); // sem auth, manda pro HUB visitor (login via header)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("behavior_status, suspended_until, username")
    .eq("id", user.id)
    .single();

  // Se não está suspenso ou já passou o prazo, não fica preso aqui.
  if (
    profile?.behavior_status !== "suspended" ||
    (profile.suspended_until && new Date(profile.suspended_until) < new Date())
  ) {
    redirect("/perfil");
  }

  // Nick canônico (Steam > Discord) — com Steam vinculada, o nome exibido vem
  // SEMPRE da Steam (lei do pacote de identidade, 2026-06-12).
  const { data: steamLink } = await supabase
    .from("steam_links")
    .select("persona")
    .eq("user_id", user.id)
    .maybeSingle();
  const greetName = displayName({
    steamPersona: steamLink?.persona,
    // "Imortal" mantém o tom original da tela quando não há nick algum
    discordUsername: profile.username ?? "Imortal",
  });

  const { data: lastWarning } = await supabase
    .from("user_warnings")
    .select("severity, principle_violated, antipattern_violated, notes, issued_at, suspension_days")
    .eq("user_id", user.id)
    .eq("severity", "suspensao")
    .order("issued_at", { ascending: false })
    .limit(1)
    .single();

  const t = await getTranslations("account");

  const formattedUntil = profile.suspended_until
    ? new Date(profile.suspended_until).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : null;

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6">
      <DotaBackdrop />
      <Card
        variant="elevated"
        className="relative z-10 w-full max-w-xl space-y-8 border-2 border-warning backdrop-blur-sm"
      >
        <CardContent className="space-y-8">
          <header className="space-y-3 text-center">
            <p className="font-display text-sm uppercase tracking-[0.4em] text-warning">
              {t("suspendedEyebrow")}
            </p>
            <h1 className="font-display text-3xl uppercase tracking-tight text-text-display">
              {t("suspendedTitle", { name: greetName })}
            </h1>
          </header>

          {formattedUntil && (
            <div className="rounded-md border border-border-subtle bg-bg-base p-4 text-center">
              <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-muted">
                {t("suspendedUntilLabel")}
              </p>
              <p className="mt-1 text-xl font-bold text-warning">
                {formattedUntil}
              </p>
            </div>
          )}

          {lastWarning && (
            <div className="space-y-2 rounded-md border border-border-subtle bg-bg-deep p-4">
              <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-muted">
                {t("suspendedReasonLabel")}
              </p>
              <p className="text-sm text-text-body">
                {lastWarning.antipattern_violated
                  ? t("suspendedAntipattern", { n: lastWarning.antipattern_violated })
                  : t("suspendedPrinciple", { n: lastWarning.principle_violated })}
              </p>
              {lastWarning.notes && (
                <p className="text-sm italic text-text-muted">
                  &ldquo;{lastWarning.notes}&rdquo;
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 text-sm leading-relaxed text-text-muted">
            <p>{t("suspendedExplain")}</p>
            <p>
              {t("suspendedAppealPrefix")}{" "}
              <a
                href="https://discord.com/invite/USntaFRS6x"
                target="_blank"
                rel="noreferrer"
                className="text-brand-primary underline hover:text-text-display transition-colors"
              >
                {t("suspendedAppealLink")}
              </a>{" "}
              {t("suspendedAppealSuffix")}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border-subtle pt-4">
            <Link
              href="/codigo-de-conduta"
              className="font-display font-semibold text-sm uppercase tracking-wide text-text-muted hover:text-text-display transition-colors"
            >
              {t("conductCode")}
            </Link>
            <Link
              href="/"
              className="font-sans text-sm uppercase tracking-widest text-brand-primary hover:text-text-display transition-colors"
            >
              {t("homeLink")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
