import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl: aponta pra config de request (resolução de idioma por cookie/header).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  reactStrictMode: true,
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
