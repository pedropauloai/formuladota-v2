# PRD — formuladota v2

> **Project Requirements Document**
> Plataforma de mentoria Dota 2 em tempo real com Pedro Paulo (Immortal/Top 0.5%) jogando ranked junto com clientes.
> Construir em **5-7 dias** com Claude Code via GSD workflow.

---

## 0. Cultura e Código de Conduta (NORTE)

> **A plataforma não é só uma loja de mentoria.** É o veículo pra reerguer uma comunidade **doutrinada** nos princípios da **Fórmula do Dota de Corrida** (1ª aula da Fórmula do MMR, autoria Pedro Paulo / PPA / Peter PPA — Immortal/7000 MMR, 15+ anos de Dota, 50.000h, 1ª calibração 2300 MMR).
>
> **Doc canônico**: `A FÓRMULA DO DOTA DE CORRIDA.txt` na raiz do repo — fonte da linguagem oficial pra todo copy de moderação, onboarding e pós-partida. Não parafrasear: citar.

### Por que isso vem antes de tudo

A Liga antiga (2024-2025, pico 77 pagantes → encerrada nov/2025) **não falhou por preço nem por produto**. Falhou porque "muitos não compreendiam a perspectiva séria/profissional, encaravam como entretenimento" — gerar gestão emocional desses clientes drenou Pedro até burnout.

Esta versão **não vende partida com Pedro pra qualquer um que pague**. Vende **acesso à cultura** — aceite é **obrigatório**, não condicional. Quem viola, é educado; reincide, é suspenso; persiste, é banido. Cultura é o moat e a barreira de proteção mental.

### Missão histórica (declarada no doc canônico)

> *"Formar pelo menos 200 jogadores na medalha Imortal de forma 100% legítima."*

Meta original era 2025. A reativar/atualizar com Pedro pra contador público no site (ex: "X imortais formados / 200 — meta viva 2026").

### Tom do onboarding (linguagem canônica do Pedro)

Frases que devem aparecer **literais** no fluxo `/onboarding/doutrina` e em `/codigo-de-conduta`:

> *"A ideia aqui não é te entreter — é te mudar por dentro, na forma de pensar, jogar e reagir ao Dota."*
>
> *"❗ A CULPA NUNCA É DO OUTRO ❗"* (Primeira Regra, destacada como no original)
>
> *"Frustração nasce de expectativas não correspondidas."*
>
> *"Ou você ganha, ou você aprende. Perder faz parte. Evoluir é uma escolha."*
>
> *"Não é arrogância. É responsabilidade. Saber mais significa que agora é você quem carrega a vitória."*
>
> *"A mentalidade aqui é competitiva. Em alguns momentos, você precisará deixar de lado hábitos ou preferências que não contribuem para sua evolução."*

### Os 14 princípios (regras de conduta — núcleo doutrinário)

**Mentais / comportamentais**
1. A culpa NUNCA é do outro — responsabilidade 100% sua, sempre.
2. Frustração nasce de expectativas não correspondidas — treinar não criar expectativas em terceiros.
3. Paralaxe cognitiva — cada jogador interpreta o jogo diferente; não existe verdade absoluta em jogada.
4. Errar é parte do aprendizado — sem medo de errar, desde que reconheça e aprenda.
5. Ou você ganha ou você aprende — derrota é degrau, não fim.
6. Não é arrogância, é responsabilidade — saber mais = carregar a vitória.

**Técnicos / execução**
7. Patrimônio (gold) por tempo é o KPI real — frags/KDA são consequência.
8. Metas mensuráveis: Core 5k @ 10min, 10k @ 20min (500 GPM). Suporte: metade.
9. Core é mais fácil — mais recursos = decisões mais simples.
10. Mid é a melhor rota — não divide XP, 1 nível/min ("corrida do nível").
11. Solo Mid OU grupo 5 — qualquer outra configuração trava evolução.
12. Smurfs propõem desafio — só melhora enfrentando melhores.

**Progressão**
13. 70% WR → +1000 MMR em 100 partidas (5/dia × 20 dias).
14. Guardião → Divine em 2 meses com método + disciplina.

### Os 10 padrões tóxicos (anti-cultura — bloqueados / educados)

1. Cultura da culpa (blame culture)
2. Desistência precoce ("gg go next" aos 10min)
3. Forçar estratégias inadequadas (stubborn playstyle)
4. Comunicação tóxica ou ausente
5. Rage quit / AFK disfarçado
6. Feeding intencional (griefing)
7. Ego inflado
8. Brigas por função e rota
9. Desrespeito à liderança (anti-time)
10. Preconceito, xenofobia, racismo

### Como a cultura aparece no produto

