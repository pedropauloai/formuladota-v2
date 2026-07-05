import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

    const csp = [
      "default-src 'self'",
      // Next.js (App Router/RSC) injeta scripts/styles inline sem nonce → precisa
      // 'unsafe-inline'. Não há script externo no app (verificado). Endurecimento
      // futuro: CSP baseada em nonce via middleware.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.steamstatic.com https://cdn.discordapp.com https://*.supabase.co",
      "font-src 'self' data:",
      // REST + Realtime (wss) do Supabase, e fetches de dados Dota.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.opendota.com https://api.stratz.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "media-src 'self' https://*.steamstatic.com", // vídeo de fundo (montagem oficial do Dota 2)
      "frame-ancestors 'none'", // H2 — anti-clickjacking (equivale a X-Frame-Options: DENY)
      "base-uri 'self'",
      "form-action 'self'",
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
      {
        // apex -> www (308). RAIZ do error=exchange_failed: o cookie PKCE do OAuth é
        // gravado no domínio de ENTRADA; se o usuário começa em formuladota.com (apex)
        // mas o callback é forçado pro www (NEXT_PUBLIC_SITE_URL), o cookie não viaja
        // entre domínios e o exchangeCodeForSession falha. Forçar www ANTES de qualquer
        // fluxo de auth garante cookie + callback no mesmo domínio.
        // OBS: só funciona se o apex (formuladota.com) estiver apontado pro app na Vercel.
        source: "/:path*",
        has: [{ type: "host", value: "formuladota.com" }],
        destination: "https://www.formuladota.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(config);
