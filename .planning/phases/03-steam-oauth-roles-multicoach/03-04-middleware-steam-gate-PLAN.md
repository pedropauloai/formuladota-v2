---
phase: 03-steam-oauth-roles-multicoach
plan: 04
plan_id: 03-04
title: Middleware update — STEAM_REQUIRED_PATHS gate (após doutrina, antes de rotas privadas)
type: execute
wave: 2
depends_on:
  - 03-01
files_modified:
  - src/lib/supabase/middleware.ts
autonomous: true
requirements_addressed:
  - H1.1
  - C4
  - C12
  - C13
must_haves:
  truths:
    - "User logado, com doutrina aceita, sem registro em steam_links, acessando /pacotes → redirect para /vincular/steam"
    - "User logado, com doutrina aceita, com steam_link existente, acessando /pacotes → passa normalmente"
    - "User logado, com steam_link existente, acessando /vincular/steam → redirect para /perfil (não fica preso)"
    - "User SEM doutrina aceita acessando /pacotes → redirect /onboarding/doutrina (camada anterior preservada — camada Steam vem DEPOIS)"
    - "Erro de DB ao consultar steam_links NÃO bloqueia user — log via console.error e segue (fail-open) — infra falhou, não vamos tirar acesso de quem talvez tenha Steam vinculado"
    - "Rotas públicas (/, /codigo-de-conduta, /login, /privacidade, /cookies) seguem ignorando enforcement Steam"
    - "Auth flow paths (/auth, /api/webhooks) seguem retornando response sem checagem (preserva callback Steam!)"
  artifacts:
    - path: "src/lib/supabase/middleware.ts"
      provides: "Middleware com 4 camadas: banned > suspended > !accepted_doctrine > !steam_linked (com fail-open em DB error)"
      contains: "STEAM_REQUIRED_PATHS"
  key_links:
    - from: "src/lib/supabase/middleware.ts"
      to: "supabase.from('steam_links').select"
      via: "single query .eq('user_id', user.id).maybeSingle() na camada Steam"
      pattern: "from\\(['\"]steam_links['\"]\\)"
    - from: "src/lib/supabase/middleware.ts STEAM_REQUIRED_PATHS"
      to: "/vincular/steam"
      via: "NextResponse.redirect quando path matcha STEAM_REQUIRED_PATHS sem steam_link"
      pattern: "redirect\\(new URL\\(['\"]/vincular/steam"
    - from: "src/lib/supabase/middleware.ts /vincular/steam logado com steam"
      to: "/perfil"
      via: "redirect /perfil quando steam_link existe e user em /vincular/steam"
      pattern: "redirect\\(new URL\\(['\"]/perfil"
---

<objective>
Atualizar `src/lib/supabase/middleware.ts` adicionando uma 4ª camada de enforcement: após validação de behavior_status (banned/suspended) e doutrina aceita, verificar se o user logado tem `steam_links` registrado. Se não tiver e estiver tentando acessar rotas privadas (definidas em `STEAM_REQUIRED_PATHS`), redirect para `/vincular/steam`. Se já tiver e estiver navegando em `/vincular/steam`, redirect para `/perfil`.

A camada Steam DEPENDE apenas do schema (Plan 03-01 — tabela `steam_links` precisa existir pra query funcionar). NÃO depende de Plan 03-03 — a página `/vincular/steam` referenciada no redirect é apenas string literal; mesmo que Plan 03-03 não esteja deployado ainda, o redirect funciona (renderizará 404 até 03-03 entregar a página, mas a camada middleware já está correta).

Purpose: Replicar o pattern já existente de doutrina obrigatória (Phase 1.5) extendendo a fila de checagens. Garante que H1.1 não vire opcional — usuários DEVEM vincular Steam antes de comprar pacotes ou acessar conteúdo privado. Fail-open em erro de DB pra não bloquear usuários por problema de infra.

Output:
- `src/lib/supabase/middleware.ts` com nova camada Steam, query Supabase isolada (1 query a mais, só pra users que passaram nas camadas anteriores)
- Lista `STEAM_REQUIRED_PATHS` definida no topo: `["/pacotes", "/checkout", "/partidas", "/perfil"]` (per CONTEXT)
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md
@src/lib/supabase/middleware.ts
@src/types/database.ts

