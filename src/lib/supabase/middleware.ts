import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { DOCTRINE_VERSION } from "@/lib/doctrine";
import {
  type Locale,
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
  localeFromCountry,
} from "@/i18n/config";
import { internalizePath, localizePath, localeFromPath } from "@/i18n/pathnames";

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
  "/manifesto", // landing/manifesto "Por que FormulaDota" — vitrine de conversão
  "/codigo-de-conduta",
  "/privacidade",
  "/cookies",
  "/metodologia",
  "/ranking",
  "/mmr", // leitura pública: guia didático de como funciona o MMR — vitrine de valor
  "/meta", // leitura pública: meta de heróis (OpenDota) — vitrine de valor
  "/times", // leitura pública: browse de times + perfis (ações pedem login)
  "/torneios", // leitura pública: browse de torneios + brackets (ações pedem login)
  "/partidas", // leitura pública: feed de partidas (placares públicos, anti-anonimato) —
  //              vitrine igual /ranking; ações (jogar) pedem login. Pedro 2026-07-06.
  "/coaches", // /coaches/[slug] — perfis públicos de PROs
  "/partida/historico", // placar pós-jogo PÚBLICO (dados públicos, anti-anonimato) —
  //                        precisa ser aberto pro Discord/redes desdobrarem o og:image do link
  "/planos", // vitrine dos planos de assinatura (Compendium) — conversão
  "/assinatura", // redirect legado → /planos; público pra back_urls antigos do MP chegarem lá
  "/loja", // loja (06/11/2026): vitrine, produto e página do pedido abertos; serviço compra sem login
  "/sitemap.xml", // SEO — rotas Next (app/sitemap.ts e app/robots.ts); gatear
  "/robots.txt", //  redirecionaria o crawler pra home e mataria a indexação
];

// Login: rota que dispara o Discord OAuth. NUNCA gateada (senão loop infinito).
const LOGIN_PATHS = ["/login"];

// /api/cron: jobs sistêmicos (sem sessão) — têm auth próprio (CRON_SECRET). Sem
// isso o middleware redirecionava (307) e o pg_net nunca chegava na rota.
// /api/visita: beacon de visita da medição por origem, chamado também por visitante deslogado.
const AUTH_FLOW_PATHS = ["/auth", "/api/auth", "/api/webhooks", "/api/cron", "/api/visita"];

// Pedro 2026-06-03: o gate de "jogar" deixou de ser "doutrina 100% completa" e virou
// PERMISSAO (5 acertos = 1 permissao), aplicada na RLS + pop-up de perguntas no fluxo de
// jogar (ver memory/project_match_permissions). Por isso NENHUMA rota e mais redirecionada
// pra /doutrina — navegar (lobbies, partidas) e livre pra logado; agir pede permissao.
// O ritual /doutrina segue acessivel a todos (entrada pela UI / pop-up).
const DOCTRINE_REQUIRED_PATHS: string[] = [];
const BLOCKED_STATUS_PATHS = ["/suspended", "/banned"];

// Rotas que exigem Steam vinculado (Phase 3 — H1.1).
// User logado, com doutrina aceita, mas sem registro em steam_links → redirect /vincular/steam.
// O próprio /vincular/steam NÃO está na lista (senão loop infinito); a checagem
// "user já vinculado em /vincular/steam → /perfil" é feita separadamente.
// Nota (Pedro 2026-06-03): "/lobbies" saiu daqui — NAVEGAR salas é livre pra logado
// (vitrine). Criar lobby (/criar-lobby) ainda exige Steam (o bot precisa convidar).
// "/assinatura" saiu (2026-07-04): virou redirect permanente pra /planos
// (pública) — gateá-la mandava retornos de pagamento pro /vincular/steam.
const STEAM_REQUIRED_PATHS = [
  "/pacotes",
  "/checkout",
  // "/partidas" saiu (Pedro 2026-07-06): virou rota PÚBLICA (vitrine) — não pode exigir
  // Steam nem login. Ver PUBLIC_PATHS.
  "/perfil",
  "/me",
  "/dashboard",
  "/criar-lobby",
  "/ranking",
  "/admin",
];
const STEAM_LINK_PATH = "/vincular/steam";

