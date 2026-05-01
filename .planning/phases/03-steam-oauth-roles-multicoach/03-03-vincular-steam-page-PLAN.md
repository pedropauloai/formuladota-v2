---
phase: 03-steam-oauth-roles-multicoach
plan: 03
plan_id: 03-03
title: Steam OAuth flow — Server Action signInWithSteam (com CSRF state) + callback handler enxuto + página /vincular/steam
type: execute
wave: 2
depends_on:
  - 03-01
  - 03-02
files_modified:
  - src/app/vincular/steam/actions.ts
  - src/app/vincular/steam/page.tsx
  - src/app/auth/steam/callback/route.ts
autonomous: true
requirements_addressed:
  - H1.1
  - H1.2
  - C1
  - C2
  - C3
  - C5
  - C6
  - C7
  - C11
  - C12
  - C13
must_haves:
  truths:
    - "User logado clica botão 'Continuar com Steam' em /vincular/steam → Server Action gera CSRF state, salva em cookie httpOnly, redireciona Steam OpenID com state em return_to → após autorizar volta pro app"
    - "Callback handler lê cookie steam_csrf_state, chama validateAndFetchSteam(searchParams, expectedState) que confere state com crypto.timingSafeEqual + valida assinatura Steam + busca persona — tudo num único call"
    - "Mismatch de state → redirect /vincular/steam?error=csrf (NÃO faz upsert)"
    - "Sucesso: cookie steam_csrf_state apagado, upsert em steam_links via cookie client (RLS confiável), redirect /vincular/steam?ok=1 → middleware vê steam_link → redirect /perfil"
    - "Página /vincular/steam mostra 2 estados: sem Steam (card cyan + botão 'Continuar com Steam') | com Steam (card verde + persona/avatar/SteamID + botão 'Revincular')"
    - "Erros do callback (csrf, assinatura inválida, fetch persona falhou, DB falhou) retornam pra /vincular/steam?error=... com mensagem clara"
    - "Função GET do callback handler tem ≤ 50 linhas (helper validateAndFetchSteam absorve toda a lógica composta) e o file ≤ 80 linhas total"
    - "Tudo async/await, ZERO .then().catch() (per C11)"
  artifacts:
    - path: "src/app/vincular/steam/actions.ts"
      provides: "Server Action signInWithSteam que gera CSRF state, persiste em cookie e redireciona pro Steam OpenID URL"
      exports: ["signInWithSteam"]
      min_lines: 30
    - path: "src/app/vincular/steam/page.tsx"
      provides: "Server Component com 2 estados (vinculado / não-vinculado) e form action"
      min_lines: 80
    - path: "src/app/auth/steam/callback/route.ts"
      provides: "API Route GET handler enxuto — lê cookie, chama validateAndFetchSteam, upsert + redirect"
      exports: ["GET"]
      min_lines: 30
  key_links:
    - from: "src/app/vincular/steam/page.tsx"
      to: "signInWithSteam (Server Action)"
      via: "<form action={signInWithSteam}>"
      pattern: "<form action=\\{signInWithSteam\\}"
    - from: "src/app/vincular/steam/actions.ts"
      to: "src/lib/steam.ts getSteamRedirectUrl(state)"
      via: "import { getSteamRedirectUrl } from '@/lib/steam' + crypto.randomUUID + cookie httpOnly"
      pattern: "getSteamRedirectUrl\\(state\\)"
    - from: "src/app/auth/steam/callback/route.ts"
      to: "src/lib/steam.ts validateAndFetchSteam"
      via: "validateAndFetchSteam(searchParams, expectedState) → SteamProfile"
      pattern: "validateAndFetchSteam"
    - from: "src/app/auth/steam/callback/route.ts"
      to: "supabase.from('steam_links').upsert"
      via: "upsert com cookie client (RLS: auth.uid() = user_id) — NUNCA service role"
      pattern: "from\\(['\"]steam_links['\"]\\)\\.upsert"
    - from: "/auth/steam/callback"
      to: "src/lib/supabase/middleware.ts AUTH_FLOW_PATHS"
      via: "/auth path matchá AUTH_FLOW_PATHS — middleware NÃO bloqueia callback"
      pattern: "AUTH_FLOW_PATHS.*\\[.*['\"]\\/auth['\"]"
---

