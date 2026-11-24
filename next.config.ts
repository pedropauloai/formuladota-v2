import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { TRACKED_LINKS } from "./src/lib/loja/tracked-links";

// next-intl: aponta pra config de request (resolução de idioma por cookie/header).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // H6 — remove "X-Powered-By: Next.js" (disclosure de stack)
  experimental: {
    // Tree-shaking modular dos ícones (usados em quase todo componente) —
    // sem isso o barrel do lucide-react incha os bundles client.
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    // Na Cloudflare a otimização gasta transformações do Images (5 mil por mês no grátis,
    // depois a imagem quebra); as fontes já são CDNs, então servimos direto da origem.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      // Valve CDN — portraits de heróis Dota 2 (Phase 9)
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
      // Valve CDN principal — renders/retratos de heróis, ícones, backgrounds
      // oficiais (dota_react). Usado pelos componentes frontier/.
      { protocol: "https", hostname: "cdn.steamstatic.com" },
    ],
  },
  // ── Headers de segurança (defesa em profundidade) ──────────────────────────
  // Resolve H1..H6 do relatório de auditoria (2026-07-03). CSP em modo ENFORCE
  // apenas em produção — em dev o Turbopack/HMR usa eval e inline sem nonce, então
  // aplicar CSP local quebraria o dev server. As origens abaixo espelham os CDNs
  // já liberados em `images.remotePatterns` + Supabase (REST/Realtime) + as APIs
  // de dados (OpenDota/STRATZ). Se algo legítimo for bloqueado no console do
  // browser, adicione a origem exata aqui (evite voltar pra 'unsafe-*').
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    // Formulário de cartão do Mercado Pago (Card Payment Brick): SDK, campos protegidos em iframe,
    // ícones das bandeiras e a análise antifraude do aparelho.
    const mercadoPago = "https://*.mercadopago.com https://*.mercadolibre.com https://*.mercadolivre.com https://*.mlstatic.com";

    const csp = [
      "default-src 'self'",
      // Next.js (App Router/RSC) injeta scripts/styles inline sem nonce → precisa
      // 'unsafe-inline'. Não há script externo no app (verificado). Endurecimento
      // futuro: CSP baseada em nonce via middleware.
      // Scripts de terceiros LEGÍTIMOS: PostHog e Google Analytics (gated por env) e o Web
      // Analytics da Cloudflare, que a zona injeta sozinha (sem cookie). As origens da Vercel
      // saíram com a mudança para a Cloudflare.
      `script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com https://www.googletagmanager.com https://static.cloudflareinsights.com https://player.twitch.tv ${mercadoPago}`,
      `style-src 'self' 'unsafe-inline' ${mercadoPago}`,
      // upload.wikimedia.org: foto do Grubby no /manifesto (bloqueada antes, aparecia quebrada).
      `img-src 'self' data: blob: https://*.steamstatic.com https://cdn.discordapp.com https://*.supabase.co https://*.google-analytics.com https://us.i.posthog.com https://upload.wikimedia.org ${mercadoPago}`,
      `font-src 'self' data: ${mercadoPago}`,
      // REST + Realtime (wss) do Supabase, dados Dota, e os beacons dos analytics acima.
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.opendota.com https://api.stratz.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.google-analytics.com https://www.googletagmanager.com https://cloudflareinsights.com ${mercadoPago}`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "media-src 'self' https://*.steamstatic.com", // vídeo de fundo (montagem oficial do Dota 2)
      // Vídeo do YouTube (modo sem cookie) no /manifesto: sem frame-src valia o default-src 'self' e o vídeo não abria.
      // Player da Twitch: a live do Pedro passa na loja quando o canal está no ar (src/components/v2/twitch-live.tsx).
      // A confirmação do banco (3DS) abre a página do próprio banco, de domínio variável: qualquer https.
      "frame-src https:",
      "frame-ancestors 'none'", // H2 — anti-clickjacking (equivale a X-Frame-Options: DENY)
      "base-uri 'self'",
      // O desafio 3DS envia o formulário do Mercado Pago para a página do banco.
      "form-action 'self' https:",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" }, // H2 — cobre browsers sem suporte a frame-ancestors
      { key: "X-Content-Type-Options", value: "nosniff" }, // H3 — impede MIME sniffing
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // H4
      {
        key: "Permissions-Policy", // H5 — desliga APIs sensíveis do browser
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      {
        // Reforço do HSTS (a Vercel já envia; mantido consistente + preload)
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];

    if (isProd) {
      // H1 — Content-Security-Policy em modo enforce (produção)
      securityHeaders.push({ key: "Content-Security-Policy", value: csp });
    }

    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async redirects() {
    return [
      // Caminhos do site antigo que seguem nas descrições do YouTube. Temporários (307):
      // se uma página de verdade nascer num deles, basta tirar a linha daqui.
      { source: "/tinker", destination: "/", permanent: false },
      { source: "/tinker-no-ti", destination: "/", permanent: false },
      { source: "/rankedpt", destination: "/ranked-com-pro", permanent: false },
      { source: "/liga", destination: "/torneios", permanent: false },
      // O Compendium (passe antigo, sem motor de XP) leva para o Battlepass até a trilha nova existir.
      { source: "/compendium", destination: "/planos", permanent: false },
      // Atalhos da loja para bio e chat ("formuladota.com.br/ig"): levam à loja com a origem
      // na URL, e o beacon de visita conta de qual rede a pessoa veio.
      ...TRACKED_LINKS.map((link) => ({ source: link.shortPath, destination: link.target, permanent: false })),
      // Link curto do Battlepass para a live (chat e QR). Antes do proxy: chega sem login e sem
      // passar pela sessão. A página fica no slug em português, o público da live.
      { source: "/battlepass", destination: "/planos?utm_source=live&utm_medium=chat&utm_campaign=battlepass", permanent: false },
      {
        // apex -> www (308). RAIZ do error=exchange_failed: o cookie PKCE do OAuth é
        // gravado no domínio de ENTRADA; se o usuário começa em formuladota.com (apex)
        // mas o callback é forçado pro www (NEXT_PUBLIC_SITE_URL), o cookie não viaja
        // entre domínios e o exchangeCodeForSession falha. Forçar www ANTES de qualquer
        // fluxo de auth garante cookie + callback no mesmo domínio.
        // OBS: só funciona se o apex (formuladota.com.br) estiver ligado ao Worker na Cloudflare.
        source: "/:path*",
        has: [{ type: "host", value: "formuladota.com.br" }],
        destination: "https://www.formuladota.com.br/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(config);
