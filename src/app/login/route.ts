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
  // retry=1 vem do callback quando o exchange falhou e ele reiniciou o OAuth
  // (auto-recuperação de cookie PKCE stale). Propaga até o callback pra fechar o guard.
  const retry = request.nextUrl.searchParams.get("retry") === "1";
  await signInWithDiscordTo(next ?? undefined, retry);
  // Inalcançável: signInWithDiscordTo sempre redireciona (OAuth ou erro → "/").
  // O return existe só pra satisfazer o type do route handler.
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
