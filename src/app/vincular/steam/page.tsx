import { redirect } from "next/navigation";
import { Gamepad2, ShieldCheck, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signInWithSteam } from "./actions";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Página obrigatória de vinculação Steam (Phase 3 — H1.1).
// Middleware já garante:
//   - User logado (senão redireciona pra /login)
//   - Doutrina aceita (senão redireciona pra /onboarding/doutrina)
//   - User SEM steam_link em rota privada → vem aqui
//   - User COM steam_link aqui → redireciona /perfil (Plan 03-04)
// Mas exibe os 2 estados pra acessível direto via /vincular/steam.

export const metadata = {
  title: "Vincular Steam — FORMULADOTA",
  description:
    "Vincule sua conta Steam pra liberar pacotes e (em breve) lobbies in-house.",
};

const ERROR_MESSAGES: Record<string, string> = {
  csrf:
    "Sua sessão de vinculação expirou ou o link veio adulterado. Tenta de novo — gerar um novo state é instantâneo.",
  invalid_signature:
    "A resposta da Steam veio com assinatura inválida. Tenta de novo — se persistir, fala com a gente no Discord.",
  persona_unavailable:
    "Conseguimos validar sua Steam, mas o servidor da Steam não devolveu seu nickname. Tenta de novo em alguns minutos.",
  db_failed:
    "Falha ao registrar seu vínculo no banco. Tenta de novo — se persistir, fala com a gente no Discord.",
  login_required_for_steam:
    "Faça login com Discord primeiro — depois te trazemos de volta.",
  missing_state:
    "O retorno da Steam veio sem o parâmetro de segurança. Tenta de novo.",
  missing_code:
    "O retorno da Steam veio incompleto. Tenta de novo.",
};

type SearchParams = Promise<{ error?: string; ok?: string }>;

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

  const { data: steamLink } = await supabase
    .from("steam_links")
    .select("steam_id_64, persona, avatar_url, verified_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <main className="relative min-h-screen px-4 py-12 md:py-20">
      <DotaBackdrop />
      <div className="relative z-10 mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <p className="font-mono text-sm uppercase tracking-[0.35em] text-brand-primary">
            identidade gamer
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-wide text-text-display md:text-4xl">
            Vincular{" "}
            <span
              className="text-brand-primary"
              style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
            >
              Steam
            </span>
          </h1>
          <p className="mt-3 font-body text-text-muted">
            Identidade gamer obrigatória para acessar pacotes e lobbies.
          </p>
        </header>

        {errorMessage && <ErrorBanner message={errorMessage} />}

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
function UnlinkedState() {
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
          Conecte sua conta Steam
        </h2>
      </div>
      <p className="mb-6 font-body text-sm leading-relaxed text-text-muted">
        Você vai abrir a página oficial da Steam, autorizar o FORMULADOTA
        e voltar pra cá automaticamente. Sua senha NUNCA passa pelo nosso
        servidor — autenticação direto com a Valve.
      </p>
      <form action={signInWithSteam}>
        <Button type="submit" variant="primary" size="lg" className="w-full">
          <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          Continuar com Steam
        </Button>
      </form>
    </Card>
  );
}

// Estado: COM Steam vinculado — Card elevated + revincular ghost
function LinkedState({
  persona,
  avatarUrl,
  steamId64,
}: {
  persona: string | null;
  avatarUrl: string | null;
  steamId64: string;
}) {
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
          Steam vinculado
        </h2>
      </div>

      <div className="mb-6 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={`Avatar de ${persona ?? "usuário Steam"}`}
            className="h-16 w-16 rounded-full border-2 border-success/60"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-16 w-16 rounded-full border-2 border-border-strong bg-bg-deep"
          />
        )}
        <div>
          <p className="font-display text-lg font-semibold tracking-wide text-text-display">
            {persona ?? "Sem nickname"}
          </p>
          <p className="mt-1 font-display text-sm font-semibold text-text-body">
            SteamID 64: {steamId64}
          </p>
        </div>
      </div>

      <form action={signInWithSteam}>
        <Button type="submit" variant="ghost" size="md" className="w-full">
          Revincular outra conta Steam
        </Button>
      </form>
    </Card>
  );
}
