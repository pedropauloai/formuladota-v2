import { redirect } from "next/navigation";
import { Gamepad2, ShieldCheck, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signInWithSteam } from "./actions";

// Página obrigatória de vinculação Steam (Phase 3 — H1.1).
// Middleware já garante:
//   - User logado (senão redireciona pra /login)
//   - Doutrina aceita (senão redireciona pra /onboarding/doutrina)
//   - User SEM steam_link em rota privada → vem aqui
//   - User COM steam_link aqui → redireciona /perfil (Plan 03-04)
// Mas exibe os 2 estados pra acessível direto via /vincular/steam.

export const metadata = {
  title: "Vincular Steam — Fórmula Dota",
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
      className="mb-6 flex items-start gap-3 rounded-lg border border-[#A855F7]/40 bg-[#1A0A2A] p-4 text-sm text-[#f4f4f5]"
    >
      <AlertCircle
        className="h-5 w-5 text-[#A855F7] flex-shrink-0 mt-0.5"
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
    <main className="min-h-screen bg-[#050505] px-4 py-12 md:py-20">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-display text-[#f4f4f5]">
            Vincular <span className="text-[#00F0FF]">Steam</span>
          </h1>
          <p className="mt-3 text-[#a1a1aa]">
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

// Estado: SEM Steam vinculado (CTA primário cyan)
function UnlinkedState() {
  return (
    <section
      aria-labelledby="unlinked-heading"
      className="rounded-xl border border-[#00F0FF]/30 bg-[#0A0A1A] p-6 md:p-8"
    >
      <div className="mb-4 flex items-center gap-3">
        <Gamepad2 className="h-6 w-6 text-[#00F0FF]" aria-hidden="true" />
        <h2 id="unlinked-heading" className="text-xl font-display text-[#f4f4f5]">
          Conecte sua conta Steam
        </h2>
      </div>
      <p className="mb-6 text-[#a1a1aa] text-sm leading-relaxed">
        Você vai abrir a página oficial da Steam, autorizar o Fórmula Dota
        e voltar pra cá automaticamente. Sua senha NUNCA passa pelo nosso
        servidor — autenticação direto com a Valve.
      </p>
      <form action={signInWithSteam}>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00F0FF] px-6 py-3 font-medium text-black transition-colors hover:bg-[#00F0FF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]/50"
        >
          <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          Continuar com Steam
        </button>
      </form>
    </section>
  );
}

// Estado: COM Steam vinculado (card verde + revincular secundário)
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
    <section
      aria-labelledby="linked-heading"
      className="rounded-xl border border-emerald-500/40 bg-[#0A0A1A] p-6 md:p-8"
    >
      <div className="mb-4 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-400" aria-hidden="true" />
        <h2 id="linked-heading" className="text-xl font-display text-[#f4f4f5]">
          Steam vinculado
        </h2>
      </div>

      <div className="mb-6 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={`Avatar de ${persona ?? "usuário Steam"}`}
            className="h-16 w-16 rounded-full border-2 border-emerald-400/60"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-16 w-16 rounded-full border-2 border-[#27272a] bg-[#050505]"
          />
        )}
        <div>
          <p className="text-lg font-display text-[#f4f4f5]">
            {persona ?? "Sem nickname"}
          </p>
          <p className="text-xs text-[#a1a1aa] font-mono mt-1">
            SteamID 64: {steamId64}
          </p>
        </div>
      </div>

      <form action={signInWithSteam}>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#27272a] bg-transparent px-6 py-3 font-medium text-[#a1a1aa] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]/30"
        >
          Revincular outra conta Steam
        </button>
      </form>
    </section>
  );
}