| Onde | O quê | Quando entra |
|---|---|---|
| **Onboarding** | Tela `/onboarding/doutrina` lista 14 princípios + 10 anti-padrões com linguagem canônica do Pedro; user aceita explicitamente. **Sem aceite, sem nada além de navegar landing pública.** | Phase 1.5 (antes do catálogo) |
| **DB profiles** | `doctrine_accepted_at`, `doctrine_version`, `behavior_status` (`ok`/`warned`/`suspended`/`banned`), `suspended_until`, `banned_at`, `banned_reason` | Migration 004 |
| **DB user_warnings** | Tabela de violações: `(user_id, principle_violated_n, severity, source, notes, issued_by, issued_at)` — auditoria completa | Migration 004 |
| **`/codigo-de-conduta`** | Página pública canônica — cita texto literal do doc do Pedro. Linkada de footer + onboarding + email pós-aceite. | Phase 1.5 |
| **Sistema progressivo de moderação** | **Advertência → Suspensão → Banimento.** Mecânica detalhada na seção §11 abaixo. | Phase 1.5 (schema) + V2 (UI admin completa) |
| **Pós-partida** | Após resultado registrado: prompt "Lembrete princípio X. O que você aprendeu hoje?" — campo livre opcional | Phase 5 |
| **Perfil** | Badge "Doutrinado" (aceite + 3 partidas sem violação). Status comportamental visível (`ok`/`warned`/`suspended`). | Phase 5 |
| **Discord bot** | Comando `/principios` lista os 14. Pedro pode advertir via comando `/advertir @user motivo` (loga em `user_warnings`). | Phase 4 |
| **Diferenciação meta-liga** | meta-liga = liga **técnica pura**. formuladota = liga **doutrinada** (técnica + comportamental). Cultura é o moat. | Toda comunicação |

### O que esta seção NÃO é

- ❌ Não é texto bonito pra landing — é **regra operacional** que rege RLS, triggers, fluxos de checkout, e moderação automática.
- ❌ Não transforma onboarding em muro hostil — texto é **convite**, não barreira (escrita revisada com Pedro antes do launch).
- ❌ Não cria culto ao Pedro — princípios são universais (Pedro [já mostrou que são transferíveis a IA / dev / qualquer área](../segundo-cerebro/07%20-%20Negocio/Metodologia%20de%20ensino%20Pedro.md)).
- ❌ Não pressiona cliente a "se comportar" — protege Pedro de gerenciar quem **não absorve a cultura**.

> **Ação aberta**: Pedro deve enviar o **doc canônico completo** ("A Fórmula do Dota de Corrida", upload 30/04/2026) antes da Phase 1.5 — copy do código de conduta deve usar a linguagem original do Pedro, não paráfrase Cowork.

---

## 1. Project Context

### O que é
**formuladota v2** é uma plataforma web onde clientes compram partidas ranked com Pedro Paulo (Immortal/7000 MMR), agendam horários, jogam juntos com mentoria em tempo real, e acompanham progressão (MMR, stats, conquistas) num perfil pessoal integrado ao Discord.

### Por que existe
- **Pedro retorna ao Dota 2 como fonte de receita adicional** após 5 meses fora (saiu por burnout em nov/2025)
- **Modelo "presença reduzida + serviço premium individual"** — sem comunidade aberta tóxica que causou o burnout original
- **Aproveita ativos**: 14k inscritos canal Fórmula Dota + metodologia documentada + credenciais Immortal
- **Construir em público** vira case de portfolio dev IA (mentoria Claude Code)

### Quem usa
- **Player Dota 2 brasileiro** que quer subir MMR
- **Conhece Pedro/Fórmula Dota** ou descobre via canal
- **Disposto a pagar R$ 10/partida** (preço de mercado de hobby Dota)
- **Tem Discord** (Discord é onde a comunidade Dota vive)

---

## 2. Goals

### Goals (mensuráveis)
- **G1**: Lançar MVP funcional em produção em 7 dias após início
- **G2**: Permitir compra (PIX), agendamento e jogo em fluxo end-to-end sem intervenção manual do Pedro
- **G3**: Integrar Discord OAuth como único método de auth (zero fricção)
- **G4**: Mostrar perfil do usuário com stats reais puxadas do OpenDota API
- **G5**: Bot Discord funcional pra `/agendar`, `/perfil`, `/saldo`
- **G6**: Custo operacional < R$ 50/mês (free tiers Vercel + Supabase + Railway)

### Non-Goals (V1)
- ❌ Sistema de replay com comentário gravado (V2)
- ❌ Análise automática de partida com IA (V2)
- ❌ Renovação automática de assinatura (V2 — V1 só avulso)
- ❌ Múltiplos mentores (sempre só Pedro nesse MVP)
- ❌ App mobile nativo (web responsive serve)
- ❌ Integração com outros jogos (foco 100% Dota 2)
- ❌ Marketplace de coaches (não é objetivo)

