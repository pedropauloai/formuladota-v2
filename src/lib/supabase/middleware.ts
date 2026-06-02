import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { DOCTRINE_VERSION } from "@/lib/doctrine";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Rotas PÚBLICAS — acessíveis SEM login. Visitante deslogado consome normalmente
// (ClientShell tolera user === null). Servem como vitrine/marketing antes do cadastro.
// Qualquer rota FORA desta lista exige login: o middleware redireciona visitante
// deslogado pra /login?next=<rota> (Discord OAuth, com retorno à rota pretendida).
//
// Esta lista é a ÚNICA fonte de verdade do gate de autenticação. Não espalhar
// `if (!user) redirect(...)` nas páginas — o middleware barra antes de renderizar.
//
// Decisão Pedro (2026-05-31): além da base institucional, ranking + perfis públicos
// + metodologia ficam abertos como vitrine. Subir MMR, fila, checkout, etc. exigem login.
const PUBLIC_PATHS = [
  "/",
  "/codigo-de-conduta",
  "/privacidade",
  "/cookies",
  "/metodologia",
  "/ranking",
  "/coaches", // /coaches/[slug] — perfis públicos de PROs
];

// Login: rota que dispara o Discord OAuth. NUNCA gateada (senão loop infinito).
const LOGIN_PATHS = ["/login"];

const AUTH_FLOW_PATHS = ["/auth", "/api/auth", "/api/webhooks"];

// Opcao C (Pedro 2026-06-02): a doutrina NAO gateia navegacao. So as rotas de "jogar"
// (lobby/partida in-house) exigem o Ritual completo (nivel 6 / doctrine_accepted). O ritual
// fica em /doutrina (acessivel a todos os logados; nudge via UI). "Experiencia primeiro,
// doutrina pra agir" — alinha com o modelo freemium e o POSITIONING.
const DOCTRINE_REQUIRED_PATHS = ["/lobbies", "/criar-lobby", "/partidas"];
const BLOCKED_STATUS_PATHS = ["/suspended", "/banned"];

// Rotas que exigem Steam vinculado (Phase 3 — H1.1).
// User logado, com doutrina aceita, mas sem registro em steam_links → redirect /vincular/steam.
// O próprio /vincular/steam NÃO está na lista (senão loop infinito); a checagem
// "user já vinculado em /vincular/steam → /perfil" é feita separadamente.
const STEAM_REQUIRED_PATHS = [
  "/pacotes",
  "/checkout",
  "/partidas",
  "/perfil",
  "/me",
  "/dashboard",
  "/assinatura",
  "/criar-lobby",
  "/lobbies",
  "/ranking",
  "/admin",
];
const STEAM_LINK_PATH = "/vincular/steam";

function isPathInList(pathname: string, list: string[]): boolean {
  return list.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

// Perfil público de jogador: /perfil/[steamid] é vitrine (aberto), MAS /perfil
// (exato) é o perfil privado do user logado (exige login). Por isso não dá pra
// pôr "/perfil" em PUBLIC_PATHS (casaria os dois) — checamos o sub-path aqui.
function isPublicPlayerProfile(pathname: string): boolean {
  return pathname.startsWith("/perfil/") && pathname !== "/perfil";
}

// Uma rota é pública (sem login) se está em PUBLIC_PATHS OU é perfil público de jogador.
function isPublicPath(pathname: string): boolean {
  return isPathInList(pathname, PUBLIC_PATHS) || isPublicPlayerProfile(pathname);
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
  // /login também passa livre (é onde o visitante dispara o OAuth — gateá-la seria loop).
  if (
    isPathInList(pathname, AUTH_FLOW_PATHS) ||
    isPathInList(pathname, LOGIN_PATHS)
  ) {
    return response;
  }

  // GATE DE AUTENTICAÇÃO (fonte única de verdade):
  // Visitante deslogado só acessa rotas públicas. Qualquer outra rota →
  // redireciona pro Discord OAuth (/login?next=<rota>), preservando a rota
  // pretendida pra voltar pra ela após o login.
  if (!user) {
    if (isPublicPath(pathname)) {
      return response;
    }
    const loginUrl = new URL("/login", request.url);
    // Preserva path + query da rota pretendida pra retorno pós-login.
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
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
    // Opcao C: navegar livre sem doutrina. So as rotas de "jogar/agir" exigem o ritual.
    if (isPathInList(pathname, DOCTRINE_REQUIRED_PATHS)) {
      return NextResponse.redirect(new URL("/doutrina", request.url));
    }
    return response;
  }

  // Camada Steam (Phase 3 — H1.1): aplicada APÓS doutrina aceita.
  // Buscamos steam_link no máximo 1x por request (apenas em rotas que precisam).
  // Query é cheap — PK lookup em (user_id) com RLS permitindo o user ler própria linha.
  const needsSteamCheck =
    pathname === STEAM_LINK_PATH ||
    isPathInList(pathname, STEAM_REQUIRED_PATHS);

  if (needsSteamCheck) {
    const { data: steamLink, error: steamErr } = await supabase
      .from("steam_links")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (steamErr) {
      // Fail-open: erro de infra (DB indisponível, RLS quebrada) NÃO bloqueia user.
      // Se não conseguimos saber se o user tem Steam vinculado, é melhor liberar a request
      // (RLS continua protegendo dados sensíveis nas tabelas de destino) do que prender
      // todo mundo numa tela de "vincular Steam" enquanto a infra está com problema.
      console.error("[middleware] steam_links query failed:", steamErr);
      return response;
    }

    // User SEM Steam vinculado tentando rota protegida → manda pra /vincular/steam.
    if (!steamLink && isPathInList(pathname, STEAM_REQUIRED_PATHS)) {
      return NextResponse.redirect(new URL("/vincular/steam", request.url));
    }

    // User COM Steam vinculado em /vincular/steam → vai pra /perfil
    // (página /vincular/steam ainda renderiza estado vinculado se acessada diretamente,
    // mas em flow normal este redirect leva o user direto pra dashboard pós-onboarding).
    if (steamLink && pathname === STEAM_LINK_PATH) {
      return NextResponse.redirect(new URL("/perfil", request.url));
    }
  }

  // Já aceitou + status ok/warned: sem restrição.
  // Mas se estiver navegando em /onboarding ou /suspended/banned indevidamente, manda pra perfil.
  if (
    pathname === "/doutrina" ||
    isPathInList(pathname, BLOCKED_STATUS_PATHS)
  ) {
    return NextResponse.redirect(new URL("/perfil", request.url));
  }

  return response;
}