function isPathInList(pathname: string, list: string[]): boolean {
  return list.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

// Perfil público de jogador: /perfil/u/[userId] é vitrine (aberta a membros),
// MAS /perfil (exato) é alias legado que redireciona pro /me. Por isso não dá pra
// pôr "/perfil" em PUBLIC_PATHS (casaria os dois) — checamos o sub-path aqui.
function isPublicPlayerProfile(pathname: string): boolean {
  return pathname.startsWith("/perfil/") && pathname !== "/perfil";
}

// Uma rota é pública (sem login) se está em PUBLIC_PATHS OU é perfil público de jogador.
function isPublicPath(pathname: string): boolean {
  return isPathInList(pathname, PUBLIC_PATHS) || isPublicPlayerProfile(pathname);
}

// --- i18n: slugs traduzidos (sem prefixo de rota) --------------------------
// NÃO usamos o middleware do next-intl (exigiria mover tudo pra app/[locale]/).
// Aqui resolvemos o locale, rodamos a auth no path interno (canônico PT),
// localizamos os redirects e, no fim, reescrevemos slug traduzido → interno
// (/tournaments|/torneos → /torneios) pra servir a estrutura de pastas plana.
//
// Slug exclusivo de um idioma é AUTORIDADE; rota compartilhada resolve por
// cookie → Accept-Language → país (ver src/i18n/config.ts).

// Refresh da sessão Supabase + enforcement de cultura + i18n.
// Chamado a partir de src/proxy.ts.
export async function updateSession(request: NextRequest) {
  const rawPath = request.nextUrl.pathname;
  // Path "interno" (canônico PT, sem slug traduzido) — TODA a auth opera sobre ele.
  const pathname = internalizePath(rawPath);

  // Idioma: slug exclusivo de um idioma manda (/tournaments = en, /torneios = pt,
  // /torneos = es). Rota compartilhada/ambígua: cookie NEXT_LOCALE (escolha manual
  // SEMPRE vence) → Accept-Language (pt*→pt, es*→es, resto→en) →
  // x-vercel-ip-country (BR→pt, América hispânica→es) → en.
  const slugLocale = localeFromPath(rawPath);
  let locale: Locale;
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (slugLocale) {
    locale = slugLocale;
  } else if (isLocale(cookie)) {
    locale = cookie;
  } else {
    locale =
      localeFromAcceptLanguage(request.headers.get("accept-language")) ??
      localeFromCountry(request.headers.get("x-vercel-ip-country"));
  }

  // Header com o locale resolvido — lido por src/i18n/request.ts (next-intl).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-fd-locale", locale);

  // País do IP (x-vercel-ip-country) repassado como x-fd-country pro onboarding
  // SUGERIR a região de jogo (countryToRegion). É um EIXO INDEPENDENTE do idioma:
  // só expomos o país cru; quem decide região é o onboarding, não a lógica de locale.
  requestHeaders.set(
    "x-fd-country",
    request.headers.get("x-vercel-ip-country") ?? ""
  );

  // Redirects de auth → no slug do idioma atual (ex.: en → /profile, /code-of-conduct).
  const localizedUrl = (path: string) =>
    new URL(localizePath(path, locale), request.url);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // Resposta final de "permitir": se a URL trazia slug traduzido, reescreve pro
  // path interno (serve a rota plana) carregando os cookies de sessão do Supabase.
  const needsRewrite = pathname !== rawPath;
  const allow = (): NextResponse => {
    if (!needsRewrite) return response;
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const rewritten = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    response.cookies.getAll().forEach((c) => rewritten.cookies.set(c));
    return rewritten;
  };

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
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() força refresh do cookie de sessão.
  //
  // RESILIÊNCIA (fix do "site caiu" 2026-07-05): quando várias requests/abas batem
  // juntas com o JWT expirado, o refresh do token pode falhar com
  // "Too many concurrent token refresh requests" (AuthApiError 409). Sem tratamento,
  // a exceção subia e a PÁGINA do usuário dava 500 (afetava só a sessão dele). Como a
  // sessão AINDA existe (o token só não pôde renovar naquele instante), a resposta
  // correta é NÃO derrubar nem expulsar: deixa a request passar com os cookies atuais
  // — a próxima request renova. RLS + auth no server component seguem protegendo.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("[middleware] auth.getUser falhou (refresh transitório?):", err);
    return allow();
  }

  // Rotas de fluxo de auth/webhook nunca são bloqueadas — preserva callback OAuth + webhooks externos.
  // /login também passa livre (é onde o visitante dispara o OAuth — gateá-la seria loop).
  if (
    isPathInList(pathname, AUTH_FLOW_PATHS) ||
    isPathInList(pathname, LOGIN_PATHS)
  ) {
    return allow();
  }

  // GATE DE AUTENTICAÇÃO (fonte única de verdade):
  // Visitante deslogado só acessa rotas públicas. Qualquer outra rota →
  // redireciona pro Discord OAuth (/login?next=<rota>), preservando a rota
  // pretendida pra voltar pra ela após o login.
  if (!user) {
    if (isPublicPath(pathname)) {
      return allow();
    }
    // Deslogado em rota protegida → manda pra HOME pública (HUB visitante, com CTA Entrar).
    // CRÍTICO (raiz do exchange_failed): o gate NÃO dispara OAuth automaticamente. Cada
    // chamada de signInWithOAuth regenera o code_verifier do PKCE; quando o gate mandava
    // prefetches/navegações pro /login (que dispara OAuth), o verifier do login REAL era
    // sobrescrito → no callback o /token retornava 400. Agora o OAuth só acontece no clique
    // explícito no "Entrar" (form action signInWithDiscord). Redirect same-origin → sem CORS.
    return NextResponse.redirect(localizedUrl("/"));
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
    return allow();
  }

  // Banido — sempre redireciona pra /banned, exceto se já estiver lá.
  if (profile.behavior_status === "banned") {
    if (pathname === "/banned") return allow();
    return NextResponse.redirect(localizedUrl("/banned"));
  }

  // Suspenso e ainda dentro do prazo — vai pra /suspended.
  if (
    profile.behavior_status === "suspended" &&
    profile.suspended_until &&
    new Date(profile.suspended_until) > new Date()
  ) {
    if (pathname === "/suspended") return allow();
    return NextResponse.redirect(localizedUrl("/suspended"));
  }

  // Camada Steam (Phase 3 — H1.1) — roda ANTES da doutrina (Pedro 2026-06-27).
  // Por que antes: a camada de doutrina abaixo faz `return allow()` cedo quando o
  // ritual ainda não foi aceito. Se a checagem de Steam ficasse depois, um usuário
  // NOVO (sem doutrina) nunca seria empurrado pra vincular a Steam pós-login Discord,
  // e ficaria "preso" em /vincular/steam sem o redirect de saída. Mover pra cá garante
  // o fluxo Discord → vincular Steam → app independente do estado da doutrina.
  // Buscamos steam_link no máximo 1x por request (apenas em rotas que precisam).
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
      return allow();
    }

    // User SEM Steam vinculado tentando rota protegida → manda pra /vincular/steam.
    if (!steamLink && isPathInList(pathname, STEAM_REQUIRED_PATHS)) {
      return NextResponse.redirect(localizedUrl("/vincular/steam"));
    }

    // User COM Steam vinculado em /vincular/steam → vai pro /me (perfil canônico
    // estilo Dota 2). Antes ia pra /perfil (página de conta legada) — corrigido.
    if (steamLink && pathname === STEAM_LINK_PATH) {
      return NextResponse.redirect(localizedUrl("/me"));
    }
  }

  // Sem aceite da doutrina (ou versão obsoleta) — força onboarding.
  const accepted =
    profile.doctrine_accepted_at !== null &&
    profile.doctrine_version === DOCTRINE_VERSION;

  if (!accepted) {
    // Opcao C: navegar livre sem doutrina. So as rotas de "jogar/agir" exigem o ritual.
    if (isPathInList(pathname, DOCTRINE_REQUIRED_PATHS)) {
      return NextResponse.redirect(localizedUrl("/doutrina"));
    }
    return allow();
  }

  // Já aceitou + status ok/warned: sem restrição.
  // Mas se estiver navegando em /onboarding ou /suspended/banned indevidamente, manda pro /me.
  if (
    pathname === "/doutrina" ||
    isPathInList(pathname, BLOCKED_STATUS_PATHS)
  ) {
    return NextResponse.redirect(localizedUrl("/me"));
  }

  return allow();
}