---

## 3. User Stories

### Como cliente novo
- **US1**: Acesso a landing page e entendo em < 30s o que é o serviço
- **US2**: Faço login com Discord (1 click)
- **US3**: Vinculo meu Steam ID ao perfil
- **US4**: Vejo catálogo de pacotes claros (avulso e mensal)
- **US5**: Compro pacote via PIX em < 2 minutos
- **US6**: Recebo confirmação por email + Discord

### Como cliente ativo
- **US7**: Agendo partida em horário disponível do Pedro (calendário)
- **US8**: Recebo lembrete via Discord 1h antes da partida
- **US9**: Vejo saldo de partidas restantes no perfil
- **US10**: Vejo histórico de partidas com Pedro + stats (vitória/derrota, MMR change, KDA)
- **US11**: Cancelo partida com 24h+ antecedência sem perder saldo

### Como Pedro (admin)
- **US12**: Vejo todas as partidas agendadas no painel admin
- **US13**: Marco partidas como "realizadas" após jogar
- **US14**: Adiciono notas/feedback opcionais por cliente
- **US15**: Vejo dashboard financeiro (receita do mês, partidas vendidas, top clientes)
- **US16**: Crio/edito pacotes a qualquer momento

---

## 4. Functional Requirements

### F1 — Auth & Profile
- F1.1: Discord OAuth via Supabase Auth (único método)
- F1.2: Perfil do user salva: discord_id, email, steam_id (input manual), mmr_inicial, role_preferida
- F1.3: User pode editar perfil próprio
- F1.4: Pedro tem flag `is_admin = true` no profile

### F2 — Pacotes
- F2.1: Pacotes têm: nome, descrição, tipo (avulso | mensal), qtd_partidas, qtd_sessoes, preco_brl, ativo
- F2.2: Catálogo público lista pacotes ativos
- F2.3: Admin pode criar/editar/desativar pacotes
- F2.4: 4 pacotes seed iniciais (ver seção "Pricing inicial")

### F3 — Compra & Pagamento
- F3.1: Click em pacote abre checkout
- F3.2: Checkout cria registro `purchases` com status `pendente`
- F3.3: Integração **AbacatePay Transparent PIX V2** (`POST /v2/transparents/create`) — retorna `brCode` (texto) + `brCodeBase64` (PNG inline)
- F3.4: Webhook eventos `transparent.completed` / `transparent.disputed` / `transparent.refunded` valida HMAC SHA-256 base64 → libera saldo (idempotente via `external_payment_id` UNIQUE + UPDATE conditional WHERE status='pendente')
- F3.5: User recebe email confirmação (Resend) + notificação Discord (via bot DM — Phase 4)

### F4 — Agendamento
- F4.1: Pedro define janelas de disponibilidade (admin: ex: "seg-sex 14h-22h, sab 16h-23h")
- F4.2: User vê calendário com slots disponíveis (1h cada slot pra partida)
- F4.3: User clica e agenda → debita saldo de partidas
- F4.4: Partida agendada vira registro `matches` status `agendada`
- F4.5: User pode cancelar com 24h+ antecedência → saldo retorna
- F4.6: Bot Discord notifica Pedro 30min antes da partida começar

### F5 — Pós-partida
- F5.1: Pedro marca partida como `realizada` no admin
- F5.2: Sistema puxa dados do OpenDota API via match_id (input manual no admin)
- F5.3: Stats salvos: resultado (W/L), kda, mmr_change, herói jogado, duração
- F5.4: User_stats agregados são atualizados (winrate, total_mmr_ganho)
- F5.5: Notificação Discord pro user com resumo da partida

### F6 — Discord Bot
- F6.1: Bot online 24/7 (Cloudflare Workers ou Railway)
- F6.2: Slash command `/perfil` — mostra perfil do usuário (embed)
- F6.3: Slash command `/saldo` — mostra partidas + sessões restantes
- F6.4: Slash command `/agendar` — link direto pro calendário no site
- F6.5: Webhook notifica canal #imortais quando alguém compra novo pacote (opt-in)

### F7 — Painel Admin (Pedro)
- F7.1: Dashboard com: receita do mês, partidas vendidas, partidas pendentes, novos clientes
- F7.2: Lista de agendamentos próximos
- F7.3: CRUD pacotes
- F7.4: Lista de clientes com filtro por status
- F7.5: Marcar partida como realizada + adicionar match_id Dota
- F7.6: Definir janelas de disponibilidade (calendar)

### F8 — Métricas & Stats
- F8.1: Página pública "Meu progresso" pro user logado
- F8.2: Card de stats: total partidas, winrate com Pedro, MMR ganho, herói mais jogado
- F8.3: Histórico de partidas em ordem cronológica
- F8.4: Gráfico simples de evolução MMR (Recharts)

