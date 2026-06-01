"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

// Valida o destino pós-login: só aceita paths internos (começando com "/" e
// sem "//" de protocol-relative) pra evitar open redirect pra domínio externo.
function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

// Núcleo do fluxo Discord OAuth. `next` = rota pra voltar pós-login (?next=).
// Sempre redireciona (pro Discord em sucesso, ou pra "/" em erro).
async function startDiscordOAuth(next?: string): Promise<never> {
  const supabase = await createClient();

  // Base do redirect: em produção, SEMPRE usar NEXT_PUBLIC_SITE_URL (domínio
  // canônico). O header `origin` é fallback só pra dev/preview — atrás do proxy
  // da Vercel ele pode vir ausente/errado, e se cair pra um valor inesperado o
  // Supabase ignora o redirectTo (fora da allowlist) e usa o Site URL dele,
  // mandando o user pra localhost. Priorizar a env var blinda contra isso.
  const configured = publicEnv.NEXT_PUBLIC_SITE_URL;
  const headerStore = await headers();
  const origin =
    configured && configured.startsWith("https://")
      ? configured
      : headerStore.get("origin") ?? configured;

  // Pós-login, o callback OAuth lê `redirect_to` e leva o user de volta à rota
  // que ele tentava acessar (?next=). Default: /dashboard.
  const redirectTo = `${origin}/auth/callback?redirect_to=${encodeURIComponent(
    safeNext(next)
  )}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo,
      scopes: "identify email",
    },
  });

  if (error) {
    console.error("[auth] erro Discord OAuth:", error.message);
    // Task #67 (2026-05-24): /login deletado — visitante volta pro HUB
    // (HubCenter rendereriza CTA Entrar no header via EntrarBadge).
    redirect("/?error=oauth");
  }

  redirect(data.url!);
}

// Server Action pra usar como `action={signInWithDiscord}` em <form>.
// Recebe FormData (assinatura exigida pelo React) e dispara o OAuth sem `next`
// (volta pro /dashboard padrão). Para login COM retorno à rota pretendida,
// use a rota GET /login?next=<rota> (gate do middleware) → signInWithDiscordTo.
export async function signInWithDiscord(_formData?: FormData) {
  await startDiscordOAuth();
}

// Variante chamável com a rota de retorno. Usada pela rota /login (route handler),
// que recebe ?next=<rota> do middleware e devolve o user pra lá após o login.
export async function signInWithDiscordTo(next?: string) {
  await startDiscordOAuth(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
