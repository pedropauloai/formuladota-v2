# Auditoria de Segurança e Performance — formuladota-v2

- **Alvo:** repositório Next.js 16 (App Router / React 19) + Supabase, hospedado na Vercel
- **Data:** 2026-07-03
- **Tipo:** white-box (código-fonte) + advisors do Supabase ao vivo (somente leitura)
- **Modo:** correção agressiva — as correções de baixo/médio risco já foram **aplicadas no código**; as de banco vão numa **migration pronta para revisar** (`supabase/migrations/118_security_hardening_advisors.sql`), pois esta sessão teve acesso ao Supabase apenas em leitura.
- **Verificação:** cada diff passou por revisão independente (subagente) — sem blockers. `tsc`/`build` não rodam neste sandbox (node_modules é do Windows); **rode `pnpm install && pnpm build` antes do deploy.**

---

## Sumário executivo

A plataforma está **madura em segurança** — bem acima do que o relatório black-box anterior conseguia ver. Confirmei que os controles essenciais estão corretos: **RLS habilitado nas 63 tabelas**, webhook de pagamento com **HMAC + refetch + idempotência**, Steam OpenID com **re-handshake anti-spoofing**, cron autenticado, **zero sinks de XSS**, **sem SQL injection**, e uma arquitetura de variáveis de ambiente **exemplar** (segredos server-only, nada sensível em `NEXT_PUBLIC_`).

Dito isso, a auditoria white-box + advisors encontrou o que o black-box não podia ver. O achado mais sério é de **banco**: qualquer visitante (papel `anon`, chave pública) podia chamar a RPC `apply_match_mmr` e **forjar MMR/ranking** — o coração da plataforma — porque a guarda interna é pulada quando `auth.uid()` é nulo. Também: os 6 headers de defesa em profundidade do relatório black-box (H1–H6), uma injeção de path na busca OpenDota, e uma chave de API OpenDota **commitada** no git.

### Placar

| Categoria | Crítico | Alto | Médio | Baixo | Status |
|---|:--:|:--:|:--:|:--:|---|
| Headers HTTP (H1–H6) | – | – | 1 | 4 | ✅ corrigido no código |
| Banco (RLS/RPC/advisors) | – | 1 | 2 | vários | ⚙️ migration 118 pronta + itens documentados |
| App (SSRF/authz) | – | – | 1 | 3 | ✅ corrigido no código |
| Segredos | – | 1 | 1 | 2 | ⚠️ ação sua (rotacionar) |
| Performance | – | 3* | 2 | 2 | 1 corrigido + demais documentados |

\* "Alto" em performance = impacto no first-load/TTFB, não severidade de segurança.

### O que já está aplicado no código (deploy direto)

Headers de segurança completos (CSP enforce em produção, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, remoção do `X-Powered-By`); guarda anti-injeção na busca OpenDota; checagem de autorização em `cancelLobby`/`deleteTeam`; comparações em tempo constante no cron e no bot; hardening do OpenID; e `howler` carregado sob demanda (perf). Chave OpenDota redigida do arquivo versionado; `.gitignore` reforçado.

### O que exige ação sua (fora do que posso fazer)

1. **Aplicar a migration 118** (num branch/preview do Supabase primeiro).
2. **Rotacionar segredos** que já circularam em texto claro: chave OpenDota (estava no git), e — antes de qualquer deploy do bot — service_role, senha da conta Steam, Steam Web API key e token do bot Discord.
3. **Rodar `pnpm build`** localmente/preview e conferir o console com a CSP em enforce.

---

## 1. Headers HTTP (H1–H6) — ✅ corrigido

Os seis achados do relatório black-box foram resolvidos em `next.config.ts` (`poweredByHeader:false` + `async headers()`).