---

## 5. Technical Architecture

### Stack
| Layer | Tech | Versão | Razão |
|---|---|---|---|
| Frontend | Next.js | 15.5+ | App Router, Server Actions, Pedro domina |
| UI | React | 19 | Compatibilidade Next 15 |
| CSS | Tailwind CSS | v4 | Setup zero, Pedro domina |
| Components | shadcn/ui | latest | Copy-paste, customizável |
| Backend/DB | Supabase | postgres-js 2.x | All-in-one, free tier, RLS |
| Auth | Supabase Auth + Discord OAuth | — | Discord = onde comunidade Dota está |
| Payments | AbacatePay (PIX) | latest SDK | Pedro já usou, confiável Brasil |
| Stats | OpenDota API | v1 | Free, completa, real-time |
| Bot Discord | Discord.js | v14 | Padrão de mercado |
| Bot host | Railway ou Cloudflare Workers | — | Free tier suficiente |
| App host | Vercel | — | Free tier, deploy automático |
| Email | Resend | — | Free tier 100/dia |

### Folder Structure
```
formuladota-v2/
├── PRD.md                          # este arquivo
├── CLAUDE.md                       # instruções pro Claude Code
├── README.md                       # quickstart dev
├── ARCHITECTURE.md                 # decisões técnicas detalhadas
├── TASKS.md                        # backlog
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                    # landing
│   │   │   ├── pacotes/page.tsx            # catálogo
│   │   │   └── login/page.tsx              # login Discord
│   │   ├── (user)/
│   │   │   ├── perfil/page.tsx             # perfil + steam_id
│   │   │   ├── partidas/page.tsx           # minhas partidas
│   │   │   ├── agendar/page.tsx            # calendário
│   │   │   └── progresso/page.tsx          # stats
│   │   ├── (admin)/
│   │   │   ├── admin/page.tsx              # dashboard
│   │   │   ├── admin/pacotes/page.tsx
│   │   │   ├── admin/clientes/page.tsx
│   │   │   ├── admin/agenda/page.tsx
│   │   │   └── admin/configuracoes/page.tsx
│   │   ├── api/
│   │   │   ├── webhooks/abacatepay/route.ts
│   │   │   ├── webhooks/discord/route.ts
│   │   │   └── opendota/[match_id]/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                             # shadcn components
│   │   ├── landing/
│   │   ├── catalog/
│   │   ├── checkout/
│   │   ├── calendar/
│   │   ├── profile/
│   │   └── admin/
│   ├── lib/
│   │   ├── supabase/server.ts              # createServerClient
│   │   ├── supabase/client.ts              # createBrowserClient
│   │   ├── abacatepay.ts                   # PIX integration
│   │   ├── opendota.ts                     # Dota stats
│   │   └── discord.ts                      # bot helpers
│   ├── types/
│   │   └── database.ts                     # gerado via supabase types
│   └── styles/
│       └── globals.css
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_seed_packages.sql
│   └── functions/
│       └── webhook-abacatepay.ts           # edge function (opcional)
├── bot/                                    # Discord bot separado
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                        # entry point
│   │   ├── commands/
│   │   │   ├── perfil.ts
│   │   │   ├── saldo.ts
│   │   │   └── agendar.ts
│   │   └── lib/
│   │       └── supabase.ts                 # consulta DB
│   └── Dockerfile
├── .env.example
└── .gitignore
```

### Database Schema (Supabase)

