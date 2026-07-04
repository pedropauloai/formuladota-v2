# Handoff Cowork → Claude Code

**Data**: 2026-05-01
**Contexto**: Setup externo (Discord, Supabase, AbacatePay, Resend, Vercel, GitHub, Hostinger, OpenDota) foi feito via Cowork. Agora o Claude Code retoma o desenvolvimento.

---

## ✅ O que está PRONTO

### 1. Credenciais & ambiente
- `.env.local` populado com todos os valores reais (Supabase URL/keys, Discord IDs/tokens, AbacatePay, Resend, etc.)
- `.secrets-tmp.md` na raiz tem o backup completo dos secrets (gitignored — apagar quando confiar que `.env.local` está estável)
- Validação Zod em `src/lib/env.ts` aceita o ambiente sem warnings

### 2. Supabase
- **Projeto criado**: `nyvbfdsxjpiwgdroptdi` em `sa-east-1` (São Paulo, free plan, org dedicada `formuladota`)
- **Discord OAuth provider configurado** com Client ID/Secret e callback URL
- **Migrations aplicadas** (001-004):
  - `001_initial_schema.sql` — tables: `profiles`, `packages`, `purchases`, `availability_windows`, `matches`, `sessions`, `user_stats`
  - `002_rls_policies.sql` — 25 policies, RLS ativo em tudo
  - `003_seed_packages.sql` — 4 pacotes (Avulsa R$10, Pacote 5 R$50, Pacote 10 R$100, Mentoria mensal R$100)
  - `004_doctrine_and_moderation.sql` — `doctrine_versions`, `user_warnings`, `behavior_status_log`
- **Triggers** ativos: `set_updated_at`, `handle_new_user` (auto-cria profile + user_stats no signup), `warning_progression`

### 3. Discord
- App `formuladota` criada (ID: `1499631204100604025`)
- Bot configurado com 3 privileged intents (Presence, Server Members, Message Content)
- Install URL pronto em `DISCORD_BOT_INSTALL_URL` no `.env.local`
- Guild ID FORMULADOTA: `303265529433686017`
- Callback Supabase já registrado em OAuth2 → Redirects do Discord
- ⚠️ **Bot ainda não está em nenhum servidor** — Pedro precisa abrir o `DISCORD_BOT_INSTALL_URL` e instalar no servidor FORMULADOTA

### 4. Pagamento (AbacatePay)
- API key sandbox `formuladota-dev` criada (Leitura+Escrita, sem permissões DELETE)
- Webhook v2 criado apontando pra `https://formuladota.vercel.app/api/webhooks/abacatepay`
- ⚠️ **AbacatePay v2 mudou os nomes dos eventos**:
  - `payment.paid` → **`checkout.completed`**
  - `payment.expired` / `payment.cancelled` → **`checkout.lost`**
  - novo: **`checkout.refunded`**
  - O handler em `/api/webhooks/abacatepay` precisa usar esses nomes novos quando for implementado
- Webhook secret HMAC: salvo em `.env.local` como `ABACATEPAY_WEBHOOK_SECRET`

### 5. Email (Resend)
- API key `formuladota-dev` (Sending access)
- Domínio formuladota.com **não verificado** no Resend
- `EMAIL_FROM=onboarding@resend.dev` (placeholder Resend) até DNS ser configurado no AWS Route 53

### 6. OpenDota
- API key **Premium ativa**: `<REDIGIDA na auditoria 2026-07-03>` (estava em texto claro e versionada no git — **ROTACIONAR** no dashboard OpenDota; o valor real vive só em `.env.local`)
- Billing: $0.01/100 calls, sem rate limits, ciclo termina 31/05/2026 (Visa configurado)
- Pode usar livremente em `lib/opendota.ts` quando implementar análise de match histórico

### 7. GitHub
- Repo **privado** `pedropauloai/formuladota-v2` criado
- Remote já registrado em `.git/config`

