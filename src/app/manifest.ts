import type { MetadataRoute } from "next";

// Web App Manifest (App Router idiomático). Servido em /manifest.webmanifest e
// linkado automaticamente pelo Next no <head>. Cores vêm dos tokens da marca:
// background bg-deep #0B0C0F, theme vermelho ExitLag #C42121.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FORMULADOTA",
    short_name: "FormulaDota",
    description:
      "O app da comunidade FormulaDota — lobbies in-house, ranking e doutrina de Dota 2.",
    start_url: "/",
    display: "standalone",
    lang: "pt-BR",
    background_color: "#0B0C0F",
    theme_color: "#C42121",
    orientation: "any",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