```sql
-- profiles (extende auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  username text,
  steam_id text,
  email text,
  mmr_inicial integer,
  mmr_atual integer,
  role_preferida text check (role_preferida in ('carry', 'mid', 'offlane', 'sup4', 'sup5')),
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- packages (pacotes/produtos)
create table packages (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  tipo text check (tipo in ('avulso', 'mensal')) not null,
  qtd_partidas integer not null,
  qtd_sessoes integer default 0,
  preco_brl decimal(10,2) not null,
  ativo boolean default true,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- purchases (compras)
create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  package_id uuid references packages(id) not null,
  status text check (status in ('pendente', 'pago', 'expirado', 'cancelado')) default 'pendente',
  payment_provider text default 'abacatepay',
  external_payment_id text,
  preco_pago decimal(10,2) not null,
  partidas_compradas integer not null,
  partidas_usadas integer default 0,
  sessoes_compradas integer default 0,
  sessoes_usadas integer default 0,
  data_compra timestamptz default now(),
  data_expiracao timestamptz,
  created_at timestamptz default now()
);

-- availability_windows (janelas de disponibilidade Pedro)
create table availability_windows (
  id uuid primary key default gen_random_uuid(),
  dia_semana integer check (dia_semana between 0 and 6) not null, -- 0=domingo
  hora_inicio time not null,
  hora_fim time not null,
  ativo boolean default true
);

-- matches (partidas)
create table matches (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references purchases(id) not null,
  user_id uuid references profiles(id) not null,
  data_agendada timestamptz not null,
  status text check (status in ('agendada', 'realizada', 'cancelada', 'no_show')) default 'agendada',
  dota_match_id text,
  resultado text check (resultado in ('vitoria', 'derrota')),
  mmr_change integer,
  kda text, -- formato "K/D/A"
  heroi_jogado text,
  duracao_min integer,
  notas_pedro text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- sessions (sessões teóricas)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references purchases(id) not null,
  user_id uuid references profiles(id) not null,
  data_agendada timestamptz not null,
  duracao_min integer default 60,
  tema_conceitos text[],
  notas text,
  status text check (status in ('agendada', 'realizada', 'cancelada')) default 'agendada',
  created_at timestamptz default now()
);

-- user_stats (cache agregado, atualizado via trigger)
create table user_stats (
  user_id uuid primary key references profiles(id),
  total_partidas_com_pedro integer default 0,
  vitorias integer default 0,
  derrotas integer default 0,
  mmr_ganho_total integer default 0,
  heroi_mais_jogado text,
  role_mais_jogada text,
  ultima_atualizacao timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
alter table packages enable row level security;
alter table purchases enable row level security;
alter table matches enable row level security;
alter table sessions enable row level security;
alter table user_stats enable row level security;

-- Policies: user vê só seus dados; admin vê tudo
create policy "users see own profile" on profiles for select using (auth.uid() = id or (select is_admin from profiles where id = auth.uid()));
create policy "users see own purchases" on purchases for select using (auth.uid() = user_id or (select is_admin from profiles where id = auth.uid()));
create policy "users see own matches" on matches for select using (auth.uid() = user_id or (select is_admin from profiles where id = auth.uid()));
create policy "users see own stats" on user_stats for select using (auth.uid() = user_id or (select is_admin from profiles where id = auth.uid()));
create policy "everyone sees active packages" on packages for select using (ativo = true or (select is_admin from profiles where id = auth.uid()));
```

### Pricing inicial (seed packages)

> **Princípio Pedro 30/04/2026**: Dota é hobby/entretenimento, não ROI. Pricing realista de mercado começa baixo e sobe com demanda.

| Pacote | Tipo | Partidas | Sessões | Preço | Justificativa |
|---|---|---|---|---|---|
| **Avulsa** | avulso | 1 | 0 | R$ 10 | Preço de mercado validado |
| **Pacote 5** | avulso | 5 | 0 | R$ 50 | Sem desconto inicial — sobe quando demanda apertar |
| **Pacote 10** | avulso | 10 | 0 | R$ 100 | Idem |
| **Mentoria mensal** | mensal | 8 | 2 | R$ 100 | Manter próximo ao R$ 50 da Liga antiga, mas com 1:1 |

> Conforme agenda apertar (10+ clientes ativos), reavaliar pricing pra cima naturalmente. Documentar mudanças em `CHANGELOG.md`.

---

## 6. Phases (executar em sequência via GSD)

### Phase 1 — Foundation (Day 1-2)
**Deliverables**:
- [ ] Repositório `formuladota-v2` no GitHub criado
- [ ] Next.js 15 + Tailwind v4 + shadcn bootstrap
- [ ] Projeto Supabase criado
- [ ] Schema migrado (`001_initial_schema.sql` + `002_rls_policies.sql`)
- [ ] Discord OAuth configurado no Supabase
- [ ] Login funcional (user clica "Login com Discord" → cria profile → redireciona)
- [ ] Página landing minimal com CTA "Login com Discord"

**Acceptance**:
- ✅ User consegue logar e tem profile criado no DB
- ✅ Schema completo + RLS ativo

### Phase 1.5 — Onboarding Doutrinário + Código de Conduta + Moderação progressiva (Day 2)

**Deliverables — Schema**:
- [ ] Migration 004:
  - `profiles.doctrine_accepted_at timestamptz`
  - `profiles.doctrine_version integer default 1` (incrementa quando texto do código mudar)
  - `profiles.behavior_status text check in ('ok','warned','suspended','banned') default 'ok'`
  - `profiles.suspended_until timestamptz` (NULL se não suspenso)
  - `profiles.banned_at timestamptz`, `profiles.banned_reason text`
  - Tabela `user_warnings`:
    ```
    id uuid pk
    user_id uuid references profiles(id)
    principle_violated integer (1-14) | null  -- NULL se anti-padrão (1-10) — usar `antipattern_violated`
    antipattern_violated integer (1-10) | null
    severity text check ('advertencia','suspensao','banimento')
    source text  -- 'pedro_admin' | 'discord_bot' | 'report_user' | 'auto_detect'
    notes text
    issued_by uuid references profiles(id)  -- normalmente Pedro
    issued_at timestamptz default now()
    suspension_days integer | null  -- preenchido se severity='suspensao'
    ```
  - Trigger `on_warning_inserted`: aplica regra progressiva (§11) automaticamente em `profiles`.