<interfaces>
<!-- Middleware estrutura existente (src/lib/supabase/middleware.ts) -->
```typescript
const PUBLIC_PATHS = ["/", "/login", "/codigo-de-conduta", "/privacidade", "/cookies"];
const AUTH_FLOW_PATHS = ["/auth", "/api/auth", "/api/webhooks"];
const ONBOARDING_PATHS = ["/onboarding/doutrina"];
const BLOCKED_STATUS_PATHS = ["/suspended", "/banned"];

function isPathInList(pathname: string, list: string[]): boolean {
  return list.some(p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
}

// Fila atual de enforcement (linhas 87-126):
// 1. AUTH_FLOW_PATHS → return response (preserva callbacks)
// 2. !user → return response (rotas públicas SSR-rendered handle anonymous)
// 3. profile.behavior_status === 'banned' → /banned
// 4. profile.behavior_status === 'suspended' && suspended_until > now → /suspended
// 5. !accepted_doctrine → /onboarding/doutrina (a menos que public/onboarding path)
// 6. accepted_doctrine && em ONBOARDING/BLOCKED → /perfil

// PRECISAMOS ADICIONAR camada 6 (entre atual 5 e 6):
// Se accepted && !steam_linked && path em STEAM_REQUIRED_PATHS → /vincular/steam
// Se accepted && steam_linked && pathname === /vincular/steam → /perfil
```

