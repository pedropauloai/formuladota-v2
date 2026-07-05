import { z } from "zod";

// Helper: trata "" como undefined (Node infla env ausentes em "" às vezes).
const optional = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().min(1).optional()
);

// Validação centralizada de variáveis de ambiente.
// Falha rápido em build/start se algo essencial estiver faltando.
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optional,
  DISCORD_CLIENT_ID: optional,
  DISCORD_CLIENT_SECRET: optional,
  DISCORD_BOT_TOKEN: optional,
  DISCORD_GUILD_ID: optional,
  // AbacatePay — PIX avulso/fichas (coexiste com MP)
  ABACATEPAY_API_KEY: optional,
  ABACATEPAY_WEBHOOK_SECRET: optional,
  // Mercado Pago (Phase 4 — assinatura mensal Pix Automático)
  MP_ACCESS_TOKEN: optional,        // production APP_USR-... ou sandbox TEST-...
  MP_PUBLIC_KEY: optional,          // public key pra frontend (se necessário)
  MP_WEBHOOK_SECRET: optional,      // secret pra HMAC validation x-signature header
  MP_PREAPPROVAL_PLAN_ID: optional, // opcional — plan_id se Pedro criar plano fixo via MCP
  HUB_PRICE_BRL: optional,          // mensalidade R$ (default 47, validado em call site)
  // Steam Web API key (Phase 3): server-only. Validada cirurgicamente via
  // requireServerEnv("STEAM_WEB_API_KEY") em src/lib/steam.ts.
  STEAM_WEB_API_KEY: optional,
  // Bot Steam (Phase 5)
  BOT_API_URL: optional,
  BOT_API_KEY: optional,
  // Bot DISCORD (voz) — serviço Railway SEPARADO do bot Steam. Usado pelo gate de
  // fila (checar presença no canal de voz) e pelas salas dinâmicas de time.
  // Fail-open: sem estas envs, o gate NÃO bloqueia ninguém.
  DISCORD_BOT_API_URL: optional,
  DISCORD_BOT_API_KEY: optional,      // = INTERNAL_API_KEY do bot Discord (header x-api-key)
  DISCORD_QUEUE_VOICE_CHANNEL_ID: optional, // ID do 🎧丨Buscando Partida (impresso pelo setup-channels)
  // Stratz GraphQL (Phase 7)
  STRATZ_API_KEY: optional,
  OPENDOTA_API_KEY: optional,
  // Stripe (FASE 4 2026-07-04 — assinaturas LATAM USD / EU EUR; BR segue no MP)
  STRIPE_SECRET_KEY: optional,        // sk_test_... (teste) ou sk_live_...
  STRIPE_WEBHOOK_SECRET: optional,    // whsec_... (stripe listen local ou endpoint dashboard)
  STRIPE_PRICE_PLUS_USD: optional,    // price_... criados por scripts/stripe-setup.ts
  STRIPE_PRICE_PREMIUM_USD: optional,
  STRIPE_PRICE_PLUS_EUR: optional,
  STRIPE_PRICE_PREMIUM_EUR: optional,
  // Segredo do cron de finalização automática (pg_cron → /api/cron/finalize-matches).
  CRON_SECRET: optional,
  // Webhook do canal 🆕 atualizações (Discord) — espelha /novidades. Opcional:
  // sem ele o espelho é no-op (só o site). URL vem do setup-channels.ts.
  CHANGELOG_DISCORD_WEBHOOK_URL: optional,
  // Webhooks dos canais 📊 resultados e 🔎 fila — postam placar/partida-formada.
  // Opcionais: sem eles, o post é no-op. URLs vêm do setup-channels.ts.
  RESULTS_DISCORD_WEBHOOK_URL: optional,
  QUEUE_DISCORD_WEBHOOK_URL: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email().optional()
  ),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

const isServer = typeof window === "undefined";

const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsedPublic.success) {
  // Não derrubar dev sem .env.local — só avisar.
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[env] variáveis NEXT_PUBLIC_* incompletas. Configure .env.local conforme .env.example.",
      parsedPublic.error.flatten().fieldErrors
    );
  } else {
    throw new Error(
      "Variáveis de ambiente públicas inválidas: " +
        JSON.stringify(parsedPublic.error.flatten().fieldErrors)
    );
  }
}

export const publicEnv = parsedPublic.success
  ? parsedPublic.data
  : ({
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    } as const);

export const serverEnv = isServer
  ? (() => {
      const parsed = serverSchema.safeParse(process.env);
      if (!parsed.success) {
        // Schema é todo opcional — se falhar aqui é bug.
        console.warn(
          "[env] schema server falhou (não deveria):",
          parsed.error.flatten().fieldErrors
        );
        return {} as Partial<z.infer<typeof serverSchema>>;
      }
      return parsed.data;
    })()
  : ({} as Partial<z.infer<typeof serverSchema>>);

// Validação cirúrgica no momento do uso — credenciais sensíveis devem
// ser checadas onde são usadas, não no boot do app.
export function requireServerEnv<K extends keyof typeof serverEnv>(key: K): string {
  const value = serverEnv[key];
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória "${key}" não configurada. Verifique .env.local.`
    );
  }
  return value as string;
}