- [ ] Migration RLS: user lê só warnings dele; admin vê todos.

**Deliverables — UI/Fluxo**:
- [ ] Página pública `/codigo-de-conduta` — cita texto literal do `A FÓRMULA DO DOTA DE CORRIDA.txt` + 10 anti-padrões + descrição clara do sistema progressivo.
- [ ] Tela `/onboarding/doutrina` — onboarding obrigatório:
  - Slide 1: "A ideia aqui não é te entreter — é te mudar por dentro" + ❗ A CULPA NUNCA É DO OUTRO ❗
  - Slide 2-9: 14 princípios (1 ou 2 por slide, com micro-explicação)
  - Slide 10-12: 10 anti-padrões + sistema progressivo (advertência → suspensão → banimento)
  - Slide final: checkbox "Eu li, compreendi e aceito. Sei que violações geram advertência, suspensão ou banimento." + botão **Aceitar e entrar**
  - Sem aceite final, sem botão "pular" — único caminho é fechar a aba.
- [ ] Server Action `acceptDoctrine(version)` — grava `doctrine_accepted_at = now()` + `doctrine_version`.
- [ ] **Proxy/middleware enforcement**: user logado **sem aceite** que tente acessar QUALQUER rota privada (`/pacotes`, `/perfil`, `/agendar`, `/admin`, `/api/*` exceto `/auth/*` e `/api/webhooks/*`) é redirecionado pra `/onboarding/doutrina`.
- [ ] User com `behavior_status = 'suspended'` — tela `/suspended` mostra `suspended_until` + motivo + opção contestar via Discord.
- [ ] User com `behavior_status = 'banned'` — tela `/banned` final, sem retorno automático.
- [ ] Footer global linka `/codigo-de-conduta`.
- [ ] Email pós-aceite (Resend): boas-vindas com texto curto + link `/codigo-de-conduta`.

**Acceptance**:
- ✅ User sem aceite NÃO consegue acessar nada privado, **nem mesmo navegar pacotes**.
- ✅ Aceite gravado com versão — se Pedro atualizar o código, sistema força reaceitar.
- ✅ Pedro consegue advertir via admin: registra warning → trigger atualiza `behavior_status` automaticamente conforme §11.
- ✅ User suspenso vê tela explicativa, não consegue jogar/comprar até `suspended_until`.
- ✅ User banido vê tela final, conta congelada (saldo restante refundado manualmente).

### Phase 2 — Catalog & Checkout (Day 2-3)
**Deliverables**:
- [ ] Seed packages no DB (4 pacotes iniciais)
- [ ] Página `/pacotes` lista pacotes ativos
- [ ] Click em pacote → modal/page de checkout
- [ ] Integração AbacatePay (gerar PIX)
- [ ] Webhook AbacatePay implementado (`/api/webhooks/abacatepay`)
- [ ] Status pagamento atualiza purchase + libera saldo

**Acceptance**:
- ✅ Comprar pacote via PIX end-to-end funciona
- ✅ Saldo aparece em "minhas partidas" após pagamento

### Phase 3 — Profile & Scheduling (Day 3-5)
**Deliverables**:
- [ ] Página `/perfil` (editar steam_id, role_preferida)
- [ ] Página `/partidas` (saldo + histórico)
- [ ] Admin CRUD `availability_windows`
- [ ] Página `/agendar` (calendário com slots de 1h)
- [ ] Click em slot → debita saldo + cria `match` status `agendada`
- [ ] Cancelamento +24h restaura saldo

**Acceptance**:
- ✅ User agenda partida e vê na lista
- ✅ Slot consumido não aparece mais no calendário
- ✅ Cancelar +24h restitui saldo

### Phase 4 — Discord Bot (Day 5-6)
**Deliverables**:
- [ ] Bot Discord.js criado em `bot/`
- [ ] Comandos `/perfil`, `/saldo`, `/agendar`
- [ ] Bot conectado ao Supabase (read profile, purchases, matches)
- [ ] Deploy bot (Railway free tier)
- [ ] Webhook notifica Pedro 30min antes de partida via DM

**Acceptance**:
- ✅ Comandos funcionam em servidor Discord teste
- ✅ Bot online 24/7
- ✅ Pedro recebe notificação 30min antes

