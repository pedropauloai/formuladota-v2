# formuladota v2 — Tasks

> Backlog ordenado por fase. Marcar `[x]` ao completar.
> Ver `PRD.md` pra contexto e acceptance criteria.

## Phase 1 — Foundation

- [ ] Criar repositório `formuladota-v2` no GitHub
- [ ] Bootstrap Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui
- [ ] Configurar paleta cyberpunk (cyan/purple/dark) em `globals.css`
- [ ] Criar projeto Supabase (região sa-east-1 pra latência BR)
- [ ] Migration `001_initial_schema.sql` (tables: profiles, packages, purchases, matches, sessions, user_stats, availability_windows)
- [ ] Migration `002_rls_policies.sql` (RLS policies do PRD)
- [ ] Configurar Discord OAuth no Supabase Auth
- [ ] Criar componente `<LoginButton />` (Discord OAuth)
- [ ] Hook automático cria profile na primeira login (trigger DB)
- [ ] Landing page minimal: hero + "Login com Discord" CTA + 3 features
- [ ] Layout base (header com logo + login/perfil)

**Acceptance**: User loga, profile criado, RLS funcionando.

## Phase 2 — Catalog & Checkout

- [ ] Migration `003_seed_packages.sql` (4 pacotes iniciais)
- [ ] Página `/pacotes` lista pacotes ativos
- [ ] Componente `<PackageCard />` (nome, descrição, preço, CTA)
- [ ] Página `/checkout/[packageId]` (resumo + botão "Pagar com PIX")
- [ ] Server Action `criarCompra(packageId)` (cria purchase status pendente)
- [ ] Lib `lib/abacatepay.ts` (gerar QR Code PIX)
- [ ] Tela com QR Code + texto "Aguardando pagamento..."
- [ ] API Route `/api/webhooks/abacatepay` (validar HMAC + atualizar purchase)
- [ ] Lógica idempotente (webhook duplicado não duplica saldo)
- [ ] Email confirmação via Resend após pagamento

**Acceptance**: Comprar pacote end-to-end via PIX. Saldo aparece em "minhas partidas".

## Phase 3 — Profile & Scheduling

- [ ] Página `/perfil` (form: steam_id, mmr_inicial, role_preferida)
- [ ] Server Action `atualizarPerfil(data)`
- [ ] Página `/partidas` (lista compras + saldo restante + histórico matches)
- [ ] Componente `<SaldoCard />` (partidas restantes destacadas)
- [ ] Admin: CRUD `/admin/disponibilidade` (availability_windows)
- [ ] Lib `lib/calendar.ts` (gerar slots disponíveis a partir de availability_windows)
- [ ] Página `/agendar` (calendário com slots clicáveis)
- [ ] Server Action `agendarPartida(slotDateTime)` (debita saldo + cria match)
- [ ] **Limite hardcoded**: max 3 partidas/dia agendáveis pelo Pedro
- [ ] Server Action `cancelarPartida(matchId)` (se +24h, restaura saldo)
- [ ] Componente `<HistoricoPartidas />` (lista cronológica)

**Acceptance**: User agenda partida, slot some do calendário, saldo decrementa.

## Phase 4 — Discord Bot

- [ ] Setup `bot/` (Node + TS + Discord.js v14)
- [ ] Lib `bot/src/lib/supabase.ts` (service role client)
- [ ] Comando `/perfil` (embed com info do user)
- [ ] Comando `/saldo` (partidas + sessões restantes)
- [ ] Comando `/agendar` (link pro calendário no site)
- [ ] Webhook agendamento → bot envia DM pra Pedro 30min antes
- [ ] Bot anuncia novo pagante em `#imortais` (canal opt-in)
- [ ] Deploy bot no Railway (free tier)
- [ ] Health check + auto-restart configurado

**Acceptance**: Bot responde comandos no servidor de teste. Pedro recebe DM 30min antes.

## Phase 5 — Admin Panel

- [ ] Layout admin (sidebar com links)
- [ ] Middleware: só usuários com `is_admin = true` acessam `/admin/*`
- [ ] Página `/admin` (dashboard KPIs)
  - [ ] Card receita do mês (sum purchases pagas)
  - [ ] Card partidas vendidas (sum partidas_compradas)
  - [ ] Card partidas agendadas pendentes
  - [ ] Card novos clientes (mês)
- [ ] Página `/admin/agenda` (lista próximas partidas + sessões)
- [ ] Botão "Marcar como realizada" + form (match_id Dota + notas)
- [ ] API call OpenDota → preenche stats automaticamente
- [ ] Page `/admin/pacotes` (CRUD)
- [ ] Page `/admin/clientes` (lista com filtros: ativo, mensalista, etc)
- [ ] Page `/admin/configuracoes` (availability_windows + horários)

**Acceptance**: Pedro gerencia tudo via admin sem editar DB direto.

## Phase 6 — Polish & Deploy

- [ ] Responsivo mobile (todas as páginas)
- [ ] Loading states (skeleton ou spinner)
- [ ] Empty states amigáveis
- [ ] Error handling em todas as Server Actions
- [ ] Toast notifications (sonner)
- [ ] SEO básico (meta tags, OG image)
- [ ] Favicon
- [ ] Deploy Vercel produção
- [ ] Configurar domínio (formuladota.com se disponível, ou Vercel default)
- [ ] Bot Discord no servidor oficial Fórmula Dota
- [ ] Smoke test completo (cadastro → compra → agendamento → admin marca → user vê)
- [ ] 1 cliente de teste real fazendo fluxo completo
- [ ] Backup configurado (Supabase point-in-time recovery)

**Acceptance**: App em produção. Pedro consegue executar venda end-to-end real.

## Pré-MVP (antes de começar)

- [ ] Verificar domínio formuladota.com (Registro.br)
- [ ] Pedro confirmar conta Discord pra criar bot
- [ ] Pedro confirmar AbacatePay produção ou sandbox pra começar
- [ ] Pedro definir 5-10 horários típicos de disponibilidade
- [ ] Validar demanda (sondar 10 contatos diretos)

## Pós-MVP (V2 — não fazer agora)

- [ ] Renovação automática assinatura mensal (Mercado Pago Recorrente)
- [ ] Sistema de replay com comentário gravado
- [ ] Análise IA da partida pós-jogo (Claude Sonnet)
- [ ] Página pública de ranking dos top alunos
- [ ] Sistema de afiliados (10% pra quem indicar)
- [ ] Integração Twitch (overlay stats em live)
- [ ] App mobile nativo
- [ ] Multi-idioma (EN pra mercado internacional Dota)