| # | Achado | Correção |
|---|---|---|
| H1 | Sem Content-Security-Policy | CSP em **modo enforce** (produção). `frame-ancestors 'none'`, `object-src 'none'`, `connect-src` com Supabase (REST+`wss`) e OpenDota/STRATZ, `img-src` com CDNs Steam/Discord/Supabase. |
| H2 | Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| H3 | MIME sniffing | `X-Content-Type-Options: nosniff` |
| H4 | Referrer | `Referrer-Policy: strict-origin-when-cross-origin` |
| H5 | Permissions | `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| H6 | `X-Powered-By: Next.js` | `poweredByHeader: false` |

**Decisões de projeto:** a CSP é aplicada **só em produção** (`NODE_ENV === "production"`) — em dev o Turbopack/HMR usa `eval`/inline sem nonce e a CSP quebraria o dev server. O `script-src` usa `'unsafe-inline'` porque o App Router injeta scripts inline sem nonce; como **não há script externo** no app e **zero sinks de XSS**, o risco residual é baixo. **Endurecimento futuro:** CSP baseada em nonce via middleware (removeria o `'unsafe-inline'`).

⚠️ **Ao deployar:** abra o console do browser e confirme que nada legítimo é bloqueado. Se algum dia o Supabase migrar para **domínio próprio** (custom domain em vez de `*.supabase.co`), adicione a origem em `connect-src`.

---

## 2. Banco de dados (Supabase) — advisors + RLS

RLS está **habilitado nas 63 tabelas** (`temp_uid` está com RLS on e 0 policies = default-deny, inofensivo). Mas os advisors revelaram exposição de funções `SECURITY DEFINER`.

### 2.1 🔴 ALTO — `apply_match_mmr` chamável por `anon` forja MMR/ranking

A função tem a guarda:

```sql
if auth.uid() is not null and not (public.is_admin() or <é o coach da partida>) then
  raise exception 'sem permissão pra aplicar MMR nesta partida';
