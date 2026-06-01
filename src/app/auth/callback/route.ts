import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback do Discord OAuth — Supabase troca o "code" por uma sessão e seta o cookie.
// O trigger handle_new_user() no Postgres garante que o profile seja criado automaticamente.
// Só aceita destinos internos (path absoluto sem "//") — evita open redirect.
function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirect(searchParams.get("redirect_to"));

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession falhou:", error.message);
    return NextResponse.redirect(`${origin}/?error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