<!-- Database type (Tables<"steam_links">) — Plan 03-01 -->
```typescript
{
  user_id: string;          // primary key references profiles(id)
  steam_id_64: string;
  persona: string | null;
  avatar_url: string | null;
  verified_at: string;
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Adicionar STEAM_REQUIRED_PATHS + camada Steam ao middleware (com fail-open em DB error)</name>
  <files>src/lib/supabase/middleware.ts</files>
  <read_first>
    - src/lib/supabase/middleware.ts (entender fila atual completa: AUTH_FLOW > banned > suspended > doutrina > redirect-from-onboarding)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisão exata: STEAM_REQUIRED_PATHS = `["/pacotes", "/checkout", "/partidas", "/perfil"]`; redirect lógica quando vinculado em /vincular/steam → /perfil)
    - src/types/database.ts (verificar Tables<"steam_links"> exists pós Plan 03-01)
  </read_first>
  <action>
    Editar `src/lib/supabase/middleware.ts` com mudanças cirúrgicas. NÃO reescrever — só adicionar.

    1. **Adicionar constante** após linha de `BLOCKED_STATUS_PATHS`:
    ```typescript
    // Rotas que exigem Steam vinculado (Phase 3 — H1.1).
    // User logado, com doutrina aceita, mas sem steam_links → redirect /vincular/steam.
    // /vincular/steam em si NÃO está na lista (senão loop infinito).
    const STEAM_REQUIRED_PATHS = [
      "/pacotes",
      "/checkout",
      "/partidas",
      "/perfil",
    ];
    const STEAM_LINK_PATH = "/vincular/steam";
    ```

    2. **Modificar bloco de profile select** — atualmente seleciona `doctrine_accepted_at, doctrine_version, behavior_status, suspended_until`. NÃO adicionar steam_links aqui (manter query separada — RLS permite user select própria steam_link, então é uma query simples eq + maybeSingle).

    3. **Adicionar nova camada** ENTRE o bloco "Sem aceite da doutrina" e o bloco "Já aceitou + status ok/warned: sem restrição" (lógica entre linhas 104-127 do arquivo atual). Inserir após o bloco `if (!accepted) { ... }` e antes do bloco `if (isPathInList(pathname, ONBOARDING_PATHS) || isPathInList(pathname, BLOCKED_STATUS_PATHS))`:

    ```typescript
      // Camada Steam (Phase 3 — H1.1): após doutrina aceita.
      // Buscamos steam_link só uma vez por request — query é cheap (PK lookup user_id).
      const needsSteamCheck =
        pathname === STEAM_LINK_PATH ||
        isPathInList(pathname, STEAM_REQUIRED_PATHS);

      if (needsSteamCheck) {
        const { data: steamLink, error: steamErr } = await supabase
          .from("steam_links")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (steamErr) {
          // Fail-open: erro de infra não bloqueia user — apenas log.
          // Razão: se a query falhar, não sabemos se o user tem Steam vinculado;
          // bloquear seria pior UX do que liberar a request (RLS continua protegendo
          // dados sensíveis das tabelas reais).
          console.error("[middleware] steam_links query failed:", steamErr);
          return response;
        }

        // User SEM Steam vinculado tentando rota protegida → manda vincular
        if (!steamLink && isPathInList(pathname, STEAM_REQUIRED_PATHS)) {
          return NextResponse.redirect(new URL(STEAM_LINK_PATH, request.url));
        }

        // User COM Steam vinculado em /vincular/steam → redireciona pra perfil
        // (página ainda renderiza estado vinculado se acessar diretamente,
        // mas em flow normal esse redirect leva pra dashboard)
        if (steamLink && pathname === STEAM_LINK_PATH) {
          return NextResponse.redirect(new URL("/perfil", request.url));
        }
      }
    ```

    **Atenção crítica — ordem das camadas**:
    - AUTH_FLOW_PATHS no topo continua **mandatório** porque protege `/auth/steam/callback` (que precisa rodar antes do middleware verificar steam_link — senão entra em loop: callback faz upsert, middleware ainda não vê).
    - Camada Steam vai **DEPOIS** de doutrina aceita — usuário sem doutrina ainda é redirecionado pra /onboarding/doutrina primeiro.
    - O redirect "vinculado em /vincular/steam → /perfil" reaproveita o redirect "Já aceitou + ONBOARDING_PATHS → /perfil" que já existe (linhas 122-126). NÃO precisa adicionar `/vincular/steam` em ONBOARDING_PATHS — a camada Steam já resolve.

    4. **Comentários PT-BR** na nova camada (per C12). Indicar referência H1.1 em comment.

    5. **Restrições**:
    - File ≤ 300 linhas no total (atualmente ~130, ficará ~165).
    - Função `updateSession` ≤ 100 linhas (já está em ~100, vai pra ~125 — aceitável). Se passar 100 muito, extrair `enforceSteamLink(supabase, user, pathname, request, response)` helper.
    - Cookie client APENAS — NUNCA service role (per C13).
    - Async/await sempre (per C11).
    - Zero `any` (per C1).
    - `pnpm typecheck` exit 0.

    NÃO modificar:
    - PUBLIC_PATHS, AUTH_FLOW_PATHS, ONBOARDING_PATHS, BLOCKED_STATUS_PATHS existentes
    - Lógica de banned/suspended/doutrina
    - Função isPathInList
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && grep -q "STEAM_REQUIRED_PATHS" src/lib/supabase/middleware.ts && grep -q '"/pacotes"' src/lib/supabase/middleware.ts && grep -q "STEAM_LINK_PATH" src/lib/supabase/middleware.ts && grep -q 'from(.steam_links.)' src/lib/supabase/middleware.ts && grep -q "redirect(new URL(.*/vincular/steam" src/lib/supabase/middleware.ts && grep -q "redirect(new URL(.*/perfil" src/lib/supabase/middleware.ts && grep -q "steamErr" src/lib/supabase/middleware.ts && grep -q "console.error.*steam_links" src/lib/supabase/middleware.ts && awk '/if.*!accepted/{accepted=NR} /from.*"steam_links"/{steam=NR} END{exit (steam>accepted)?0:1}' src/lib/supabase/middleware.ts && ! grep -E '\\.then\\(|\\.catch\\(' src/lib/supabase/middleware.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/supabase/middleware.ts` contém constante `STEAM_REQUIRED_PATHS` com array incluindo `"/pacotes"`, `"/checkout"`, `"/partidas"`, `"/perfil"`
    - Contém constante `STEAM_LINK_PATH = "/vincular/steam"`
    - Contém query `supabase.from('steam_links').select('user_id').eq('user_id', user.id).maybeSingle()` capturando `error` (não só data)
    - **Fail-open em DB error** (WARNING 1): query captura `{ data: steamLink, error: steamErr }` e em caso de `steamErr`, faz `console.error("[middleware] steam_links query failed:", steamErr)` e `return response;` ANTES dos checks `!steamLink`. Verificável: `grep -q "steamErr" src/lib/supabase/middleware.ts && grep -q "console.error.*steam_links" src/lib/supabase/middleware.ts`
    - Contém `if (!steamLink && isPathInList(pathname, STEAM_REQUIRED_PATHS))` → redirect /vincular/steam
    - Contém `if (steamLink && pathname === STEAM_LINK_PATH)` → redirect /perfil
    - **Camada Steam está APÓS o `if (!accepted)` (doutrina)** (WARNING 2 — verificável via grep ordem): `awk '/if.*!accepted/{accepted=NR} /from.*"steam_links"/{steam=NR} END{exit (steam>accepted)?0:1}' src/lib/supabase/middleware.ts` exit 0 (steam check vem depois do accepted check)
    - AUTH_FLOW_PATHS, PUBLIC_PATHS, ONBOARDING_PATHS, BLOCKED_STATUS_PATHS continuam intactos (`grep -c 'PUBLIC_PATHS\\|AUTH_FLOW_PATHS\\|ONBOARDING_PATHS\\|BLOCKED_STATUS_PATHS'` ≥ 8 — 4 declarações + 4+ usos)
    - Zero `.then()`/`.catch()` chains (per C11)
    - `pnpm typecheck` exit 0
  </acceptance_criteria>
  <done>
    Middleware enforce Steam linking com fail-open em DB error. User logado com doutrina aceita SEM Steam é redirecionado pra `/vincular/steam` ao tentar `/pacotes`, `/checkout`, `/partidas`, `/perfil`. User com Steam não fica preso em `/vincular/steam`. Phase 1.5 doutrina enforcement preservado (camada Steam vem depois). Erro de infra na query loga e libera (não bloqueia).
  </done>
