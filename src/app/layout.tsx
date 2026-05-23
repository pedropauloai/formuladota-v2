import type { Metadata } from "next";
// Fontes V2.5 — self-hosted via pacotes npm (sem requisição Google Fonts)
// Cinzel Variable — display/headings (substitui Cinzel via next/font/google)
import "@fontsource-variable/cinzel";
// Geist — body/UI/botões via Vercel package (substitui Inter)
import { GeistSans, GeistMono } from "geist/font";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ConditionalChrome } from "@/components/layout/conditional-chrome";
import { StickyQueueBanner } from "@/components/queue/sticky-banner";
import { QueueRealtimeListener } from "@/components/queue/realtime-listener";

export const metadata: Metadata = {
  title: "FORMULADOTA — HUB Dota 2 Brasil",
  description:
    "FORMULADOTA: o HUB Dota 2 brasileiro. Lobbies in-house, ranking por temporadas, doutrina cultural. Comunidade alinhada culturalmente, integrada a Discord e Steam.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* data-theme="fd-dark" — V2.5 token layer.
     * Arquitetura suporta data-theme="radiant" / "dire" no futuro
     * sem refactor de nenhum componente (CSS vars redefinem automaticamente).
     * GeistSans.variable expõe --font-geist-sans como CSS var no DOM. */
    <html
      lang="pt-BR"
      data-theme="fd-dark"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen flex flex-col font-body">
        {/* Sticky banner persistente — aparece em todas as rotas se user em fila */}
        <StickyQueueBanner />
        {/* Realtime listener (client) — sem UI, escuta changes em queue */}
        <QueueRealtimeListener />
        {/* Header/Footer ocultos em /dashboard (fullscreen estilo client Dota 2) */}
        <ConditionalChrome>
          <Header />
        </ConditionalChrome>
        <div className="flex-1">{children}</div>
        <ConditionalChrome>
          <Footer />
        </ConditionalChrome>
        {/* Toaster global — qualquer Client Component pode chamar toast() */}
        <Toaster />
      </body>
    </html>
  );
}
