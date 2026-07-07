import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Gamepad2, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { countryToRegion } from "@/lib/regions";
import { signInWithSteam } from "./actions";
import { RegionPicker } from "./region-picker";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";

// Página obrigatória de vinculação Steam (Phase 3 — H1.1).
// Middleware já garante:
//   - User logado (senão redireciona pra /login)
//   - Doutrina aceita (senão redireciona pra /onboarding/doutrina)
//   - User SEM steam_link em rota privada → vem aqui
//   - User COM steam_link aqui → redireciona /perfil (Plan 03-04)
// Mas exibe os 2 estados pra acessível direto via /vincular/steam.

export async function generateMetadata() {
  const t = await getTranslations("account");
  return {
    title: t("steamLinkMetaTitle"),
    description: t("steamLinkMetaDescription"),
  };
}

// Mapeia o código de erro do retorno da Steam → chave de tradução.
const ERROR_KEYS: Record<string, string> = {
  csrf: "steamErrorCsrf",
  invalid_signature: "steamErrorInvalidSignature",
  persona_unavailable: "steamErrorPersonaUnavailable",
  db_failed: "steamErrorDbFailed",
  login_required_for_steam: "steamErrorLoginRequired",
  missing_state: "steamErrorMissingState",
  missing_code: "steamErrorMissingCode",
};

// debug_country: só em NÃO-produção — força o país pra testar a sugestão de região
// localmente (x-vercel-ip-country só existe atrás da Vercel). Ignorado em produção.
type SearchParams = Promise<{ error?: string; ok?: string; debug_country?: string }>;

// Banner de erro — extraído pra manter VincularSteamPage ≤ 50 linhas (per C2).
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-error/40 bg-error/10 p-4 text-sm text-text-body"
    >
      <AlertCircle
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-error"
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}

export default async function VincularSteamPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=login_required_for_steam");
  }

  // Steam link + escolha de região em paralelo (onboarding: região é escolha
  // única — o picker some depois de confirmada; migration 121).
  const [{ data: steamLink }, { data: profile }] = await Promise.all([
    supabase
      .from("steam_links")
      .select("steam_id_64, persona, avatar_url, verified_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("region_chosen")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const regionChosen =
    (profile as { region_chosen?: boolean } | null)?.region_chosen === true;

  const t = await getTranslations("account");
  const params = await searchParams;

  // Região SUGERIDA pelo IP (x-fd-country, repassado pelo middleware). Só o default
  // pré-selecionado — o usuário confirma/troca no picker. Independente do idioma.
  // Em dev/preview, ?debug_country=XX (ex.: RU) força o país pra testar sem Vercel.
  const ipCountry = (await headers()).get("x-fd-country");
  const country =
    process.env.NODE_ENV !== "production" && params.debug_country
      ? params.debug_country
      : ipCountry;
  const suggestedRegion = countryToRegion(country);
  const errorKey = params.error ? ERROR_KEYS[params.error] : undefined;
  const errorMessage = errorKey ? t(errorKey) : undefined;

  return (
    <main className="relative min-h-screen px-4 py-12 md:py-20">
      <DotaBackdrop />
      <div className="relative z-10 mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <p className="font-display font-semibold text-sm uppercase tracking-[0.35em] text-brand-primary">
            {t("steamLinkEyebrow")}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-wide text-text-display md:text-4xl">
            {t("steamLinkTitlePrefix")}{" "}
            <span
              className="text-brand-primary"
              style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
            >
              Steam
            </span>
          </h1>
          <p className="mt-3 font-body text-text-muted">
            {t("steamLinkSubtitle")}
          </p>
        </header>

        {errorMessage && <ErrorBanner message={errorMessage} />}

        {!regionChosen && <RegionPicker suggestedRegion={suggestedRegion} />}

        {steamLink ? (
          <LinkedState
            persona={steamLink.persona}
            avatarUrl={steamLink.avatar_url}
            steamId64={steamLink.steam_id_64}
          />
        ) : (
          <UnlinkedState />
        )}
      </div>
    </main>
  );
}

// Estado: SEM Steam vinculado — Card hero + CTA primary massivo (M3)
async function UnlinkedState() {
  const t = await getTranslations("account");
  return (
    <Card
      variant="hero"
      aria-labelledby="unlinked-heading"
      className="md:p-10"
    >
      <div className="mb-4 flex items-center gap-3">
        <Gamepad2 className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        <h2
          id="unlinked-heading"
          className="font-display text-xl font-semibold tracking-wide text-text-display"
        >
          {t("steamConnectHeading")}
        </h2>
      </div>
      <p className="mb-6 font-body text-sm leading-relaxed text-text-muted">
        {t("steamConnectBody")}
      </p>
      <form action={signInWithSteam}>
        <Button type="submit" variant="primary" size="lg" className="w-full">
          <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          {t("steamContinue")}
        </Button>
      </form>
    </Card>
  );
}

// Estado: COM Steam vinculado — Card elevated + revincular ghost
async function LinkedState({
  persona,
  avatarUrl,
  steamId64,
}: {
  persona: string | null;
  avatarUrl: string | null;
  steamId64: string;
}) {
  const t = await getTranslations("account");
  return (
    <Card
      variant="elevated"
      aria-labelledby="linked-heading"
      className="border-success/40 md:p-8"
    >
      <div className="mb-4 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-success" aria-hidden="true" />
        <h2
          id="linked-heading"
          className="font-display text-xl font-semibold tracking-wide text-text-display"
        >
          {t("steamLinkedHeading")}
        </h2>
      </div>

      <div className="mb-6 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={t("steamAvatarAlt", { persona: persona ?? t("steamUserFallback") })}
            className="h-16 w-16 rounded-sm border-2 border-success/60"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-16 w-16 rounded-sm border-2 border-border-strong bg-bg-deep"
          />
        )}
        <div>
          <p className="font-display text-lg font-semibold tracking-wide text-text-display">
            {persona ?? t("steamNoNickname")}
          </p>
          <p className="mt-1 font-display text-sm font-semibold text-text-body">
            {t("steamIdLabel")}: {steamId64}
          </p>
        </div>
      </div>

      {/* CTA de saída — evita o usuário ficar "preso" na tela após vincular.
          Em fluxo normal o middleware já redireciona /vincular/steam → /perfil,
          mas este botão garante saída mesmo em acesso direto. */}
      <Link
        href="/dashboard"
        className={`${buttonVariants({ variant: "primary", size: "lg" })} mb-3 w-full`}
      >
        {t("steamGoToApp")}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>

      <form action={signInWithSteam}>
        <Button type="submit" variant="ghost" size="md" className="w-full">
          {t("steamRelink")}
        </Button>
      </form>
    </Card>
  );
}
