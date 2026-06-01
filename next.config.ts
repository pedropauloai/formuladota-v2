import type { NextConfig } from "next";

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
};

export default config;