</task>

</tasks>

<verification>
- `pnpm typecheck` exit 0
- `pnpm build` (se rodar) sem erros
- Manual smoke test:
  1. Login Discord, aceitar doutrina, NÃO vincular Steam
  2. Tentar GET http://localhost:3000/pacotes → deve redirecionar pra /vincular/steam
  3. Tentar GET http://localhost:3000/perfil → deve redirecionar pra /vincular/steam
  4. Vincular Steam (via Plan 03-03)
  5. Tentar GET http://localhost:3000/pacotes → deve renderizar normalmente
  6. Tentar GET http://localhost:3000/vincular/steam → deve redirecionar pra /perfil
- Manual: ver que callback `/auth/steam/callback` ainda funciona (não cai em loop) — testar URL direto após Steam OpenID
- Manual: simular DB down (desligar Supabase localmente / forçar erro) → log "steam_links query failed:" aparece, request NÃO redireciona pra /vincular/steam (fail-open ativo)
</verification>

<success_criteria>
- H1.1 enforcement vivo — Steam vinculado é gate hard pra rotas privadas
- Camada Steam não quebra Phase 1.5 (doutrina ainda gate primário se ambos faltarem) — ordem verificada via awk
- AUTH_FLOW_PATHS preservado — callback Steam não entra em loop
- 1 query extra por request autenticado em rotas STEAM_REQUIRED_PATHS (ou /vincular/steam) — overhead aceitável (PK lookup ~1ms)
- Fail-open em DB error: log + segue (UX > security paranoia em erro de infra)
</success_criteria>

<output>
After completion, create `.planning/phases/03-steam-oauth-roles-multicoach/03-04-SUMMARY.md` documentando:
- Linhas adicionadas (range exato no arquivo final)
- Ordem das 4 camadas final (banned > suspended > doutrina > steam) — confirmar via awk check
- Decisão sobre extrair helper `enforceSteamLink` (sim/não — depende de tamanho final)
- Smoke test manual realizado (incluindo cenário fail-open com DB inacessível)
</output>