### Phase 5 — Admin Panel (Day 6-7)
**Deliverables**:
- [ ] Dashboard admin com KPIs (receita mês, partidas vendidas, agendadas)
- [ ] Lista de agendamentos com botão "marcar como realizada"
- [ ] Form pra inserir match_id Dota + puxar do OpenDota
- [ ] CRUD pacotes
- [ ] Lista clientes com filtros

**Acceptance**:
- ✅ Pedro consegue gerenciar tudo via admin sem editar DB direto
- ✅ Marcar partida como realizada atualiza user_stats

### Phase 6 — Polish & Deploy (Day 7)
**Deliverables**:
- [ ] Páginas responsivas mobile
- [ ] Loading states em todas as ações
- [ ] Empty states (nenhum pacote, nenhuma partida)
- [ ] Mensagens de erro amigáveis
- [ ] Deploy Vercel produção
- [ ] Domínio formuladota.com configurado (se disponível) ou subdomínio Vercel
- [ ] Testes manuais: fluxo completo cliente novo
- [ ] Bot Discord no servidor oficial Fórmula Dota

**Acceptance**:
- ✅ App em produção
- ✅ Pedro consegue executar venda end-to-end real

---

## 7. Out of Scope (V2+)

- Renovação automática assinatura mensal
- Sistema de replay com comentário gravado
- Análise IA da partida pós-jogo
- App mobile nativo
- Múltiplos coaches
- Marketplace
- Sistema de afiliados
- Programa de pontos/conquistas elaborado
- Integração com Twitch (live com viewers)
- Streaming overlay de stats em live

### 7.1 Vision V1.5 → V3 (backlog estruturado, ver `.planning/research/integrations.md`)

