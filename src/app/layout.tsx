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
// V2.5-F5: Sound infrastructure — singleton Howler + mobile autoplay gate (DF5.1, DF5.4, DF5.6)
import { SoundProvider } from "@/components/layout/sound-provider";
import { StickyQueueBanner } from "@/components/queue/sticky-banner";
import { QueueRealtimeListener } from "@/components/queue/realtime-listener";
// V2.5-F6: ToastProvider — sistema de toasts bottom-center custom (DF6.4)
// Substitui Sonner como novo padrão para features V2.5+.
// sonner.tsx mantido como compat layer para código legado.
import { ToastProvider } from "@/components/ui/toast";
// V2.5-F3: Camada atmosférica root-level com tsParticles (DF3.1)
// position:fixed, z-index:var(--z-atmosphere)=-10, pointer-events:none
import { AmbientLayer } from "@/components/layout/AmbientLayer";
// V2.5-F4: LazyMotion domAnimation via Client Component wrapper (DF4.5)
// Reduz bundle inicial de ~45kb para ~10kb gzipped.
// strict={true} garante que nenhum componente carrega o bundle completo acidentalmente.
import { MotionProvider } from "@/components/layout/motion-provider";

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
        {/* V2.5-F4: MotionProvider — LazyMotion domAnimation (~10kb vs ~45kb full bundle).
            Cobre: animate, initial, exit, whileHover, whileTap, whileFocus, variants, AnimatePresence.
            strict={true} no provider garante zero carregamento acidental do bundle completo. */}
        <MotionProvider>
        {/* V2.5-F5: SoundProvider — carrega sprite + registra mobile autoplay gate.
            Transparente no DOM — nenhum elemento visual.
            Deve envolver todo o conteúdo que pode disparar sons. */}
        <SoundProvider>
        {/* V2.5-F6: ToastProvider — toasts bottom-center custom (DF6.4).
            Montado após SoundProvider (toasts disparam sons via useSound).
            Substitui Sonner como padrão para features V2.5+. */}
        <ToastProvider>
        {/* V2.5-F3: Camada atmosférica — partículas "dust" sutis em toda a app.
            position:fixed, z-index:-10 (var(--z-atmosphere)), pointer-events:none.
            Pausa automaticamente quando aba fica oculta (Page Visibility API).
            Desabilitar por página: adicionar data-ambient="off" no body/html,
            ou usar prop density="off" se remontar for aceitável. */}
        <AmbientLayer density="medium" preset="dust" />
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
        {/* Toaster global (Sonner compat) — mantido para código legado */}
        <Toaster />
        </ToastProvider>
        </SoundProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