<objective>
Implementar o flow completo Steam OAuth na app com proteção CSRF: Server Action que gera state, persiste em cookie httpOnly e redireciona pro Steam OpenID; callback handler enxuto que delega validação composta ao helper `validateAndFetchSteam` (Plan 03-02) e persiste em `steam_links`; página `/vincular/steam` com 2 estados visuais.

Purpose: Replicar o pattern de OAuth callback já provado em `/auth/callback` (Discord), mas para um provider que **não é Supabase Auth nativo** — precisa upsert manual em `steam_links` via cookie client (RLS confiável). Reusar `src/lib/steam.ts` (Plan 02) como única superfície de Steam. CSRF state via cookie httpOnly + `crypto.timingSafeEqual` (mesma técnica do HMAC AbacatePay em `src/lib/abacatepay.ts`).

Output:
- `src/app/vincular/steam/actions.ts` exporta `signInWithSteam` Server Action (gera CSRF, salva cookie, redirect com state)
- `src/app/vincular/steam/page.tsx` Server Component com 2 estados e form action
- `src/app/auth/steam/callback/route.ts` GET handler (≤ 50 linhas, file ≤ 80 linhas) que lê cookie, chama helper composto, upsert + redirect
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md
@.planning/research/integrations.md
@src/lib/steam.ts
@src/lib/supabase/server.ts
@src/lib/supabase/middleware.ts
@src/lib/abacatepay.ts
@src/app/auth/callback/route.ts
@src/app/onboarding/doutrina/actions.ts
@src/app/onboarding/doutrina/page.tsx
@src/types/database.ts

<interfaces>
<!-- Plan 03-02 src/lib/steam.ts API -->
```typescript
export type SteamProfile = {
  steamId64: string;
  persona: string;
  avatarUrl: string;
};
export function getSteamRedirectUrl(state: string): string;
export async function validateSteamCallback(query: URLSearchParams): Promise<string>;
export async function fetchSteamPersona(steamId64: string): Promise<SteamProfile>;
// Helper composto: confere CSRF state (timingSafeEqual) + valida assinatura + busca persona.
// Throws "csrf_mismatch" / "validate_failed" / "persona_failed" — caller mapeia em ?error=...
export async function validateAndFetchSteam(
  searchParams: URLSearchParams,
  expectedState: string
): Promise<SteamProfile>;
```

<!-- Plan 03-01 Tables<"steam_links"> -->
```typescript
{
  user_id: string;          // PK references profiles(id)
  steam_id_64: string;      // unique
  persona: string | null;
  avatar_url: string | null;
  verified_at: string;
}
```

<!-- Pattern Server Action (src/app/onboarding/doutrina/actions.ts) -->
```typescript
"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function action(formData: FormData): Promise<void> {
  // createClient → getUser → if !user redirect /login → mutation → redirect
}
```

