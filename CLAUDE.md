# formuladota v2 — Claude Code Instructions

## Project

**formuladota v2** é o **app da comunidade FORMULADOTA** — uma cultura competitiva de Dota 2 liderada por Pedro Paulo (Immortal/Top 0.5%). A plataforma é uma máquina de doutrinação e conversão de mentalidade: quiz de doutrina em 4 Pilares, sistema de progressão por níveis, lobbies (livre + elite Imortal), partidas "ranked com PRO" via fichas PIX, e identidade pública anti-anonimato. **A cultura é o produto; o Dota é o terreno.**

📋 **Fontes da verdade, em ordem:** ler **`docs/foundations/index.md`** primeiro (índice de 1 linha por doc — padrão LLM Wiki: seguir só os links relevantes pra tarefa, não varrer a pasta) → `.planning/ROADMAP.md` + `STATE.md` → migrations em `supabase/migrations/`. O `PRD.md` na raiz é o documento ORIGINAL (loja de mentoria 1-1) e foi **sobrescrito em escopo** pelos pivôs de maio/2026 — usar só como contexto histórico.

🗺️ **Mapa do código (graphify):** pra trabalho de arquitetura ou busca ampla, ler o grafo em vez de varrer o repo (economiza tokens): `graphify-out/GRAPH_REPORT.md` (resumo: hubs, comunidades) e `graphify-out/graph.json` (grafo completo, consultável) — ambos versionados. Atualizar após mudanças estruturais: `graphify update .` (AST local, sem chamada de API). A viz interativa `graph.html` e o `cache/` são gitignored (regeneráveis).

### Constraints
- **Marca (LEI de copy)**: o nome é **FORMULADOTA** — sempre em CAIXA ALTA, **sem acento**, sem espaço (nunca "Fórmula Dota", "Formula Dota" nem "formuladota"). É **MASCULINO**: "**o/do/no** FORMULADOTA", NUNCA "a/da/na FORMULADOTA". ("da comunidade FORMULADOTA" é válido — quem é feminino ali é *comunidade*.) Fonte: `docs/foundations/PRODUCT_CORE.md` (regras B1/B2 + glossário de marca).
- **i18n (LEI de dialeto, Pedro 2026-07-07)**: app trilíngue PT/EN/ES via `next-intl` (`messages/{pt,en,es}.json`, paridade de chaves obrigatória). Todo termo de Dota 2 usa o **dialeto OFICIAL do cliente da Valve naquele idioma** (fonte: dotawiki de cada idioma) — NUNCA tradução literal nem Spanglish. Ex.: Radiant/Dire → EN "Radiant/Dire", PT "Iluminados/Temidos", ES "Radiant/Dire" (o cliente ES não traduz nomes próprios, mas traduz Queue→Cola, ranks→Heraldo/…/Inmortal, Support→Soporte). Vale pra qualquer idioma futuro (russo). Confirmar o termo na dotawiki antes de gravar. Detalhes: memória `reference_i18n_dialeto_oficial_valve`.
- **Tech Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Supabase + Discord OAuth + Mercado Pago (PIX) + bot Discord (Discord.js) + bot Steam/Dota GC (node-steam-user)
- **Deploy**: web em **www.formuladota.com.br** (o formuladota.com foi perdido em 10/2026), na **Cloudflare Workers pelo OpenNext** (`wrangler.jsonc`, `open-next.config.ts`). Build e deploy rodam no WSL, porque no Windows o empacotamento falha por link simbólico: `pnpm cf:build && pnpm cf:deploy`, com o ambiente de produção em `.env.producao` (fora do git) e os segredos no Worker por `wrangler secret`. A Vercel (Hobby, uso não comercial) não recebe mais deploy: `vercel.json` desliga o deploy por Git. Prova de que está no ar: `pnpm cf:verificar` (`scripts/verificar-no-ar.sh`, bate nas URLs reais e sai com o número de falhas), que o `pnpm cf:deploy` já roda no fim. O "Always Use HTTPS" fica ligado na zona da Cloudflare. **Os dois bots (`bot/` Discord e `bot-steam/` Steam/GC) têm deploy AUTOMÁTICO no Railway** (git-connected) ao dar push na `main` — NÃO precisa redeploy manual.
- **Persona**: jogador Dota 2 brasileiro comprometido, de qualquer bracket
- **Pricing**: ficha de vaga = **R$ 10 fixo** (pricing descentralizado por PRO foi REVERTIDO em 2026-06-02, migration 041). Split 85/10/5. Mudança de preço = aprovação Pedro.
- **Gates de acesso**: criar sala = assinatura ativa; entrar em lobby = nível 6 (doutrinado) OU ≥1 permissão de partida; lobby elite = assinatura + Imortal Valve + Místico nv30. Lógica centralizada em `src/lib/` e enforced por RLS/funções SQL.
- **Maintainability**: Pedro é não-dev. Código deve ser legível, comentários em português onde não-óbvio
- **Novidades (LEI, Pedro 2026-07-05)**: SEMPRE que shipar algo visível/relevante pro jogador, adicionar 1 entrada em `changelog_entries` (`published=true`, `body_md` em voz didática de jogador — o que mudou e por quê). Ela aparece no `/novidades` na hora e espelha sozinha no Discord (canal 🆕丨atualizacoes) via cron. **Curadoria (LEI):** NADA de segurança/RLS/auditoria/jargão de dev vaza pro público. `category` ∈ novidade|melhoria|correcao|balanceamento. Detalhes e como fazer: memória `project_changelog_novidades`.

