# formuladota v2 — Requirements

> Extraídos do PRD.md §4 (Functional Requirements). IDs no formato `F{n}.{m}` mapeiam para phases via ROADMAP.md.

## F1 — Auth & Profile (Phase 1)

- **F1.1** Discord OAuth via Supabase Auth (único método)
- **F1.2** Profile salva: discord_id, email, steam_id, mmr_inicial, role_preferida
- **F1.3** User edita profile próprio
- **F1.4** Pedro tem flag `is_admin = true`
- **F1.5** Aceite doutrinário (Phase 1.5) — `doctrine_accepted_at` + `doctrine_version` versionado, obrigatório antes de checkout/agendamento

## F2 — Pacotes (Phase 2)

- **F2.1** Pacotes têm: nome, descricao, tipo (avulso|mensal), qtd_partidas, qtd_sessoes, preco_brl, ativo
- **F2.2** Catálogo público lista pacotes ativos
- **F2.3** Admin cria/edita/desativa pacotes (Phase 5)
- **F2.4** 4 pacotes seed iniciais (já aplicados em migration 003)

## F3 — Compra & Pagamento (Phase 2)

- **F3.1** Click em pacote abre checkout
- **F3.2** Checkout cria registro `purchases` com status `pendente`
- **F3.3** Integração AbacatePay V2 gera QR Code PIX
- **F3.4** Webhook AbacatePay confirma pagamento → status `pago` → libera saldo (idempotência via `external_payment_id`)
- **F3.5** User recebe email confirmação + notificação Discord

## F4 — Agendamento (Phase 3)

- **F4.1** Pedro define janelas de disponibilidade
- **F4.2** User vê calendário com slots disponíveis (1h cada)
- **F4.3** User clica e agenda → debita saldo
- **F4.4** Partida agendada vira `matches` status `agendada`
- **F4.5** Cancelamento +24h restitui saldo
- **F4.6** Bot Discord notifica Pedro 30min antes

## F5 — Pós-partida (Phase 5)

- **F5.1** Pedro marca partida como `realizada`
- **F5.2** Sistema puxa dados OpenDota via match_id
- **F5.3** Stats salvos: resultado (W/L), kda, mmr_change, herói, duração
- **F5.4** user_stats atualizados (winrate, mmr_ganho)
- **F5.5** Notificação Discord pro user com resumo

## F6 — Discord Bot (Phase 4)

- **F6.1** Bot online 24/7
- **F6.2** Slash command `/perfil`
- **F6.3** Slash command `/saldo`
- **F6.4** Slash command `/agendar`
- **F6.5** Webhook notifica canal #imortais quando alguém compra (opt-in)

## F7 — Painel Admin (Phase 5)

- **F7.1** Dashboard com receita do mês, partidas vendidas, pendentes, novos clientes
- **F7.2** Lista de agendamentos próximos
- **F7.3** CRUD pacotes
- **F7.4** Lista de clientes com filtro por status
- **F7.5** Marcar partida realizada + match_id Dota
- **F7.6** Definir janelas disponibilidade

## F8 — Métricas & Stats (Phase 5/6)

- **F8.1** Página pública "Meu progresso" pro user logado
- **F8.2** Card de stats: total partidas, winrate, MMR ganho, herói mais jogado
- **F8.3** Histórico de partidas em ordem cronológica
- **F8.4** Gráfico simples de evolução MMR (Recharts)

---

## Cross-cutting Requirements

- **C1** TypeScript strict, zero `any`
- **C2** Functions max 50 linhas, files max 300
- **C3** Zod em todos os inputs (Server Actions, API routes)
- **C4** RLS policies em todas as tables Supabase
- **C5** WCAG 2.1 AA
- **C6** Lucide icons (não emojis em UI), shadcn/ui base
- **C7** Tema cyberpunk: cyan #00F0FF, purple #A855F7, dark #050505
- **C8** Webhooks externos validam HMAC
- **C9** Idempotência em handlers de eventos externos
- **C10** Limite hardcoded 3 partidas/dia agendáveis (proteção burnout Pedro)