<!-- Pattern callback handler (src/app/auth/callback/route.ts) -->
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  // ...
}
```

<!-- Cookie API em Next 16 (Server Action + Route Handler) -->
```typescript
import { cookies } from "next/headers";
const jar = await cookies();
jar.set("name", value, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 300, path: "/" });
const c = jar.get("name")?.value;
jar.delete("name");
```

<!-- Middleware preserva /auth/* (linhas 60-62 em src/lib/supabase/middleware.ts) -->
// const AUTH_FLOW_PATHS = ["/auth", "/api/auth", "/api/webhooks"];
// /auth/steam/callback matcha → middleware bypassa enforcement

<!-- Pattern página /onboarding/doutrina (Server Component obrigatório):
// createClient → getUser → if !user redirect /login → select profile data → render condicional
// → <form action={serverAction}> com hidden inputs -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Server Action signInWithSteam (CSRF state + cookie httpOnly + redirect Steam OpenID)</name>
  <files>src/app/vincular/steam/actions.ts</files>
  <read_first>
    - src/app/onboarding/doutrina/actions.ts (pattern: "use server", redirect, createClient, getUser, void return)
    - src/lib/steam.ts (assinatura `getSteamRedirectUrl(state: string): string`)
    - src/lib/abacatepay.ts (pattern crypto + timing-safe comparison — referência)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisão: state CSRF em cookie httpOnly Secure SameSite=Lax, expira em 5min)
  </read_first>
  <action>
    Criar `src/app/vincular/steam/actions.ts` (criar diretório se necessário):

    ```typescript
    "use server";

    import { randomUUID } from "node:crypto";
    import { cookies } from "next/headers";
    import { redirect } from "next/navigation";
    import { createClient } from "@/lib/supabase/server";
    import { getSteamRedirectUrl } from "@/lib/steam";

    // Server Action invocada via <form action={signInWithSteam}>.
    // 1. Confere user logado (Discord auth via Supabase).
    // 2. Gera CSRF state (UUID v4) e persiste em cookie httpOnly.
    //    Cookie expira em 5min — janela do flow OpenID; Secure em prod, SameSite=Lax
    //    pra não quebrar o redirect-back da Steam.
    // 3. Constrói URL Steam OpenID 2.0 com state em return_to (lib steam.ts).
    // 4. Redirect — Next.js converte em 303 See Other automaticamente.
    //
    // Steam vai redirecionar de volta pra /auth/steam/callback?state=<csrf>... após
    // user autorizar. O callback lê o cookie, compara via timingSafeEqual e
    // só então persiste — sem cookie ou state divergente, redirect ?error=csrf.
    export async function signInWithSteam(): Promise<void> {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login?error=login_required_for_steam");
      }

      // CSRF state (Per CONTEXT.md decisão Return URL)
      const state = randomUUID();
      const jar = await cookies();
      jar.set("steam_csrf_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 300, // 5 minutos
        path: "/",
      });

      const steamUrl = getSteamRedirectUrl(state);
      redirect(steamUrl);
    }
    ```

    **Restrições**:
    - Function ≤ 50 linhas (per C2 — está em ~35)
    - File ≤ 300 linhas (per C2)
    - "use server" no topo
    - Async/await sempre, ZERO .then() (per C11)
    - Zero `any` (per C1)
    - PT-BR comments (per C12)
    - NÃO usa `formData` argument — Server Action sem input. Pattern `<form action={signInWithSteam}>` em React 19 aceita form actions sem props.
    - NÃO precisa Zod aqui pois NÃO há input de user — apenas redireciona (decisão consciente: C3 cobre inputs; redirects deterministas não precisam).
    - `randomUUID` import explícito de `node:crypto` (server-only ok).
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/app/vincular/steam/actions.ts && grep -q '"use server"' src/app/vincular/steam/actions.ts && grep -q "export async function signInWithSteam" src/app/vincular/steam/actions.ts && grep -q "crypto" src/app/vincular/steam/actions.ts && grep -q "randomUUID" src/app/vincular/steam/actions.ts && grep -q "steam_csrf_state" src/app/vincular/steam/actions.ts && grep -q "getSteamRedirectUrl(state)" src/app/vincular/steam/actions.ts && grep -q "httpOnly: true" src/app/vincular/steam/actions.ts && grep -q "redirect(steamUrl)" src/app/vincular/steam/actions.ts && ! grep -E '\.then\(|\.catch\(' src/app/vincular/steam/actions.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - Arquivo `src/app/vincular/steam/actions.ts` existe
    - Tem diretiva `"use server"` no topo
    - Exporta `async function signInWithSteam(): Promise<void>`
    - Importa `randomUUID` de `node:crypto` E `cookies` de `next/headers` E `getSteamRedirectUrl` de `@/lib/steam`
    - Verifica user logado via `supabase.auth.getUser()`; se não logado redirect `/login?error=login_required_for_steam`
    - Gera state com `randomUUID()`: `grep -q "randomUUID" src/app/vincular/steam/actions.ts`
    - Persiste cookie `steam_csrf_state` com `httpOnly: true`, `sameSite: "lax"`, `maxAge: 300`, `secure` condicional a NODE_ENV: `grep -q "steam_csrf_state" src/app/vincular/steam/actions.ts`
    - Chama `getSteamRedirectUrl(state)` (passando state) e faz `redirect(steamUrl)`: `grep -q "getSteamRedirectUrl(state)" src/app/vincular/steam/actions.ts`
    - Zero `.then()`/`.catch()` (per C11)
    - File ≤ 100 linhas
    - `pnpm typecheck` exit 0
  </acceptance_criteria>
  <done>
    Server Action gera CSRF state, persiste em cookie httpOnly Secure SameSite=Lax (5min), e redireciona pra Steam com state em return_to. `<form action={signInWithSteam}>` em qualquer Server Component vai abrir Steam OpenID corretamente com proteção CSRF ativa.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Callback handler /auth/steam/callback enxuto (cookie read + validateAndFetchSteam + upsert)</name>
  <files>src/app/auth/steam/callback/route.ts</files>
  <read_first>
    - src/app/auth/callback/route.ts (pattern: GET handler, NextRequest, createClient, redirect com origin)
    - src/lib/steam.ts (assinatura `validateAndFetchSteam(searchParams, expectedState): Promise<SteamProfile>` — Plan 03-02 Task 2)
    - src/lib/supabase/middleware.ts linhas 60-62 (AUTH_FLOW_PATHS preserva /auth — callback NÃO é bloqueado por enforcement)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisão: cookie client server-side faz upsert — RLS auth.uid() = user_id permite; NUNCA service role per C13)
    - src/types/database.ts (Tables<"steam_links">.Insert shape)
  </read_first>
  <action>
    Criar `src/app/auth/steam/callback/route.ts`:

    ```typescript
    import { cookies } from "next/headers";
    import { NextResponse, type NextRequest } from "next/server";
    import { createClient } from "@/lib/supabase/server";
    import { validateAndFetchSteam } from "@/lib/steam";

    // Callback do Steam OpenID 2.0 — Steam redireciona aqui após user autorizar.
    // Esta rota está em AUTH_FLOW_PATHS no middleware → não é bloqueada
    // por enforcement de doutrina/Steam (sem isso entraríamos em loop).
    //
    // Helper validateAndFetchSteam (src/lib/steam.ts) faz CSRF check +
    // anti-spoofing + persona fetch num único call — mantém este handler enxuto.
    export async function GET(request: NextRequest): Promise<NextResponse> {
      const { searchParams, origin } = new URL(request.url);
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.redirect(
          `${origin}/login?error=login_required_for_steam`
        );
      }

      // Lê + apaga cookie CSRF (one-shot)
      const jar = await cookies();
      const expectedState = jar.get("steam_csrf_state")?.value ?? "";
      jar.delete("steam_csrf_state");

      try {
        const profile = await validateAndFetchSteam(searchParams, expectedState);

        const { error: dbErr } = await supabase
          .from("steam_links")
          .upsert(
            {
              user_id: user.id,
              steam_id_64: profile.steamId64,
              persona: profile.persona,
              avatar_url: profile.avatarUrl,
              verified_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (dbErr) {
          console.error("[steam/callback] upsert steam_links:", dbErr.message);
          return NextResponse.redirect(`${origin}/vincular/steam?error=db_failed`);
        }

        return NextResponse.redirect(`${origin}/vincular/steam?ok=1`);
      } catch (err) {
        const code = err instanceof Error ? err.message : "validate_failed";
        // Mapeia mensagens do helper em ?error= esperado pela página
        const errorParam =
          code === "csrf_mismatch" ? "csrf"
          : code.includes("Web API") ? "persona_unavailable"
          : "invalid_signature";
        console.error("[steam/callback] falha:", code);
        return NextResponse.redirect(
          `${origin}/vincular/steam?error=${errorParam}`
        );
      }
    }
    ```

    **Restrições**:
    - Function `GET` ≤ 50 linhas (per C2 — verificação automatizada). Esta versão usa o helper composto `validateAndFetchSteam` para absorver CSRF check + validate + persona fetch num único call, mantendo o handler enxuto.
    - File ≤ 80 linhas total (per C2 — verificação automatizada via `wc -l`)
    - Async/await + try/catch — ZERO `.then()`/`.catch()` (per C11)
    - Zero `any`/`unknown` (per C1)
    - Cookie client APENAS (per C13) — service role só em /api/webhooks (abacatepay)
    - NÃO duplicar checagem RLS (per C4) — confiar que policy `users manage own steam_link` (auth.uid() = user_id) bloqueia upsert pra outro user
    - Comentários PT-BR (per C12)
    - Logs de erro com `console.error` (acceptable em route handler — CLAUDE.md regra)
    - Caminho exato: `src/app/auth/steam/callback/route.ts` (Next 16 App Router)
    - **CRÍTICO**: AUTH_FLOW_PATHS em middleware.ts contém `["/auth", ...]` — `/auth/steam/callback` matcha. Verificar via grep antes de finalizar (pre-condition).
    - **Cookie one-shot**: lê + delete antes do try, garantindo que mesmo em sucesso o cookie não fica órfão.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/app/auth/steam/callback/route.ts && grep -q "export async function GET" src/app/auth/steam/callback/route.ts && grep -q "validateAndFetchSteam" src/app/auth/steam/callback/route.ts && grep -q "steam_csrf_state" src/app/auth/steam/callback/route.ts && grep -q "from(.steam_links.).upsert" src/app/auth/steam/callback/route.ts && grep -q "onConflict.*user_id" src/app/auth/steam/callback/route.ts && grep -q '"/auth"' src/lib/supabase/middleware.ts && [ "$(wc -l < src/app/auth/steam/callback/route.ts)" -lt 80 ] && [ "$(awk '/export async function GET/,/^}$/' src/app/auth/steam/callback/route.ts | wc -l)" -le 50 ] && ! grep -E '\.then\(|\.catch\(' src/app/auth/steam/callback/route.ts && ! grep -nE ': any\b|as any|<any>' src/app/auth/steam/callback/route.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - Arquivo `src/app/auth/steam/callback/route.ts` existe
    - Exporta `async function GET(request: NextRequest): Promise<NextResponse>`
    - Lê cookie `steam_csrf_state` e apaga (one-shot): `grep -q "steam_csrf_state" src/app/auth/steam/callback/route.ts && grep -q "jar.delete" src/app/auth/steam/callback/route.ts`
    - CSRF check é feito via helper `validateAndFetchSteam` (que internamente usa `crypto.timingSafeEqual`) — verificável: `grep -q "validateAndFetchSteam" src/app/auth/steam/callback/route.ts`
    - Mismatch de state → redirect `/vincular/steam?error=csrf` (helper throws "csrf_mismatch", handler mapeia)
    - Confere user via `supabase.auth.getUser()` — !user → redirect login
    - Faz `supabase.from('steam_links').upsert({...}, { onConflict: 'user_id' })`
    - Sucesso → redirect `/vincular/steam?ok=1`
    - Falha DB → redirect `/vincular/steam?error=db_failed`
    - Outras falhas mapeadas: csrf_mismatch → ?error=csrf | "Steam Web API" → ?error=persona_unavailable | demais → ?error=invalid_signature
    - **Função GET ≤ 50 linhas** (verificação automatizada): `[ "$(awk '/export async function GET/,/^}$/' src/app/auth/steam/callback/route.ts | wc -l)" -le 50 ]` exit 0
    - **File ≤ 80 linhas total** (verificação automatizada): `[ "$(wc -l < src/app/auth/steam/callback/route.ts)" -lt 80 ]` exit 0
    - Zero `.then()`/`.catch()` chains (per C11)
    - Zero `any`/`as any` (per C1)
    - AUTH_FLOW_PATHS em middleware.ts contém `/auth` (verificável — pre-condição validada)
    - `pnpm typecheck` exit 0
  </acceptance_criteria>
  <done>
    Callback handler enxuto (≤ 50 linhas a função, ≤ 80 linhas o file). Toda lógica composta (CSRF, anti-spoofing, persona) absorvida pelo helper `validateAndFetchSteam` em src/lib/steam.ts. Cookie one-shot apagado em todos os paths. Erros têm querystring claro pra UI mostrar mensagem.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Página /vincular/steam (Server Component com 2 estados + form action + erro de CSRF)</name>
  <files>src/app/vincular/steam/page.tsx</files>
  <read_first>
    - src/app/onboarding/doutrina/page.tsx (pattern Server Component obrigatório: createClient → getUser → !user redirect /login → select profile data → render condicional)
    - src/app/vincular/steam/actions.ts (Task 1 — assinatura `signInWithSteam`)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisão UI: card cyan sem Steam | card verde com persona/avatar/SteamID + botão Revincular)
    - src/components/catalog/package-card.tsx (referência cyberpunk: bg-[#0A0A1A], cyan #00F0FF, lucide icons)
    - src/types/database.ts (Tables<"steam_links">)
  </read_first>
  <action>
    Criar `src/app/vincular/steam/page.tsx`:

    ```typescript
    import { redirect } from "next/navigation";
    import { Gamepad2, ShieldCheck, AlertCircle } from "lucide-react";
    import { createClient } from "@/lib/supabase/server";
    import { signInWithSteam } from "./actions";

    // Página obrigatória de vinculação Steam (Phase 3 — H1.1).
    // Middleware já garante:
    //   - User logado (senão redireciona pra /login)
    //   - Doutrina aceita (senão redireciona pra /onboarding/doutrina)
    //   - User SEM steam_link em rota privada → vem aqui
    //   - User COM steam_link aqui → redireciona /perfil
    // Mas exibe os 2 estados pra acessível direto via /vincular/steam.

    export const metadata = {
      title: "Vincular Steam — Fórmula Dota",
      description:
        "Vincule sua conta Steam pra liberar pacotes e (em breve) lobbies in-house.",
    };

    const ERROR_MESSAGES: Record<string, string> = {
      csrf:
        "Sua sessão de vinculação expirou ou o link veio adulterado. Tenta de novo — gerar um novo state é instantâneo.",
      invalid_signature:
        "A resposta da Steam veio com assinatura inválida. Tenta de novo — se persistir, fala com a gente no Discord.",
      persona_unavailable:
        "Conseguimos validar sua Steam, mas o servidor da Steam não devolveu seu nickname. Tenta de novo em alguns minutos.",
      db_failed:
        "Falha ao registrar seu vínculo no banco. Tenta de novo — se persistir, fala com a gente no Discord.",
      login_required_for_steam:
        "Faça login com Discord primeiro — depois te trazemos de volta.",
    };

    type SearchParams = Promise<{ error?: string; ok?: string }>;

    // Banner de erro — extraído pra manter VincularSteamPage ≤ 50 linhas (per C2).
    function ErrorBanner({ message }: { message: string }) {
      return (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-[#A855F7]/40 bg-[#1A0A2A] p-4 text-sm text-[#f4f4f5]"
        >
          <AlertCircle
            className="h-5 w-5 text-[#A855F7] flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>{message}</span>
        </div>
      );
    }

    export default async function VincularSteamPage({
      searchParams,
    }: {
      searchParams: SearchParams;
    }) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login?error=login_required_for_steam");
      }

      const { data: steamLink } = await supabase
        .from("steam_links")
        .select("steam_id_64, persona, avatar_url, verified_at")
        .eq("user_id", user.id)
        .maybeSingle();

      const params = await searchParams;
      const errorMessage = params.error
        ? ERROR_MESSAGES[params.error]
        : undefined;

      return (
        <main className="min-h-screen bg-[#050505] px-4 py-12 md:py-20">
          <div className="mx-auto max-w-2xl">
            <header className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-display text-[#f4f4f5]">
                Vincular <span className="text-[#00F0FF]">Steam</span>
              </h1>
              <p className="mt-3 text-[#a1a1aa]">
                Identidade gamer obrigatória para acessar pacotes e lobbies.
              </p>
            </header>

            {errorMessage && <ErrorBanner message={errorMessage} />}

            {steamLink ? (
              <LinkedState
                persona={steamLink.persona}
                avatarUrl={steamLink.avatar_url}
                steamId64={steamLink.steam_id_64}
              />
            ) : (
              <UnlinkedState />
            )}
          </div>
        </main>
      );
    }

    // Estado: SEM Steam vinculado (CTA primário cyan)
    function UnlinkedState() {
      return (
        <section
          aria-labelledby="unlinked-heading"
          className="rounded-xl border border-[#00F0FF]/30 bg-[#0A0A1A] p-6 md:p-8"
        >
          <div className="mb-4 flex items-center gap-3">
            <Gamepad2 className="h-6 w-6 text-[#00F0FF]" aria-hidden="true" />
            <h2 id="unlinked-heading" className="text-xl font-display text-[#f4f4f5]">
              Conecte sua conta Steam
            </h2>
          </div>
          <p className="mb-6 text-[#a1a1aa] text-sm leading-relaxed">
            Você vai abrir a página oficial da Steam, autorizar o Fórmula Dota
            e voltar pra cá automaticamente. Sua senha NUNCA passa pelo nosso
            servidor — autenticação direto com a Valve.
          </p>
          <form action={signInWithSteam}>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00F0FF] px-6 py-3 font-medium text-black transition-colors hover:bg-[#00F0FF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]/50"
            >
              <Gamepad2 className="h-5 w-5" aria-hidden="true" />
              Continuar com Steam
            </button>
          </form>
        </section>
      );
    }

    // Estado: COM Steam vinculado (card verde + revincular secundário)
    function LinkedState({
      persona,
      avatarUrl,
      steamId64,
    }: {
      persona: string | null;
      avatarUrl: string | null;
      steamId64: string;
    }) {
      return (
        <section
          aria-labelledby="linked-heading"
          className="rounded-xl border border-emerald-500/40 bg-[#0A0A1A] p-6 md:p-8"
        >
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" aria-hidden="true" />
            <h2 id="linked-heading" className="text-xl font-display text-[#f4f4f5]">
              Steam vinculado
            </h2>
          </div>

          <div className="mb-6 flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`Avatar de ${persona ?? "usuário Steam"}`}
                className="h-16 w-16 rounded-full border-2 border-emerald-400/60"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-16 w-16 rounded-full border-2 border-[#27272a] bg-[#050505]"
              />
            )}
            <div>
              <p className="text-lg font-display text-[#f4f4f5]">
                {persona ?? "Sem nickname"}
              </p>
              <p className="text-xs text-[#a1a1aa] font-mono mt-1">
                SteamID 64: {steamId64}
              </p>
            </div>
          </div>

          <form action={signInWithSteam}>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#27272a] bg-transparent px-6 py-3 font-medium text-[#a1a1aa] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]/30"
            >
              Revincular outra conta Steam
            </button>
          </form>
        </section>
      );
    }
    ```

    **Restrições**:
    - Server Component (default — sem `"use client"`)
    - File ≤ 300 linhas (per C2 — está em ~200)
    - Functions cada uma ≤ 50 linhas (per C2). VincularSteamPage ≤ 50 linhas (bloco de erro extraído para ErrorBanner sub-componente). ErrorBanner ~10, UnlinkedState ~25, LinkedState ~50.
    - Cyberpunk theme (per C7): bg-[#050505], #00F0FF cyan, #A855F7 purple no error state, bg-[#0A0A1A] cards
    - WCAG 2.1 AA (per C5): role="alert" no erro, aria-labelledby nas sections, aria-hidden em ícones decorativos, alt em img, focus-visible:ring
    - Lucide icons (per C6): Gamepad2, ShieldCheck, AlertCircle — NÃO emojis
    - Comentários PT-BR (per C12)
    - Zero `any`/`unknown` (per C1)
    - `<form action={signInWithSteam}>` em ambos estados — Server Action coberta no Task 1
    - `<img>` com eslint-disable inline (replicar pattern já visto no codebase)
    - searchParams é Promise (Next 16 API)
    - NÃO usar Next/Image — Steam CDN não está em next.config domains
    - Mensagem de erro `csrf` adicionada ao ERROR_MESSAGES (novo, vs Plan original)
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/app/vincular/steam/page.tsx && grep -q "export default async function" src/app/vincular/steam/page.tsx && grep -q "from(.steam_links.)" src/app/vincular/steam/page.tsx && grep -q "form action={signInWithSteam}" src/app/vincular/steam/page.tsx && grep -q "Continuar com Steam" src/app/vincular/steam/page.tsx && grep -q "Steam vinculado" src/app/vincular/steam/page.tsx && grep -q "SteamID 64" src/app/vincular/steam/page.tsx && grep -q "ERROR_MESSAGES" src/app/vincular/steam/page.tsx && grep -q "csrf:" src/app/vincular/steam/page.tsx && grep -q "Gamepad2" src/app/vincular/steam/page.tsx && grep -q "function ErrorBanner" src/app/vincular/steam/page.tsx && ! grep -nE ': any\b|as any|<any>' src/app/vincular/steam/page.tsx && [ "$(awk '/export default async function VincularSteamPage/,/^}$/' src/app/vincular/steam/page.tsx | wc -l)" -le 50 ] && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - Arquivo `src/app/vincular/steam/page.tsx` existe
    - Server Component (sem "use client")
    - Export default `async function VincularSteamPage({ searchParams })`
    - Faz `supabase.auth.getUser()`, redirect /login se !user
    - Faz `supabase.from('steam_links').select(...).eq('user_id', user.id).maybeSingle()`
    - Renderiza condicionalmente `<LinkedState>` ou `<UnlinkedState>` (helpers no mesmo arquivo)
    - UnlinkedState tem `<form action={signInWithSteam}>` + botão "Continuar com Steam" cyan
    - LinkedState mostra avatar + persona + "SteamID 64: ..." + botão "Revincular outra conta Steam"
    - ERROR_MESSAGES contém chaves: `csrf`, `invalid_signature`, `persona_unavailable`, `db_failed`, `login_required_for_steam` — todas com mensagem PT-BR clara
    - Lucide icons: Gamepad2, ShieldCheck, AlertCircle (zero emojis per C6)
    - Cyberpunk theme: #00F0FF, #A855F7, #050505, #0A0A1A (per C7)
    - WCAG: role="alert", aria-labelledby, aria-hidden, alt, focus-visible:ring (per C5)
    - Zero `any`/`as any`/`<any>` (per C1)
    - File ≤ 300 linhas
    - **Função VincularSteamPage tem ≤ 50 linhas** (verificação automatizada via awk): `[ "$(awk '/export default async function VincularSteamPage/,/^}$/' src/app/vincular/steam/page.tsx | wc -l)" -le 50 ]` exit 0
    - **Sub-componente ErrorBanner extraído pra reduzir a página principal**: `grep -q "function ErrorBanner" src/app/vincular/steam/page.tsx` exit 0
    - `pnpm typecheck` exit 0
    - `pnpm lint` exit 0 (ou só warnings pre-existentes)
  </acceptance_criteria>
  <done>
    Página /vincular/steam renderiza ambos estados, integrada com Server Action e callback handler. Sub-componente ErrorBanner extraído — VincularSteamPage ≤ 50 linhas (per C2 sem exceção). Mensagem específica pra erro de CSRF (state mismatch / cookie expirado). Usuário vê fluxo completo end-to-end.
  </done>
</task>

</tasks>

<verification>
- `pnpm typecheck` exit 0
- `pnpm lint` exit 0
- Manual smoke test (requer STEAM_WEB_API_KEY configurada em `.env.local`):
  1. `pnpm dev` → login Discord → aceitar doutrina → middleware redirecionar pra /vincular/steam (Plan 04 layer Steam)
  2. Ver UnlinkedState card cyan
  3. Clicar "Continuar com Steam" → cookie `steam_csrf_state` setado, redirect Steam OpenID com `?state=<uuid>`
  4. Autorizar na Steam → redirecionar pra `/auth/steam/callback?openid.*&state=<uuid>`
  5. Callback handler lê cookie, chama validateAndFetchSteam (CSRF check via timingSafeEqual + assinatura + persona) + upsert + redirect /vincular/steam?ok=1
  6. Middleware vê steam_link existe → redirect /perfil
  7. Voltar manual em /vincular/steam → middleware redirect /perfil (não fica preso)
  8. Forçar erro CSRF: editar URL adicionando `?error=csrf` → ver mensagem A855F7 alert "Sua sessão de vinculação expirou..."
  9. Manualmente apagar cookie no devtools e completar flow → callback redireciona com ?error=csrf (timingSafeEqual falha porque a.length=0)
- Verificar via Supabase Dashboard: `select * from public.steam_links where user_id = <discord_user_id>` retorna registro com persona/avatar/steam_id_64
</verification>

<success_criteria>
- H1.1 entregue: Steam OpenID 2.0 funcional end-to-end com proteção CSRF (state em cookie httpOnly + timingSafeEqual)
- H1.2 estrutura: tabela steam_links é fundação multi-redes (V2 adiciona youtube_links, twitch_links seguindo mesmo pattern)
- C2 honrado: GET handler ≤ 50 linhas, file ≤ 80 linhas (helper validateAndFetchSteam absorve composição); VincularSteamPage ≤ 50 linhas (ErrorBanner extraído)
- C13 honrado: zero service role nesta phase (cookie client em todo lugar; service role só em /api/webhooks/abacatepay)
- C11 honrado: try/catch isolando erros, zero .then() chains
- C5/C6/C7: WCAG, Lucide, cyberpunk consistentes
- Erros do callback têm UX clara (mensagens PT-BR específicas — incluindo erro de CSRF)
</success_criteria>

<output>
After completion, create `.planning/phases/03-steam-oauth-roles-multicoach/03-03-SUMMARY.md` documentando:
- 3 arquivos criados (actions.ts, page.tsx, route.ts) com tamanhos finais
- Confirmação: GET handler de route.ts tem ≤ 50 linhas e file ≤ 80 linhas (per C2 sem exceção)
- Confirmação: VincularSteamPage tem ≤ 50 linhas — sub-componente ErrorBanner extraído (per C2 sem exceção)
- Smoke test manual realizado (Steam dev key configurada por Pedro)
- Confirmação: cookie `steam_csrf_state` setado/lido/apagado nos pontos certos
- Confirmação: dados em `steam_links` table no Supabase
- Próximos plans: 04 (middleware Steam gate) e 05 (multi-coach refactor) podem rodar em paralelo após este
</output>