### Estado atual — sistema de partidas & placar (atualizado 2026-06-30)
- **URL canônica de uma partida = `dota_match_id`** (ID real da Valve, ex `8873698944`), tanto AO VIVO quanto no HISTÓRICO. NÃO usar UUID interno nem `steam_lobby_id` na URL gerada.
  - **Ao vivo** (`/partida/[id]`): o `bot-steam` grava `dota_match_id` JUNTO com `steam_lobby_id` ao criar o lobby (no lobby de liga o match_id já vem no SO cache). O overlay de aceite (`ready-check-overlay`) espera ~30s (poll de `getMatchRouteId`) e redireciona pra `/partida/<dota_match_id>`. A página resolve `dota_match_id` → `steam_lobby_id` (legado) → UUID.
  - **Histórico/placar** (`/partida/historico/[id]`): resolve `dota_match_id`→`match_id` via tabela **`match_details`** (pública, migration 069), porque `matches` tem RLS restrita (+ `notas_pedro` privado) e não serve pro público.
- **Placar pós-jogo completo** em `/partida/historico/[dota_match_id]`: 10 abas estilo OpenDota/STRATZ (Visão geral, Performance, Gráficos, Builds, Combate, **Mapas/minimapa de visão**, Teamfights, Objetivos, Draft, Benchmarks). Tudo SSR a partir de `match_players.raw_opendota` (objeto OpenDota completo por jogador, leitura pública) + `match_details` (nível-partida: teamfights/objectives/picks_bans/chat). Componentes em `src/components/match/`, parsers puros em `src/lib/dota/` (match-stats, match-build, match-vision, match-series, match-objectives, assemble-match).
- **Catálogos estáticos** (gerar via `pnpm gen:heroes|gen:items|gen:abilities`): `src/data/dota-{heroes,items,abilities}.json`. Minimapa do Dota em `public/dota/minimap/minimap.jpg` (mapa atual `detailed_<patch>`; transform de coordenadas = `gameCoordToUV` do OpenDota — ver memória reference_dota_minimap_vision).
- O enrich (`enrichMatchFromOpenDota` em `src/app/admin/pros/actions.ts`) popula `match_players` + `match_details`. Hoje existe **1 partida real** registrada.

## Workflow Recomendado

Este projeto usa **GSD plugin (Get Shit Done)**. Para qualquer trabalho:

```bash
/gsd-execute-phase
```

