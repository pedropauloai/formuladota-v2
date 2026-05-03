# Pendências Pedro — Tarefas Manuais Pós-Phase 8

**Data:** 2026-05-03
**Status:** Phases 1, 1.5, 2, 3, 3.5, 4, 5, 6, 7, 8 — código completo. Build/typecheck/lint verdes.

Tudo o que sobrou são **tarefas externas** que Claude não consegue fazer (criar contas, configurar credenciais, deploy real). Lista organizada por phase + prioridade.

---

## 🔴 BLOQUEADORES PARA PRODUÇÃO

### 1. Mercado Pago — Webhook URL produção
**Quando:** ao deploy Vercel produção (Phase 8)

- [ ] Acessar painel MP: https://www.mercadopago.com.br/developers/panel/app/6433273436140638/webhooks
- [ ] Substituir URL teste (`https://smee.io/kzpoTzeRpc3a2YSA`) por URL produção (`https://formuladota.com/api/webhooks/mercadopago`)
- [ ] Manter mesmo `MP_WEBHOOK_SECRET` (já configurado no .env.local)
- [ ] Topics: payment + subscription_authorized_payment + subscription_preapproval

### 2. Mercado Pago — Trocar TEST → PRODUCTION credentials
**Quando:** antes de receber primeiro pagamento real

- [ ] Painel MP → "Credenciais" → Production mode
- [ ] Copiar `Access Token` (formato `APP_USR-...`)
- [ ] Copiar `Public Key`
- [ ] Atualizar `.env.local` (dev pra ainda usar TEST) e Vercel env vars (prod usa APP_USR-)
- [ ] Testar 1 pagamento real R$1 com você mesmo pra validar fluxo

### 3. Bot Steam — Conta dedicada + Setup Railway
**Quando:** antes de Phase 5 estar funcional em produção

**Detalhes completos em `bot/README.md`.** Resumo:

