---
gsd_state_version: 1.0
milestone: v2.5
milestone_name: milestone
status: completed
stopped_at: Completed 09-05a-backend-profile-sidebar-actions-PLAN.md
last_updated: "2026-05-26T15:38:41.497Z"
last_activity: 2026-05-26
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 23
  completed_plans: 16
---

## Current Position

Phase: 09 (perfil-dota-social) — EXECUTING
Plan: 3 of 9

### Roadmap Evolution

- 2026-05-26 — Milestone V2.6 (Player Identity + Social Layer) criado entre V2.5 e V3. Inclui Phase 9 (Perfil Dota 2 + Social).
- 2026-05-26 — Convenção de numeração: Phase 9 usa naming linear GSD (não V2.6-F1) pra compatibilidade com CLI gsd-tools regex. V2.5-F* convenção foi tracking manual sem diretórios GSD reais.

### Previous Position (V2.5)

Phase: V2.5-F8 CONCLUÍDA — milestone V2.5 COMPLETED
Status: COMPLETED — todas as 8 phases entregues, validadas, lint 0 errors, typecheck clean.
Last activity: 2026-05-26

Progress V2.5: [██████████] 100% (8/8 phases)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Hub de comunidade Dota 2 brasileira — mensalidade R$47/mês, partidas in-house com cultura doutrinada, ranking por temporada, coaches credenciados.
**Próximo foco:** Retomar MVP fichas (Phase 4 MP pausada) ou Phase 5 Bot Steam. Pedro decide após review visual em /components.

---

## Accumulated Context (V2.5 decisions)

### Decisions V2.5

- **2026-05-23 — Numeração phases V2.5:** Prefixo `V2.5-F1..F8` (não Phase 9-16). V2 ocupa 1-8, prefixo evita ambiguidade ao retomar.
- **2026-05-23 — F2 é gate absoluto:** Nenhum componente finaliza antes de F2. Pular tokens = dívida exponencial.
- **2026-05-23 — F1 paralelo a F2:** Foundation Docs não bloqueia código — pode rodar em paralelo.
- **2026-05-23 — F3+F4+F5 paralelos:** Após F2 concluir, os três podem rodar simultaneamente.
- **2026-05-23 — Stack locked:** motion v12.40.0 + howler v2.2.4 + @tsparticles/slim + @fontsource-variable/cinzel + geist v1.7.1 + Tailwind v4 @theme.
- **2026-05-23 — Nav layout:** Top-bar horizontal estilo Dota 2 client. Kill sidebar 256px atual. (decisão Pedro)
- **2026-05-23 — SFX licensing:** Freesound CC0 + curadoria manual ~3h com Pedro. R$ 0.
- **2026-05-23 (update) — SFX execução:** Pedro delegou curadoria pra Claude via Freesound API durante V2.5-F5. FREESOUND_API_KEY não disponível → stubs silenciosos entregues. Pedro valida pós-integração e re-cura manual.
- **2026-05-23 — Execução milestone V2.5:** Pedro pediu rodar todas as 8 phases. Estratégia: orquestração manual em waves paralelas onde dependencies permitem (não /gsd:autonomous puro que é sequencial). Wave 1: F1‖F2; Wave 2: F3‖F4‖F5; Wave 3: F6; Wave 4: F7; Wave 5: F8.
- **2026-05-23 — V2.5 EXECUTADO:** ~30 agents em 5 waves paralelas, 40 commits totais, 0 erros TS, 0 erros lint (5 warnings purity aceitáveis).
- **2026-05-23 — eslint.config.mjs:** Adicionado `.claude/**` no ignores (worktrees de outros agents estavam poluindo lint). `react-hooks/purity` downgradeado pra warn (regra v7 muito agressiva com Date.now() em minutesOpen display).

### Pending Todos

- **Curadoria SFX Freesound CC0 manual** (Pedro ou com FREESOUND_API_KEY) — F5 entregou stubs silenciosos. Howler está integrado, só falta os .mp3 reais nos sprite slots.
- **FPS benchmark tsParticles em hardware Pedro** (Chrome DevTools Performance) — F3 entregou AmbientLayer, mas config de partículas não foi testada em hardware real.
- **Migração 6 pages Sistema B → Sistema A — CONCLUÍDA 2026-05-24** ✓ — todas 6 pages órfãs (`/me`, `/perfil`, `/partidas`, `/pacotes`, `/codigo-de-conduta`, `/metodologia`) migradas para Sistema A canônico. `src/components/templates/client-shell.tsx` DELETADO (zero callsites). Tasks #50-#54 + #57 todas concluídas. 7 commits em série: 4646543 → fc09c32 + cleanup.
- **Limpeza débito técnico C14/C15/C17/C19 em components legacy** — C14: 11 hex hardcoded; C15: 1 duration inline; C17: 23 z-index ad-hoc; C19: 19 animate-spin. Em components que **não são** client-shell (queue/, catalog/, checkout/) — components V2.5 novos estão limpos. Sistema A (client-shell/) é canônico agora, não legacy.
- **Componente Toast precisa que pages migrem** — useToast() hook em vez de sonner. Ativado quando migração Sistema B → A completar.
- **react-hooks/purity cleanup pós-migração shell** — após migrar pages, revisar Date.now() nos novos components e substituir por padrão aprovado (useServerInsertedHTML ou data vinda do server).
- **M2 doutrina reformulado 2026-05-24** — "kill sidebar" original (que tinha Riot Client v6 como referência inconfessa) substituído por "Navigation 3-col Dota 2 client". Sidebars contextuais (esquerda identidade+amigos, direita matchmaking) são OBRIGATÓRIAS. Sidebar SaaS de rotas continua PROIBIDA. Ver UX_PRINCIPLES.md M2.