### 8. Build local saudável
- `pnpm typecheck` ✓
- `pnpm lint` ✓
- `pnpm build` ✓ (Next.js 16.2.4 — produz 6 rotas: `/`, `/login`, `/perfil`, `/auth/callback`, etc.)
- `src/types/database.ts` gerado via introspection (Supabase CLI exige Docker, foi feito manualmente)

### 9. Domínio
- `formuladota.com` ativo na Hostinger, expira 2026-07-15, renovação automática ON
- **DNS está em AWS Route 53** (não na Hostinger). Nameservers: `ns-1123.awsdns-12.org`, `ns-118.awsdns-14.com`, `ns-1855.awsdns-39.co.uk`, `ns-661.awsdns-18.net`

---

## 🔧 Tarefas iniciais para o Claude Code resolver

Antes de tocar em código novo, executar nesta ordem:

### A. Destravar git e fazer primeiro push

Há um `.git/config.lock` órfão de 0 bytes que o Cowork não conseguiu remover (sandbox sem permissão). O `.git/config` já tem o remote `origin` apontando pra `https://github.com/pedropauloai/formuladota-v2.git` — só destravar.

Comandos a executar (Bash do Claude Code rodando direto no Windows tem permissão):

```bash
# Remover lock travado
rm -f /c/Users/ADM/projects/formuladota-v2/.git/config.lock
# (ou em PowerShell via shell.run: Remove-Item C:\Users\ADM\projects\formuladota-v2\.git\config.lock -Force)

cd /c/Users/ADM/projects/formuladota-v2

# Verificar que remote está correto
git remote -v
# Esperado:
# origin  https://github.com/pedropauloai/formuladota-v2.git (fetch)
# origin  https://github.com/pedropauloai/formuladota-v2.git (push)

# Garantir branch main
git branch --show-current   # se não for "main", git branch -M main

# Stage tudo (já tem .gitignore protegendo .env*, .secrets-tmp.md, node_modules, .next, etc.)
git add -A

# IMPORTANTE: confirmar que .secrets-tmp.md e .env.local NÃO estão staged antes de commitar
git status --short | grep -E "secrets-tmp|env.local" && echo "❌ ABORTAR — secrets vazariam!" || echo "✅ secrets protegidos"

git commit -m "chore: bootstrap formuladota-v2 (Phase 1)

- Next.js 15 + TS + Tailwind v4 scaffold
- Supabase migrations 001-004 (schema, RLS, packages, doctrine)
- Discord OAuth via @supabase/ssr
- Database types em src/types/database.ts
- Env validation com Zod"

git push -u origin main
```

> **Se `git push` pedir credencial**: Pedro provavelmente já tem GitHub CLI ou credential manager configurado (já fez OAuth no Vercel). Se falhar, criar PAT em github.com/settings/tokens com `repo` scope e usar como senha.

### B. Pendências MANUAIS de Pedro (Claude Code não consegue)

| Ação | Onde | Por quê manual |
|---|---|---|
| Instalar bot no servidor FORMULADOTA | Abrir `DISCORD_BOT_INSTALL_URL` (do .env.local) no navegador como admin | Discord exige usuário autorizar OAuth na UI; Claude não pode automatizar |
| Apagar 4 apps Discord antigas (Bot - FormulaDota, FormulaDota, FormulaDotaSite, LIGA FORMULADOTA) | https://discord.com/developers/applications | Deleções permanentes são ação proibida pra Claude |
| Configurar DNS de formuladota.com no AWS Route 53 quando for pra prod | console.aws.amazon.com/route53 | Cowork não tem AWS conectado; Claude Code também não tem |
| Verificar domínio formuladota.com no Resend após DNS pronto | https://resend.com/domains | Depende do DNS acima |

---

## 🛠️ O que falta — Para o Claude Code retomar

Seguir o `TASKS.md` na raiz. Resumo do que **ainda não foi feito em código**:

