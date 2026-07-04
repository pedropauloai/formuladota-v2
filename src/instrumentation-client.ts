// PostHog — product analytics (funil, retenção, origem de tráfego).
// Convenção Next 15.3+: este arquivo roda 1x no browser antes da hidratação.
// GATED: sem NEXT_PUBLIC_POSTHOG_KEY, vira no-op — deploy nunca quebra.
// Free tier: 1M eventos/mês. Config no dashboard: https://us.posthog.com
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // defaults 2025+: captura pageviews de SPA (history API) automaticamente
    defaults: "2025-05-24",
    capture_pageleave: true,
    // Privacidade: não gravar inputs em session replay (se ativado no dashboard)
    session_recording: { maskAllInputs: true },
  });
}

export { posthog };