Pesquisa completa em **`.planning/research/integrations.md`** (gerada em 2026-05-01 após análise da plataforma de referência [meta-liga.ggarena.pro](https://meta-liga.ggarena.pro)).

**V1.5** (semanas 4-8 pós-launch):
- Steam OpenID complementar (tabela paralela `steam_links` — Discord segue auth primário)
- Discord Connections scope → score anti-smurf
- Stats automatizados via OpenDota (substitui input manual de `match_id`)

**V2** (mês 3-4):
- Sistema de ligas internas (Mentoria mensal vira liga própria)
- Ranking interno com MMR custom (Elo K=25, base 1000) + 8 tiers Herald→Immortal × 5 estrelas
- Badges visuais com identidade Fórmula Dota (cyan/purple), inspirados Dota 2 oficial mas reskinned
- Histórico de temporadas
- Lista de Picks/Builds via Google Sheets CSV (admin sem painel — hack do meta-liga)

**V3** (mês 6+, só se demanda validar):
- Bot lobby Dota 2 (node-dota2 + Steam GC, conta dedicada em Docker headless)
- Multi-conta verification (Twitch/YouTube/X via Discord connections)
- Captains Mode interno com draft phase
- Sistema de amigos + chat real-time (WebSocket)
- Fórum próprio

> **Princípio**: nada disso entra antes do MVP V1 validar tração. Discord-first (não Steam-first) — Discord traz comunidade pronta, Steam só identidade técnica.

---

## 8. Risks & Mitigations

| Risco | Probabilidade | Impacto | Mitigation |
|---|:---:|:---:|---|
| Discord OAuth não cobrir todos casos | Baixa | Médio | Fallback email/senha no V1.1 |
| AbacatePay sandbox lento pra dev | Média | Baixo | Mockar webhook em dev |
| OpenDota API rate limit | Baixa | Baixo | Cache local + retry |
| Pedro burnout repetir | Média | Alto | **Limite hardcoded de 3 partidas/dia agendáveis** no MVP |
| Demanda muito baixa (<3 clientes em 30d) | Média | Médio | Pivot pricing ou formato após 30 dias |
| Bot Discord cair | Baixa | Baixo | Health check + restart automático |

---

## 11. Sistema Progressivo de Moderação (regra operacional da Cultura — §0)

> Moderação é **fiel à doutrina**: educa antes, pune se reincide, remove se persiste. Linguagem do feedback **sempre cita o princípio violado** (não é "punição arbitrária do mod", é "violação da regra que você aceitou").

### Mecânica padrão (3 strikes)

| Violação Nº | Severidade | Ação automática | Mensagem ao user |
|:---:|---|---|---|
| 1ª | `advertencia` | `behavior_status = 'warned'` | Email/Discord DM citando princípio + texto literal do doc + lembrete: próxima violação é suspensão |
| 2ª | `suspensao` | `behavior_status = 'suspended'`, `suspended_until = now() + 7 dias` (default — Pedro pode customizar 1-30) | Tela `/suspended` + email com prazo + opção contestar |
| 3ª | `banimento` | `behavior_status = 'banned'`, `banned_at = now()`, `banned_reason` preenchido | Tela `/banned` final + email + saldo refundado manualmente Pedro |

**Reset**: warnings completam **180 dias sem violações** zera o contador (volta a `ok`). Trigger automático.

### Severidade direta (override do progressivo)

Algumas violações vão **direto para suspensão ou banimento** sem passar por advertência:

| Anti-padrão | Severidade direta |
|---|---|
| #6 Feeding intencional / griefing dentro de partida com Pedro | suspensão 14d |
| #10 Preconceito, xenofobia, racismo | banimento imediato |
| Fraude de pagamento (chargeback malicioso) | banimento imediato |
| Compartilhamento de conta com terceiro | suspensão 30d → banimento se reincidir |

Pedro decide na hora ao registrar warning — formulário admin tem dropdown de severidade override.

### Quem pode advertir

| Source | Quem | Validação |
|---|---|---|
| `pedro_admin` | Apenas Pedro (`is_admin = true`) | Imediato — Pedro tem autoridade total |
| `discord_bot` | Bot detecta automaticamente (futuro V2) | Pendente Pedro confirmar antes de aplicar |
| `report_user` | Outro usuário reporta | Pendente Pedro revisar |
| `auto_detect` | Heurística sistema (ex: 3 reports independentes em 24h) | Pendente Pedro revisar |

V1: só `pedro_admin` automático. Resto entra como `pendente` em fila admin.

### Direito ao contraditório

User suspenso/banido pode **contestar via Discord** (canal `#contestacao` ou DM Pedro). Pedro pode reverter manualmente com 1 clique em admin (atualiza `behavior_status` + adiciona nota). **Não há recurso público formal** — é decisão do dono da plataforma, e isso fica claro no código de conduta.

### Auditoria

Toda mudança em `behavior_status` é logada em `behavior_status_log (user_id, from_status, to_status, reason, changed_by, changed_at)`. Pedro pode justificar qualquer reversão e tem trilha completa.

### Saldo + refund em banimento

Se user banido tem saldo de partidas/sessões não usadas:
- Banimento por **fraude/preconceito**: saldo NÃO é refundado.
- Banimento por outras violações: saldo é refundado via PIX manual (Pedro decide caso a caso).
- Decisão fica em `banned_reason` + nota interna pra evidência.

---

## 9. Success Metrics (90 dias após lançamento)

### Cenário base (esperado)
- 3-5 clientes ativos pagando mensalmente
- R$ 300-500/mês receita recorrente
- 30-50 partidas avulsas vendidas total
- 2-3 lives semana no canal

### Cenário otimista
- 10+ clientes ativos
- R$ 1.000-2.000/mês
- 100+ partidas vendidas
- Audience Discord > 100 pessoas

### Cenário pessimista (gatilho de pivot)
- < 2 clientes ativos em 60 dias
- < R$ 100/mês receita
- **Disparar revisão de pricing OU formato OU posicionamento**

---

## 10. Open Questions

- [ ] Q1: Domínio formuladota.com ainda registrado? **Parcial (2026-04-30)**: Pedro acredita ter comprado na **Hostinger** — verificando.
- [x] Q2: Servidor Discord? **Resp**: servidor oficial Fórmula Dota já existe. Bot vai ser deployado nele (precisar do `DISCORD_GUILD_ID`).
- [x] Q3: Disponibilidade inicial? **Resp**: todos os dias 19h–22h (3h/dia × 7 dias = 21h/semana). Exceções pontuais por agenda dev/IA paga.
- [x] Q4: Sessões teóricas via Discord ou Google Meet? **Resp**: sempre via Discord.
- [ ] Q5: Email padrão pro Resend (transacionais)? Sugestão: `noreply@formuladota.com` se domínio confirmar; senão `pedroecarolshopcreator@gmail.com` como fallback dev.

---

## 🔗 Referências

- [Sistema novo Dota — formuladota v2 (Obsidian)](../segundo-cerebro/07%20-%20Negocio/Sistema%20novo%20Dota%20-%20formuladota%20v2.md)
- [Voltar ou não voltar pro Dota (Obsidian)](../segundo-cerebro/10%20-%20Pessoal/Conflitos/Voltar%20ou%20nao%20voltar%20pro%20Dota.md)
- [Metodologia de ensino Pedro (Obsidian)](../segundo-cerebro/07%20-%20Negocio/Metodologia%20de%20ensino%20Pedro.md)
- [OpenDota API docs](https://docs.opendota.com/)
- [AbacatePay docs](https://docs.abacatepay.com)
- [Discord.js guide](https://discordjs.guide)
- [Supabase Auth + Discord](https://supabase.com/docs/guides/auth/social-login/auth-discord)
