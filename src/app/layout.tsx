import type { Metadata, Viewport } from "next";
// Fontes V2.5 — self-hosted via @fontsource (sem requisição Google Fonts).
// Atualizado 2026-05-25 (segunda iteração): Space Grotesk REMOVIDA, adotada
// UBUNTU — mesma fonte usada pelo ExitLag.com (referência AAA gaming brasileira
// que Pedro citou). Ubuntu (Canonical, free Google Fonts) tem character forte
// natural, weight visível em todos os pesos. ExitLag usa Ubuntu pra body+h2+
// eyebrows e Organetto (paga) pra h1 hero — substituímos Organetto pela Teko
// (já self-hosted, vibe condensed esports similar).
//
// 4 pesos: 300/400/500/700 (sem variable axis, mas cobre todas necessidades).
// Teko Variable continua pra moments épicos (countdown, "ON FIRE!").
import "@fontsource/ubuntu/300.css";
import "@fontsource/ubuntu/400.css";
import "@fontsource/ubuntu/500.css";
import "@fontsource/ubuntu/700.css";
import "@fontsource-variable/teko";
import "@/styles/globals.css";
// V2.5-F5: Sound infrastructure — singleton Howler + mobile autoplay gate (DF5.1, DF5.4, DF5.6)
import { SoundProvider } from "@/components/layout/sound-provider";
// StickyQueueBanner REMOVIDO (Pedro 2026-05-26) — substituído por QueueStatusPill
// que vive dentro da topbar (sem forçar scroll de página).
import { RealtimeAuthSync } from "@/components/client-shell/realtime-auth-sync";
// V2.5-F6: ToastProvider — sistema de toasts bottom-center custom (DF6.4)
// Único sistema de toast do app (sonner removido 2026-06-02 — migração completa).
import { ToastProvider } from "@/components/ui/toast";
// ConfirmProvider — substitui window.confirm/alert/prompt nativos do browser
// por modais customizados FORMULADOTA (Pedro 2026-05-26). API Promise-based
// via hooks useConfirm() / usePrompt().
import { ConfirmProvider } from "@/components/ui/confirm";
// V2.5-F3: Camada atmosférica root-level com tsParticles (DF3.1)
// position:fixed, z-index:var(--z-atmosphere)=-10, pointer-events:none
import { PremiumBackdrop } from "@/components/layout/premium-backdrop";
// V2.5-F4: LazyMotion domAnimation via Client Component wrapper (DF4.5)
// Reduz bundle inicial de ~45kb para ~10kb gzipped.
// strict={true} garante que nenhum componente carrega o bundle completo acidentalmente.
import { MotionProvider } from "@/components/layout/motion-provider";
// i18n (next-intl) — provider client recebe locale + mensagens do request config.
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
// PWA: registra o service worker (instalável + offline básico).
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
// Analytics, as duas gated por env (o app roda na Cloudflare, então os da Vercel saíram):
//   1. GA4, obrigatório pra conversões do Google Ads (NEXT_PUBLIC_GA_MEASUREMENT_ID)
//   2. PostHog, funil/retenção, init em src/instrumentation-client.ts (NEXT_PUBLIC_POSTHOG_KEY)
import { GoogleAnalytics } from "@next/third-parties/google";
// Visita por origem (UTM) gravada no próprio banco: o número do checkpoint da loja.
import { VisitBeacon } from "@/components/analytics/visit-beacon";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteTitle = "FORMULADOTA — HUB Dota 2 Brasil";
const siteDescription =
  "FORMULADOTA: o HUB Dota 2 brasileiro. Lobbies in-house, ranking por temporadas, doutrina cultural. Comunidade alinhada culturalmente, integrada a Discord e Steam.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "FORMULADOTA",
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    images: [
      {
        url: "/brand/og-hero.png",
        width: 1200,
        height: 630,
        alt: "FORMULADOTA — HUB Dota 2 Brasil",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/brand/og-hero.png"],
  },
  // PWA iOS — habilita "Adicionar à tela de início" como app standalone.
  appleWebApp: {
    capable: true,
    title: "FormulaDota",
    statusBarStyle: "black-translucent",
  },
  // Next 16 emite só o moderno `mobile-web-app-capable`; o alias apple cobre iOS < 16.4.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

// Viewport mobile-first + notch (viewportFit cover) + theme-color da marca.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#C42121",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Idioma resolvido por cookie/Accept-Language (ver src/i18n/request.ts).
  const locale = await getLocale();
  return (
    /* data-theme="fd-dark" — V2.5 token layer.
     * Arquitetura suporta data-theme="radiant" / "dire" no futuro
     * sem refactor de nenhum componente (CSS vars redefinem automaticamente).
     * Space Grotesk + Teko via @fontsource-variable carregam font-face
     * automaticamente — não precisa expor CSS var no html className. */
    <html
      lang={locale}
      data-theme="fd-dark"
    >
      <body className="min-h-screen flex flex-col font-body bg-[#0b0c0f]">
        <NextIntlClientProvider>
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
        {/* ConfirmProvider — dialog global pra confirm/prompt customizado.
            Montado dentro de ToastProvider (pode disparar toast em erros).
            Sem UI quando inativo — só renderiza Dialog quando confirm()/prompt() chama. */}
        <ConfirmProvider>
        {/* Fundo premium global ESTÁTICO (Pedro 2026-07-01) — substitui o preto chapado.
            Neutro de marca + mesh de luz brand + vinheta + grão. Vale pra todas as rotas. */}
        <PremiumBackdrop />
        {/* Seta o token de auth na conexão de realtime — sem isso a RLS de
            postgres_changes não entrega eventos cross-usuário (só com F5). */}
        <RealtimeAuthSync />
        {/* QueueRealtimeListener saiu do layout raiz (perf 2026-07-03): escutava
            coach_queue_entries SEM filtro e dava router.refresh() em TODOS os
            usuários online a cada evento de fila de QUALQUER PRO. Agora monta
            só nas rotas que dependem da fila (/ranked-com-pro, /admin/pros). */}
        <ServiceWorkerRegister />
        {/* Pedro 2026-05-24: filosofia "tudo é client" — Header/Footer globais
            removidos (tasks #63-#68). Toda rota usa ClientShell (sistema A
            canônico — 3-col Dota 2 client real) ou é fullscreen splash (gates
            como /banned, /suspended, cerimônias como /onboarding/doutrina,
            /vincular/steam). Layout root não impõe mais chrome — cada rota é
            responsável pelo próprio. */}
        <div className="flex-1">{children}</div>
        </ConfirmProvider>
        </ToastProvider>
        </SoundProvider>
        </MotionProvider>
        </NextIntlClientProvider>
        {/* Analytics fora dos providers (não dependem de i18n/motion/sound).
            GA4: só renderiza se a env existir (deploy seguro sem key). */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        ) : null}
        <VisitBeacon />
      </body>
    </html>
  );
}
