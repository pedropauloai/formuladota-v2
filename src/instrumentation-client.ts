// PostHog — product analytics (funil, retenção, origem de tráfego).
// Convenção Next 15.3+: este arquivo roda 1x no browser antes da hidratação.
// GATED: sem NEXT_PUBLIC_POSTHOG_KEY nada é baixado. O import dinâmico tira os ~430 KB do
// posthog-js de toda página enquanto a chave não existe.
// Free tier: 1M eventos/mês. Config no dashboard: https://us.posthog.com

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

async function startPostHog(apiKey: string): Promise<void> {
  const { default: posthog } = await import("posthog-js");
  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // defaults 2025+: captura pageviews de SPA (history API) automaticamente
    defaults: "2025-05-24",
    capture_pageleave: true,
    // Privacidade: não gravar inputs em session replay (se ativado no dashboard)
    session_recording: { maskAllInputs: true },
  });
}

if (key) void startPostHog(key);