Fases e status atuais: ver `.planning/ROADMAP.md` (as "6 fases do PRD" original foram superadas pelos pivôs — não seguir aquela sequência).

Para fixes pequenos: `/gsd-quick`. Para debug: `/gsd-debug`.

## Convenções

### Código
- TypeScript strict mode, zero `any`
- Functions max 50 linhas
- Files max 300 linhas
- Early return pra reduzir nesting
- Async/await sempre, nunca `.then().catch()` chains
- ES6 imports, nunca `require()`
- `const` por padrão, `let` quando precisar
- Logger em vez de `console.log` em produção (use `console.error` apenas em server actions)

### Validação
- Zod em todos os inputs de API e Server Actions
- RLS policies obrigatórias em todas as tables Supabase
- Validar webhooks (assinatura HMAC)

### UI — Hierarquia de design (LEI, decidida por Pedro 2026-06-11)

A identidade visual tem DUAS leis complementares — não confundir:

1. **ESTRUTURA, LAYOUT e DENSIDADE = cliente Dota 2 real.** Sistema A: coluna esquerda de identidade+amigos, top tabs, sidebar direita contextual, bottom-bar com [JOGAR DOTA] verde. Denso e compacto, NÃO arejado estilo SaaS. Referência canônica: `docs/foundations/DOTA2_CLIENT_REFERENCE.md` (catálogo das 9 imagens na raiz). NÃO é Riot/Valorant minimalista.
2. **PELE (cores, materiais, tipografia) = brand FormulaDota**, definida EXCLUSIVAMENTE pelos tokens em `src/styles/tokens/raw.css` + `semantic.css`: vermelho `#C42121` (ExitLag), verde play/success `#00C466` (GamersClub), neutros escuros ExitLag (`#0B0C0F`/`#111317`), dourado pra números/destaques (família gold), Ubuntu (body) + Teko condensed (nav, títulos, números). Radius 2px (quase reto). Essas referências (ExitLag/GamersClub) foram escolha INTENCIONAL do Pedro — não "corrigir" pra outra paleta.

Base de marca (identidade-âncora): vermelho/verde/dourado/neutros ExitLag. **Nenhuma cor é PROIBIDA** (Pedro 2026-07-06: "não há nada proibido") — ciano/azul elétrico, roxo etc. são livres como ACENTO premium (ex.: molduras elétricas cosméticas), desde que a base da marca continue sendo a identidade dominante. A antiga regra "cyan/roxo proibido" (vazamento do portfólio) foi revogada.

Evitar (não por veto de cor, mas por consistência):
- Cores/durations/z-index hardcoded em componentes de UI GERAL — sempre via tokens semânticos (regras C14-C20 em `docs/foundations/DESIGN_LANGUAGE.md`). (Exceção: cores de efeito/cosmético específicas podem ser literais quando não há token, ex.: azul elétrico de uma skin.)
- Avatares `rounded-full` — avatar de usuário é SEMPRE quadrado `rounded-sm` (padrão Steam/Dota). Dots de presença podem ser redondos.

Demais regras:
- Lucide icons (`lucide-react`) — NUNCA emojis em UI
- shadcn/ui components base
- Acessibilidade WCAG 2.1 AA

### Arquitetura
- Server Components por padrão; Client Components só pra interatividade
- Server Actions pra mutations (não API routes pra forms internos)
- API Routes pra webhooks externos (`/api/webhooks/*`)
- Supabase: SSR via `@supabase/ssr` (createServerClient + createBrowserClient)
- Imagens via Next/Image + Supabase Storage CDN

### Pagamentos
- **Mercado Pago PIX** como provedor (AbacatePay foi substituído — referências legadas podem existir em docs antigos)
- Validar webhook com `MP_WEBHOOK_SECRET` (HMAC via `verifyMpWebhookSignature`)
- Status flow: `pendente` → `pago` (libera saldo) ou `expirado` / `cancelado`
- Idempotência: webhook duplicado não duplica saldo
- Lib canônica: `src/lib/mercadopago/` (a pasta — o arquivo `src/lib/mercadopago.ts` é legado em consolidação)