### Phase 1 — Foundation (alguns itens já existem, validar)
Já existem em `src/`:
- `src/app/layout.tsx` (layout base — verificar se header com login/perfil está completo)
- `src/app/page.tsx` (landing — pode precisar do hero + 3 features)
- `src/app/login/page.tsx` + `actions.ts` (login com Discord)
- `src/app/auth/callback/route.ts` (OAuth callback handler)
- `src/app/perfil/page.tsx`
- `src/lib/supabase/{client,server,middleware}.ts` (helpers SSR)
- `src/lib/env.ts` (validação Zod)
- `src/lib/utils.ts` (cn helper)

**Provavelmente falta**:
- Componente `<LoginButton />` reutilizável com estilo cyberpunk
- Acabamento da landing page (hero + features + CTA)
- shadcn/ui components — verificar se base já está instalada
- Paleta cyberpunk em `globals.css` (cyan #00F0FF, purple #A855F7, dark #050505)
- Smoke test end-to-end: login Discord → profile auto-criado → ver `/perfil`

### Phase 2 — Catalog & Checkout (do zero)
- `/pacotes` lista pacotes (já tem 4 seedados no DB)
- `<PackageCard />`
- `/checkout/[packageId]` com QR Code PIX
- `lib/abacatepay.ts` (gerar PIX via API V2)
- Server Action `criarCompra(packageId)`
- API Route `/api/webhooks/abacatepay` validando HMAC com `ABACATEPAY_WEBHOOK_SECRET` e tratando `checkout.completed` / `checkout.lost` / `checkout.refunded`
- Idempotência via `external_payment_id`
- Email confirmação via Resend (usar `from: onboarding@resend.dev` enquanto domínio não verificado)

### Phase 3 — Profile & Scheduling (do zero)
- Form `/perfil` (steam_id, mmr_inicial, role_preferida)
- `/partidas` (saldo + histórico)
- Admin `/admin/disponibilidade` CRUD `availability_windows`
- `lib/calendar.ts` (gerar slots de availability_windows)
- `/agendar` (calendário clicável)
- `agendarPartida(slotDateTime)` — debita saldo
- **Limite hardcoded** 3 partidas/dia
- `cancelarPartida(matchId)` (restaura saldo se +24h)

### Phase 4 — Discord Bot (do zero, em pasta `bot/`)
- Setup `bot/` com Discord.js v14 + TS
- Use `DISCORD_BOT_TOKEN` + `DISCORD_GUILD_ID` do `.env.local`
- Comandos `/perfil`, `/saldo`, `/agendar`
- DM lembrete 30min antes da partida
- ⚠️ Bot precisa estar instalado no servidor primeiro (ação manual de Pedro)

### Phase 5 — Admin Panel (do zero)
- `/admin/*` para Pedro gerenciar partidas, pacotes, users, doctrine

### Phase 6 — Polish & Deploy
- Conectar Vercel ao repo `pedropauloai/formuladota-v2`
- Adicionar todas as env vars no Vercel (Production)
- Configurar domínio customizado quando DNS estiver pronto
- Atualizar `ABACATEPAY_WEBHOOK_URL` quando souber URL real do Vercel

---

## 📁 Arquivos importantes pra Claude Code consultar primeiro

1. `PRD.md` — requisitos completos
2. `TASKS.md` — backlog ordenado por fase
3. `CLAUDE.md` — convenções do projeto (TypeScript strict, paleta, etc.)
4. `.env.local` — secrets reais (não commitar!)
5. `.secrets-tmp.md` — backup com mais contexto sobre cada secret (apagar quando confortável)
6. `supabase/migrations/` — SQL aplicado (referência pra entender o schema)
7. `src/types/database.ts` — types do Supabase, importar em queries

## 🔑 Comandos úteis pra Claude Code

```bash
pnpm dev          # dev server (porta 3000)
pnpm build        # build produção
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm db:gen-types # ⚠️ requer Docker — alternativa: rodar o script Python que está embedded no .secrets-tmp.md ou via bash
```

## 🎯 Próximo passo recomendado

1. Pedro destrava o git e faz primeiro push
2. Claude Code roda `pnpm dev`, testa fluxo de login Discord end-to-end (deve funcionar — provider Supabase já configurado, callback registrado no Discord)
3. Se login OK, atacar Phase 2 (checkout PIX) que destranca a monetização
