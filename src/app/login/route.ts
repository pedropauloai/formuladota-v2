import { type NextRequest } from "next/server";
import { signInWithDiscordTo } from "@/app/login/actions";

// Rota /login — gate de autenticação. O middleware (src/lib/supabase/middleware.ts)
// redireciona todo visitante deslogado que acessa rota protegida pra cá, com
// ?next=<rota pretendida>. Aqui disparamos o Discord OAuth na hora; pós-login o
// callback (/auth/callback?redirect_to=...) devolve o user à rota original.
//
// signInWithDiscordTo() chama redirect() internamente (lança NEXT_REDIRECT), então
// NÃO envolvemos em try/catch — a exceção de redirect deve propagar pro Next.
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  await signInWithDiscordTo(next ?? undefined);
  // Inalcançável: signInWithDiscordTo sempre redireciona (OAuth ou erro → "/").
  // O return existe só pra satisfazer o type do route handler.
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