- [ ] Criar conta Steam dedicada **não-Pedro** (https://store.steampowered.com/join/)
- [ ] Comprar Dota 2 (free) + 1 jogo R$ 1-5 (anti-botting policy Steam)
- [ ] **Maturar 30+ dias** — login esporádico, jogar 1-2 partidas
- [ ] Habilitar Steam Guard Mobile + extrair `shared_secret` via SDA (Steam Desktop Authenticator)
- [ ] Criar conta Railway: https://railway.app
- [ ] Conectar repo GitHub → criar serviço com `bot/Dockerfile`
- [ ] Criar Volume Railway montado em `/data`
- [ ] Setar env vars no Railway:
  ```
  STEAM_ACCOUNT_NAME=formuladota_bot
  STEAM_PASSWORD=...
  STEAM_SHARED_SECRET=...
  SUPABASE_URL=https://nyvbfdsxjpiwgdroptdi.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=... (mesmo do app)
  BOT_API_KEY=<openssl rand -hex 32>
  ```
- [ ] Após deploy bot, copiar URL Railway (ex: `https://formuladota-bot-production.up.railway.app`) e o mesmo `BOT_API_KEY` pra `.env.local` do app:
  ```
  BOT_API_URL=https://formuladota-bot-production.up.railway.app
  BOT_API_KEY=<mesmo key do bot>
  ```

**Custo:** Railway Hobby ~$5/mês (R$ 13/mês com taxa).

---

## 🟡 PRÉ-DEPLOY VERCEL

### 4. DNS formuladota.com — Hostinger → Vercel
- [ ] Vercel: criar projeto novo + conectar repo GitHub `pedropauloai/formuladota-v2`
- [ ] Setar env vars Vercel produção (todas do `.env.local` + `NEXT_PUBLIC_SITE_URL=https://formuladota.com`)
- [ ] Deploy primeiro
- [ ] Hostinger DNS: apontar `formuladota.com` (A record) e `www.formuladota.com` (CNAME) pro Vercel (eles dão IPs)
- [ ] Vercel adiciona domínio + SSL automático

### 5. Stratz GraphQL Token (Phase 7 perfil V2)
**Opcional V1 — perfil funciona sem stats avançados.**

- [ ] Criar conta Stratz: https://stratz.com
- [ ] Tier 1 free 2000 req/h é suficiente
- [ ] Pegar API key
- [ ] Adicionar em `.env.local` + Vercel:
  ```
  STRATZ_API_KEY=...
  ```

---

## 🟢 OPCIONAL / FUTURO

### 6. Email Resend — domínio customizado
**Atualmente:** `EMAIL_FROM=onboarding@resend.dev` (default Resend).

- [ ] Resend dashboard → Domains → adicionar `formuladota.com`
- [ ] Configurar 3 DNS records (SPF, DKIM, DMARC) no Hostinger
- [ ] Trocar `EMAIL_FROM=noreply@formuladota.com` no `.env.local` + Vercel

### 7. Discord Bot oficial server (Phase 5+)
- [ ] Bot já registrado em FORMULADOTA Discord (303265529433686017)
- [ ] V2: integração de notificações lobby criado / mensalidade vencendo

### 8. Pix Automático — habilitar Subscriptions no app MP
**Status:** Cowork não conseguiu mudar product type via UI. Mas painel `/webhooks` aceita topic "Planos e assinaturas" mesmo com app tipo "Pagamentos". Provavelmente funciona — testar criando preapproval real.

- [ ] Criar primeiro preapproval real via UI (`/assinatura` → "Iniciar mensalidade")
- [ ] Verificar webhook chega via `mp__mercadopago__notifications_history`
- [ ] Se não funcionar: criar app MP novo dedicado a subscriptions

---

## ✅ JÁ FEITO (referência)

- ✅ Supabase: 12 migrations aplicadas (001-012)
- ✅ Discord OAuth: configurado e funcionando
- ✅ Steam OpenID: configurado (STEAM_WEB_API_KEY no .env)
- ✅ Mercado Pago: webhook salvo (smee.io tunnel), preapproval plan R$47 criado, MP_ACCESS_TOKEN TEST configurado
- ✅ Build/typecheck/lint todos verdes
- ✅ 24 routes Next compilando

---

## 🧪 SMOKE TEST MANUAL (quando deploy estiver pronto)

Fluxo completo end-to-end pra validar:

1. ☐ Acessar `https://formuladota.com` → ver landing com hero video Dota 2 oficial
2. ☐ Clicar "Entrar com Discord" → login OAuth
3. ☐ Ler doutrina + aceitar
4. ☐ Vincular Steam (autoriza OpenID)
5. ☐ Ir em `/pacotes` → comprar pacote avulso PIX (TEST mode com test user MP)
6. ☐ Ver QR Code → pagar como TEST user → email confirmação chega
7. ☐ Ir em `/assinatura` → "Iniciar mensalidade R$ 47"
8. ☐ Redirect MP → autoriza Pix Automático (TEST user)
9. ☐ Volta `/assinatura` → status "Mensalidade ativa"
10. ☐ Ir em `/criar-lobby` → criar lobby teste
11. ☐ Bot Steam (Railway) recebe POST `/lobby/create` → cria lobby Dota 2 GC
12. ☐ Ver lobby aparecer no Dota 2 client (Practice Lobby)
13. ☐ `/admin/dashboard` → ver KPIs reais

Cada ☐ marca um sinal de prod-ready.

---

## Comandos úteis

```powershell
# Dev local
cd C:\Users\ADM\projects\formuladota-v2
pnpm dev                                # Next.js dev server
pnpm dlx smee-client --url https://smee.io/kzpoTzeRpc3a2YSA --target http://localhost:3000/api/webhooks/mercadopago

# Bot dev local (só após criar conta Steam dedicada)
cd C:\Users\ADM\projects\formuladota-v2\bot
pnpm install
pnpm dev

# Deploy
git push                                # Vercel auto-deploys
# Bot: Railway auto-deploys quando você push pro repo
```

---

*Tudo o que era código está commitado em `main`. Pendências aqui são externas (contas, credenciais, DNS) que só você consegue resolver.*