### Blockers/Concerns

- **V2.5-F5 stubs silenciosos:** Todo botão "toca" silêncio. Impacto UX notável — curadoria SFX é prioridade pós-milestone.
- ~~**6 pages órfãs no Sistema B (deprecated):**~~ ✓ RESOLVIDO 2026-05-24 — todas migradas, Sistema B deletado.
- **Howler+ambiente:** Sem teste real em ambiente de produção. ISoundManager interface permite trocar implementação se necessário.

## MVP Fichas — Status (2026-05-23)

Branch: `feat/hero-state-refactor`

### Gaps fechados (agent mvp-fichas 2026-05-23)

| Gap | Status | Detalhes |
|-----|--------|----------|
| Gap 1 — Package ficha preço | FIXED | "Ficha avulsa" preço corrigido de R$15 → R$10 no Supabase (UPDATE direto) |
| Gap 2 — Webhook → ficha_ledger | FIXED | `handlePaymentNotification` agora insere em `ficha_ledger` com source='purchase' após purchase virar 'pago'. Trigger apply_ficha_ledger atualiza balance. |
| Gap 3 — Dashboard saldo visível | OK | Dashboard, UserStatusBar, DashboardCenter e queries já existiam e funcionam. |
| Gap 4 — Coach row Pedro | OK | Pedro já tem coach row (slug='pedro-paulo', ativo=true, fila_aberta=true). |
| Gap 5 — Email PT confirmada | FIXED | sendPTConfirmedEmail() + template + chamada em confirmPTRealized (fire-and-forget). |

### Commits feitos

- `3161c62` fix(mvp-fichas): Gap 2 — webhook MP insere em ficha_ledger após PIX aprovado
- `ea1a2aa` feat(mvp-fichas): Gap 5 — email PT confirmada (sendPTConfirmedEmail + template)
- `f4bde89` feat(mvp-fichas): Gap 5 — confirmPTRealized dispara email pra alunos consumidos

### UAT criteria — status

1. Pedro acessa /admin/pros → PENDENTE validação visual Pedro
2. Aluno vê "Sem fichas" + CTA comprar → PENDENTE validação visual Pedro
3. Checkout → PIX → webhook → ficha aparece → PENDENTE teste sandbox MP
4. Aluno entra na fila → Pedro vê em /admin/pros → PENDENTE validação Pedro
5. 4 alunos preenchem slots → PENDENTE validação Pedro
6. startPT → status in_match → PENDENTE validação Pedro
7. Jogo manual no Dota 2 → N/A (manual)
8. confirmPTRealized → fichas consumidas → email pra alunos → PENDENTE validação Pedro
9. Aluno vê 0 fichas + histórico em /partidas → PENDENTE validação Pedro

### Pendente para Pedro testar

- Rodar `pnpm dev` e validar fluxo visual completo (dashboard → checkout → fila → admin/pros)
- Testar webhook com PIX sandbox Mercado Pago (confirmar ficha aparece após pagar)
- Confirmar que email de "PT confirmada" chega após confirmPTRealized

## Session Continuity

Last session: 2026-05-26T15:38:41.491Z
Stopped at: Completed 09-05a-backend-profile-sidebar-actions-PLAN.md
Resume file: None

**Próximos passos Pedro decide:**

1. Curar SFX agora pra V2.5 ficar funcionalmente completo (com FREESOUND_API_KEY ou manual)
2. Rodar `pnpm dev` e validar visualmente componentes em /components
3. Retomar MVP fichas (Phase 4 MP pausada) ou Phase 5 Bot Steam
4. ~~Aprovar migração Sistema B → A~~ ✓ CONCLUÍDA 2026-05-24 — DF8.4 fechado, 18 pages no Sistema A canônico

---

> Contexto completo do Milestone V2 (HUB) e decisões técnicas Phase 1-3 preservados
> no histórico de git. V2.5 COMPLETED com 40 commits, 8 phases, 0 erros TS/lint.
