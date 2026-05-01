import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { DOCTRINE_VERSION } from "@/lib/doctrine";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Rotas que NÃO exigem aceite da doutrina (mesmo logado).
// Tudo o mais pra usuário autenticado é bloqueado até aceitar.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/codigo-de-conduta",
  "/privacidade",
  "/cookies",
];

const AUTH_FLOW_PATHS = ["/auth", "/api/auth", "/api/webhooks"];
const ONBOARDING_PATHS = ["/onboarding/doutrina"];
const BLOCKED_STATUS_PATHS = ["/suspended", "/banned"];

function isPathInList(pathname: string, list: string[]): boolean {
  return list.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

// Refresh da sessão Supabase + enforcement de cultura.
// Chamado a partir de src/proxy.ts.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() força refresh do cookie de sessão.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas de fluxo de auth/webhook nunca são bloqueadas — preserva callback OAuth + webhooks externos.
  if (isPathInList(pathname, AUTH_FLOW_PATHS)) {
    return response;
  }

  // Sem usuário logado? Apenas rotas públicas seguem.
  if (!user) {
    return response;
  }

  // Usuário logado. Enforcement em camadas:
  // 1. Status de comportamento (banned > suspended > warned/ok)
  // 2. Aceite da doutrina

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "doctrine_accepted_at, doctrine_version, behavior_status, suspended_until"
    )
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Trigger handle_new_user deveria ter criado profile no signup.
    // Se chegou aqui sem profile, deixa passar — Server Component da rota lida.
    return response;
  }

  // Banido — sempre redireciona pra /banned, exceto se já estiver lá.
  if (profile.behavior_status === "banned") {
    if (pathname === "/banned") return response;
    return NextResponse.redirect(new URL("/banned", request.url));
  }

  // Suspenso e ainda dentro do prazo — vai pra /suspended.
  if (
    profile.behavior_status === "suspended" &&
    profile.suspended_until &&
    new Date(profile.suspended_until) > new Date()
  ) {
    if (pathname === "/suspended") return response;
    return NextResponse.redirect(new URL("/suspended", request.url));
  }

  // Sem aceite da doutrina (ou versão obsoleta) — força onboarding.
  const accepted =
    profile.doctrine_accepted_at !== null &&
    profile.doctrine_version === DOCTRINE_VERSION;

  if (!accepted) {
    // Permite páginas públicas + onboarding em si.
    if (
      isPathInList(pathname, PUBLIC_PATHS) ||
      isPathInList(pathname, ONBOARDING_PATHS)
    ) {
      return response;
    }
    return NextResponse.redirect(new URL("/onboarding/doutrina", request.url));
  }

  // Já aceitou + status ok/warned: sem restrição.
  // Mas se estiver navegando em /onboarding ou /suspended/banned indevidamente, manda pra perfil.
  if (
    isPathInList(pathname, ONBOARDING_PATHS) ||
    isPathInList(pathname, BLOCKED_STATUS_PATHS)
  ) {
    return NextResponse.redirect(new URL("/perfil", request.url));
  }

  return response;
}
