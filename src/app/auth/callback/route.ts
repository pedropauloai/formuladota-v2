import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback do Discord OAuth — Supabase troca o "code" por uma sessão e seta o cookie.
// O trigger handle_new_user() no Postgres garante que o profile seja criado automaticamente.
// Só aceita destinos internos (path absoluto sem "//") — evita open redirect.
function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

// Limpa TODOS os cookies de auth do Supabase no response — sessão + code_verifier do
// PKCE, incluindo as variantes chunked (sb-...-auth-token.0/.1). Um code_verifier STALE
// (sobra de uma tentativa anterior) é a causa #1 do exchange_failed: o verifier guardado
// não bate com o challenge enviado ao Discord → POST /token 400. Limpar tudo garante um
// fluxo OAuth virgem no retry, sem depender de o usuário limpar cookies manualmente.
function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirect(searchParams.get("redirect_to"));
  // Guard anti-loop: se já é a 2ª tentativa (os cookies já foram limpos uma vez) e ainda
  // falhou, é problema real (config Supabase/Discord), não cookie stale → não reinicia.
  const isRetry = searchParams.get("retry") === "1";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession falhou:", error.message);

    if (!isRetry) {
      // AUTO-RECUPERAÇÃO (sem ação do usuário): limpa os cookies sb-* corrompidos e
      // reinicia o OAuth do zero. Como o Discord já autorizou a app, o re-login é
      // instantâneo (sem nova tela de consent) — o usuário só vê 1 redirect extra e
      // cai logado. É o que ANTES exigia "limpar cookies do site" na mão.
      const restart = new URL("/login", origin);
      restart.searchParams.set("next", redirectTo);
      restart.searchParams.set("retry", "1");
      const res = NextResponse.redirect(restart);
      clearSupabaseAuthCookies(request, res);
      return res;
    }

    // 2ª falha consecutiva mesmo com cookies limpos → erro genuíno (config), exibe a tela.
    const res = NextResponse.redirect(`${origin}/?error=exchange_failed`);
    clearSupabaseAuthCookies(request, res);
    return res;
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