### Bots (Discord + Steam) — deploy automático no Railway
- **`bot/`** — bot **Discord** (Discord.js v14 + TypeScript, Docker). Railway via `bot/railway.toml` (healthcheck `/health`, `node dist/index.js`). OAuth Discord é via Supabase (não reimplementar do zero). Slash commands no servidor. Lê DB via service role key.
- **`bot-steam/`** — worker **Steam/Dota GC** (`bot-server.js`, `node-steam-user` + `dota2-user` + `lobby.proto`). É a máquina que CRIA a sala no Dota: pega lobby confirmado (`lobbies` status='open', `steam_lobby_id` NULL), cria via GC, convida os 10, lança, e grava `steam_lobby_id` + `dota_match_id` de volta. (O README dele diz "SPIKE", mas hoje é o worker de produção.)
- **Os dois fazem deploy AUTOMÁTICO no Railway ao dar push na `main`** — não precisa redeploy manual. Posso validar pela próxima partida se necessário.

### Git
- Branches: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- NUNCA commitar `.env`, secrets, ou Supabase service role key
- **Fluxo (Pedro 2026-07-07):** sempre trabalhar em branch (nunca commit direto na main) e abrir PR — pelo preview da Vercel + reversão de 1 clique. Pedro NÃO revisa PR (valida em produção), então **o Claude mescla o próprio PR** assim que `typecheck` + `lint` passam; não esperar review. EXCEÇÃO (aí sim aguardar aprovação do Pedro antes de mesclar): migrations, billing/pagamentos, mudança de preço, deps majores.
- **Paralelismo entre sessões:** 1 pasta do projeto = 1 branch por vez (working tree único). Rodar 2 sessões simultâneas SÓ em pastas/clones diferentes, e evitando os mesmos arquivos. Nunca 2 sessões na mesma pasta. Worktree proibido pelo Pedro.

## Variáveis de Ambiente

Ver `.env.example` na raiz — é a fonte da verdade das variáveis (Supabase, Discord, Mercado Pago `MP_*`, OpenDota, app). Não duplicar a lista aqui.

## Comandos

```bash
pnpm dev          # dev server local
pnpm build        # build produção
pnpm typecheck    # tipos
pnpm lint         # eslint
pnpm db:gen-types # gera types/database.ts via Supabase CLI
pnpm gen:heroes   # regenera catálogo de heróis (idem gen:items, gen:abilities)

cd bot && pnpm dev          # bot Discord local
cd bot-steam && pnpm bot    # worker Steam/GC local (node bot-server.js)
```

## Testing

- Validar manualmente fluxo end-to-end antes de deploy
- Testar webhook Mercado Pago com sandbox (`TEST-` token) antes de produção
- Bot Discord testado em servidor de teste antes de mover pro oficial

## References

- `docs/foundations/` — 20 docs fundacionais (fonte da verdade de produto e design)
- `PRD.md` — requisitos ORIGINAIS (histórico, sobrescrito pelos pivôs)
- [OpenDota API](https://docs.opendota.com/)
- [Mercado Pago docs](https://www.mercadopago.com.br/developers)
- [Discord.js v14](https://discordjs.guide)
- [Supabase Auth Discord](https://supabase.com/docs/guides/auth/social-login/auth-discord)

## Skills Locais

Quando relevante, use os skills do plugin GSD do Claude Code (já instalado):
- `engineering:architecture` — pra ADRs
- `engineering:debug` — pra investigar bugs
- `engineering:code-review` — antes de fazer PR
- `data:sql-queries` — pra queries Supabase complexas

## Permissões

### Sem aprovação (autonomous)
- Fix typescript errors
- Refactor pra reduzir tamanho de arquivo
- Adicionar testes
- Atualizar deps minor/patch

### Com aprovação Pedro
- Mudanças em `packages` (preço, qtd) — sempre alinhar antes
- Schema changes (migrations)
- Mudanças em billing/payments
- Deploy produção
- Adicionar deps majores