end if;
```

Quando o chamador é `anon`, `auth.uid()` é **NULL** → a condição inteira vira falsa → **a guarda é pulada** e a função aplica MMR. Como o papel `anon` tem `EXECUTE` e a `anon key` é pública (vai no bundle do cliente), **qualquer visitante** podia `POST /rest/v1/rpc/apply_match_mmr` com `p_results` forjado e alterar MMR/rank de qualquer partida ainda não pontuada (a idempotência por `mmr_applied_at` limita a partidas não aplicadas, mas não impede a forja).

**Correção (migration 118):** `REVOKE EXECUTE ... FROM public, anon;` mantendo `authenticated` (coach/admin, com a guarda ativa) e `service_role` (cron). Fecha o buraco sem quebrar o fluxo legítimo.

### 2.2 🟠 MÉDIO — `release_bot` / `try_form_match` sem guarda, expostos a `anon`

Nenhuma das duas tem checagem de caller. Anon podia liberar bots do pool (`release_bot`) ou forçar formação de partida (`try_form_match`) — vetor de griefing no matchmaking. **Correção (migration 118):** `REVOKE` de `public, anon`; mantém `authenticated`+`service_role`. **Recomendação adicional:** dar a `release_bot` uma guarda interna (checar se o caller é dono do lobby do bot ou admin) e, se confirmado que só o serviço chama, remover também `authenticated`.

### 2.3 🟡 72 funções `SECURITY DEFINER` no API RPC (anon + authenticated)

Das 72, **17 são funções de trigger** (`apply_ficha_ledger`, `calculate_revenue_split`, `award_xp_on_match_complete`, `handle_new_user`, etc.). O Postgres já bloqueia chamada direta de trigger, mas o correto é tirá-las do schema exposto. **Correção (migration 118):** DO-block que revoga `EXECUTE` de todas as secdef-trigger de `public/anon/authenticated` (triggers seguem funcionando, rodam como owner).

As demais ~55 não-trigger que **exigem login** (`create_party`, `join_coach_queue`, `equip_cosmetic`, `dm_inbox`, etc.) usam `auth.uid()` internamente — anon chamando é inócuo, mas o ideal é revogar `anon`. **Deixei fora da migration automática** (precisa separar as genuinamente públicas — `get_public_profile`, `community_counters`, `recent_matches`, `live_matches`, `wall_of_shame`, `get_pros_live_status`, `get_queue_searchers`, `match_bans` — das authenticated-only, para não quebrar páginas de visitante). Ver SQL recomendado no fim desta seção.

### 2.4 🔴 (ERROR no advisor) 3 views `SECURITY DEFINER`

`public_player_identities`, `bot_pool_status`, `tournament_matches_expanded` rodam com privilégios do criador (burlam a RLS de quem consulta). Se forem de leitura pública por design, tudo bem desde que só exponham colunas não sensíveis; senão, no PG17:

```sql
alter view public.bot_pool_status set (security_invoker = true);
-- idem para tournament_matches_expanded; revisar public_player_identities.
```

**Ação:** revisar cada uma. Não incluí na migration porque exige julgamento sobre o que cada view expõe. Remediação: <https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view>

### 2.5 🟡 14 funções sem `search_path` fixo

`function_search_path_mutable`. **Correção (migration 118):** DO-block com `alter function ... set search_path = public, pg_temp`.

### 2.6 Outros advisors (documentados — aplicar com cautela)

| Item | Nível | Ação recomendada |
|---|---|---|
| `pg_net` no schema `public` | WARN | mover para schema próprio (cuidado: o cron usa pg_net) |
| Bucket `profile-avatars` permite listar arquivos | WARN | restringir a policy SELECT de `storage.objects` a `name`-scoped |
| Proteção contra senha vazada (HaveIBeenPwned) desligada | WARN | ativar em Auth → Settings |
| 125 políticas permissivas duplicadas (22 tabelas) | WARN (perf) | consolidar 2–4 policies por ação numa só (maiores: `coach_queue_entries`, `profiles`) |
| 54 índices nunca usados | INFO | `DROP INDEX` após confirmar (reversível) |
| `temp_uid` sem PK / sem policy | INFO | tabela temporária — avaliar remoção |

**SQL recomendado (revogar `anon` das funções authenticated-only)** — aplicar após revisar a lista de públicas acima:

```sql
-- Exemplo do padrão; gere a lista completa excluindo as funções públicas de leitura.
revoke execute on function public.create_party() from anon;
revoke execute on function public.join_coach_queue(uuid) from anon;
-- ...demais authenticated-only.
```

---

## 3. Aplicação (SSRF / autorização) — ✅ corrigido

### 3.1 🟡 S1 — injeção de path na busca OpenDota

O `dotaMatchId` chegava cru em `` `${OPENDOTA_BASE}/matches/${matchId}` `` (`src/lib/dota/opendota.ts:89,198,310`). As actions `enrichMatchFromOpenDota` / `reprocessMatchOpenDota` (`admin/pros/actions.ts`) passavam o valor sem validar. O host é fixo (sem SSRF para host arbitrário), mas dava para injetar path/query (`123/../players/x`, `1?api_key=…`) — restrito a chamadores autenticados (PRO/admin).

**Correção:** guarda `assertNumericMatchId()` no início das 3 funções de `opendota.ts` (lança se não for `^\d+$`) + validação `^\d{6,15}$` nas 2 actions (defesa em profundidade). O caminho Steam→STRATZ/OpenDota de **perfil** já era seguro (SteamID vem do banco, não de request).

### 3.2 🟢 `cancelLobby` — DELETE sem checagem no código

`cancelLobby` (`lobbies/[id]/actions.ts`) fazia `DELETE FROM lobbies` sem `getUser()` nem ownership — dependia só da RLS. Pior: **não existe policy de DELETE em `lobbies`** (confirmado), então o "encerrar lobby" era um **no-op silencioso** (bug funcional além do gap de defesa).

**Correção:** o código agora exige `getUser()` + `created_by === user.id || is_admin`, e a **migration 118 cria a policy de DELETE** que faltava. Mesmo tratamento em `deleteTeam` (`times/actions.ts`) — a RLS `teams_delete_captain` já existia, mas faltava a checagem no código (retornava "sucesso" silencioso para não-capitães).

### 3.3 🟢 Endurecimentos de auth (Steam OpenID / cron)

- `steam.ts`: validação do OpenID trocada de `text.includes("is_valid:true")` para regex de **linha exata** `^is_valid:true$` — evita aceitar corpo forjado tipo `is_valid:truefoo`.
- `cron/finalize-matches`: comparação do `CRON_SECRET` agora é **tempo constante** (`timingSafeEqual`), consistente com o resto do código.

### 3.4 ✅ Auth/pagamentos/webhooks — já estavam corretos (não mexi)

Steam OpenID valida via `check_authentication` (anti-spoofing); webhook MercadoPago verifica **HMAC** + refaz **GET server-to-server** na API do MP (não confia em valor/status do corpo) + é **idempotente**; cron exige `CRON_SECRET`; open redirect tratado (`safeNext`/`safeRedirect`); RPC de crédito de fichas atômica e com `EXECUTE` revogado de anon/authenticated.

---

## 4. Segredos

### 4.1 🔴 ALTO — chave OpenDota commitada no git

`.planning/HANDOFF_FROM_COWORK.md:49` continha a chave premium `a2bf5a74-…` em texto claro, **versionada** (commit `1dbc2b8`; `.planning/` não está no `.gitignore`).

**Feito:** valor **redigido** no arquivo. **Ação sua:** (1) **rotacionar** a chave no dashboard OpenDota (ela tem billing ativo); (2) como já está no histórico do git, limpar com `git filter-repo`/BFG antes de tornar o repo público (ou tratar como comprometida).

### 4.2 🟠 `.secrets-tmp.md` + `.env` dos bots (locais, não versionados)

`.secrets-tmp.md` (raiz) e `bot-steam/.env` guardam segredos reais em texto claro no disco — **mas confirmei que nenhum está no git nem no histórico** (bem gitignored). Risco é local, não do repositório.

**Ação sua:** apagar `.secrets-tmp.md` após uso (o próprio cabeçalho instrui). Como circularam em claro, **rotacionar antes de qualquer deploy** que gere logs: **service_role key** do Supabase, **senha da conta Steam** do bot (`bot-steam/.env`), **Steam Web API key**, e **token do bot Discord** (`bot/.env`). Para o bot Steam, migrar para login por **refresh token** e remover a senha. **Feito:** `.gitignore` reforçado com `bot-steam/.env` explícito.

### 4.3 ✅ Já correto

Nenhum segredo hardcoded no código-fonte; `NEXT_PUBLIC_` só com URL/anon key do Supabase (públicos por design); `.env.example` só com placeholders; `service_role` isolada em `lib/supabase/service.ts`; componente `valve-credential.tsx` é só visual (não lida com credencial de auth).

---

## 5. Bots (`bot/` e `bot-steam/`)

- **`bot/` (Discord):** sólido — auth em todas as rotas de ação, validação Zod, fail-closed. **Feito:** comparação da API key trocada para **tempo constante** (`bot/src/api/middleware/auth.ts`).
- **`bot-steam/` (Steam/Dota):** funciona; sem command injection / SQL injection / path traversal. O ponto é a **higiene de segredos** (seção 4.2). Deps saudáveis (`steam-user`, `dota2-user` — stack padrão/mantida). A `.venv` Python é resíduo morto (pode remover). Senha de lobby é logada em claro — considere mascarar.

---

## 6. Performance

### 6.1 ✅ Corrigido — `howler` fora do first-load

`howler` (~30KB gz) entrava no bundle inicial de **toda rota** (via `SoundProvider` no layout raiz). Agora é **dynamic import** (`src/lib/sound/manager.ts`) — só baixa quando o som realmente inicializa (pós-gesto).

### 6.2 Recomendado (não aplicado — maior risco/refactor)

| # | Item | Impacto | Recomendação |
|---|---|---|---|
| 1 | Fontes `@fontsource` (Ubuntu 4 pesos × 6 subsets + Teko) | Alto (render-block) | Migrar para `next/font/google` (self-host, `swap`, preload do subset usado). Não editei porque os arquivos de subset `latin` não existem nessa versão do pacote — trocar o import cegamente quebraria o build. |
| 2 | Middleware: `getUser()` + 2 queries **sequenciais** por request | Alto (TTFB) | Paralelizar `profiles`+`steam_links` com `Promise.all`; mover o gate de doutrina/steam para os layouts (Server Components) e deixar o middleware só com refresh de sessão. |
| 3 | `ClientShell` dispara ~24 queries por página | Médio | Já usa `Promise.all` (bom). Cachear as **públicas e estáveis** (`getFichaPackage`, `getFeatureFlags`, `getCommunityCounters`, `getProsWithQueues`) com `unstable_cache`/`revalidate` curto; considerar 1 RPC para as 8 de `fetchPrivateData`. |
| 4 | `<img>` cru em ~19 arquivos | Médio (LCP/CLS/banda) | Migrar para `next/image` os de listas/cards (`avatar.tsx`, `match-card.tsx`, `queue-board.tsx`, `times-content.tsx`) — os hostnames já estão liberados em `next.config.ts`. |
| 5 | `@tsparticles/*` instalado mas **código morto** (`AmbientLayer` nunca renderizado) | Baixo | Remover as 3 deps + `AmbientLayer.tsx`/`lib/particles`. **Cuidado:** ao editar `package.json`, rode `pnpm install` para atualizar o lockfile, senão `pnpm install --frozen-lockfile` (Vercel) falha. Por isso não removi automaticamente. |

**Nota:** o achado "pasta `public/` ausente" de uma varredura automática foi **falso positivo** — `public/` existe (9.1 MB: `brand/og-hero.png`, `sounds/ui-sprite.*`, `icons/`, `sw.js`). Sem risco de 404. Só falta `manifest.webmanifest` se o PWA precisar (o `sw.js` existe).

### 6.3 ✅ Já bem feito (não mexer)

`Promise.all` no shell; fetch externo STRATZ/OpenDota com `revalidate: 3600` + cache de 24h; `LazyMotion` (motion ~10KB em vez de ~45KB); `react-grid-layout` com `next/dynamic`; `PremiumBackdrop` como Server Component estático; sem N+1 real (queries em `.map()` usam `.in('id', ids)` para batch).

---

## 7. Arquivos alterados nesta auditoria

**Segurança (código):** `next.config.ts`, `src/lib/dota/opendota.ts`, `src/app/admin/pros/actions.ts`, `src/app/lobbies/[id]/actions.ts`, `src/app/times/actions.ts`, `src/lib/steam.ts`, `src/app/api/cron/finalize-matches/route.ts`, `bot/src/api/middleware/auth.ts`.

**Performance (código):** `src/lib/sound/manager.ts`.

**Higiene:** `.planning/HANDOFF_FROM_COWORK.md` (chave redigida), `.gitignore` (bot-steam).

**Banco (para revisar/aplicar):** `supabase/migrations/118_security_hardening_advisors.sql`.

---

## 8. Checklist de deploy

1. `pnpm install` (garante `@types/howler`, ausente no snapshot local) → `pnpm build` → conferir que passa.
2. Deploy na Vercel; **abrir o console do browser** e validar a CSP em enforce (nada legítimo bloqueado).
3. Aplicar a **migration 118 num branch/preview do Supabase** primeiro; depois produção.
4. **Rotacionar** a chave OpenDota (e, antes de deployar bots, service_role / senha Steam / Steam Web API key / token Discord).
5. Reconferir os headers: `curl -sSI https://www.formuladota.com/` deve mostrar CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy e **não** mais `X-Powered-By`.
6. (Opcional, alto valor) atacar os itens de performance recomendados (fontes + middleware) e os advisors de banco restantes.
