# MVP Fichas — PLAN

**Data:** 2026-05-23
**Goal:** Pedro vende ficha PIX, aluno entra na fila, Pedro vê fila, joga, ficha consumida. Tudo manual no Dota 2 (sem bot Steam ainda).
**Estimativa:** 4–6 horas (escopo bem menor que o esperado — ver "Situação real" abaixo)
**Branch:** `feat/hero-state-refactor` (continua atual)

---

## Situação real pós-discovery

O MVP Fichas está **85% implementado**. O discovery revelou que o trabalho
na branch atual foi muito além do esperado. O que já existe e funciona:

### Já existe e funciona

| Funcionalidade | Onde |
|---|---|
| `user_fichas` (saldo) + `ficha_ledger` (auditoria) | `database.ts` tabelas completas |
| `coach_queue_entries` (fila com status: waiting → in_match → consumed/cancelled) | `database.ts` |
| `matches` (lifecycle: agendada → realizada → cobra fichas) | `database.ts` |
| `joinCoachQueue` / `leaveCoachQueue` (Server Actions) | `src/components/landing/actions.ts` |
| `QueueBoard` (variantes compact/presentation/admin) | `src/components/queue/queue-board.tsx` |
| `ProQueueCard` + `UserStatusBar` (optimistic UI, ficha balance, CTA contextual) | `src/components/queue/pro-queue-card.tsx` |
| `DashboardPage` (Server Component com todas as queries) | `src/app/dashboard/page.tsx` |
| `getMyFichaBalance`, `getProsWithQueues`, `getMyQueueStatus` | `src/lib/queries/` |
| `togglePROFila`, `startPT`, `confirmPTRealized`, `cancelPT`, `removeFromQueue` | `src/app/admin/pros/actions.ts` |
| `/admin/pros` (fila ao vivo, iniciar PT, confirmar, cancelar, enriquecer) | `src/app/admin/pros/page.tsx` |
| `adjustUserFichas` (admin grant/debit fichas manualmente) | `src/app/admin/fichas/actions.ts` |
| Checkout PIX avulso (AbacatePay) + webhook HMAC | `src/app/checkout/[packageId]/` |
| Realtime listener (Supabase) | `src/components/queue/realtime-listener.tsx` |
| StickyBanner (FreeBar estado) | `src/components/queue/sticky-banner.tsx` |

**Conclusão: o fluxo end-to-end já existe no código.** O que falta são
gaps pontuais que impedem o uso real.

---

## Escopo MÍNIMO V1 MVP (apenas o que realmente falta)

### Gap 1 — Package "Ficha" no DB (sem este, checkout não funciona)

- [ ] Verificar se existe pacote `tipo = 'ficha'` na tabela `packages` no Supabase
- [ ] Se não existir: inserir 1 pacote ficha (preço = PEDRO DECIDE, `qtd_partidas = 1`)
- [ ] Conferir se `getFichaPackage()` query retorna esse package corretamente
- [ ] Conferir se webhook AbacatePay, ao receber `status=paid`, chama trigger/ledger pra adicionar ficha ao comprador

### Gap 2 — Webhook AbacatePay → ficha_ledger (validar integração)

- [ ] Ler `src/app/api/webhooks/mercadopago/route.ts` — entender se webhook PIX avulso já insere em `ficha_ledger` com `source = 'purchase'`
- [ ] Se não inserir: adicionar lógica no webhook handler pra `qtd_partidas` do package → delta no ledger
- [ ] Testar com sandbox AbacatePay (payload mock)

### Gap 3 — Dashboard aluno: saldo visível + próxima sessão

- [ ] `/dashboard` já mostra `fichaBalance` e PRO cards — confirmar que saldo aparece prominentemente
- [ ] `UserStatusBar` já mostra estado de fichas — verificar se está integrado no `DashboardCenter`
- [ ] Histórico de partidas do aluno: `/partidas` page — verificar se existe e mostra matches realizadas

### Gap 4 — `/admin/pros` acessível por Pedro como admin (não apenas coaches)

- [ ] Verificar se Pedro (is_admin=true mas pode não ter registro na tabela `coaches`) consegue acessar `/admin/pros`
- [ ] Se Pedro não tiver registro `coaches`, criar um (seed manual ou via admin UI)
- [ ] Confirmar que `requireCoach()` em `admin/pros/actions.ts` bloqueia Pedro se não tiver coach row

### Gap 5 — Emails Resend (nice-to-have V1, não blocker)

- [ ] Email "ficha adquirida" após webhook PIX confirmar
- [ ] Email "partida confirmada" após `confirmPTRealized`
- *(pode ir pro Wave 4 se atrasar MVP)*

---

## FORA DE ESCOPO V1 MVP

- Bot Steam (manual no Dota 2)
- Subscription mensal (v2 HUB Phase 4 MP)
- Sistema MMR/Ranking interno
- Multi-coach UI (schema existe mas Pedro é o único coach)
- Badges/Achievements unlock real (componentes existem, dados mock)
- Migração pages pro ClientShell AAA V2.5 (pending todo STATE.md DF8.4)

---

## Dependências técnicas

### Já existe (confirmado no discovery)

- AbacatePay PIX avulso checkout (Phase 2)
- Webhook endpoint `/api/webhooks/mercadopago/route.ts`
- Supabase Auth Discord + Steam (Phase 3)
- `ficha_ledger` + `user_fichas` + `coach_queue_entries` + `matches` (schema completo)
- Server Actions: join/leave fila, toggle fila, startPT, confirmPTRealized, cancelPT
- Dashboard aluno com saldo + CTA entrar na fila
- `/admin/pros` com fila ao vivo + botões de controle

### Falta confirmar/implementar

- [ ] Package `tipo='ficha'` cadastrado no Supabase (valor a definir com Pedro)
- [ ] Webhook AbacatePay inserindo em `ficha_ledger` após PIX pago
- [ ] Pedro com registro na tabela `coaches` (pra acessar `/admin/pros`)
- [ ] Emails Resend pós-compra e pós-confirmação de PT

### Migration SQL necessária

Provavelmente nenhuma — schema já completo. Confirmar executando:

```sql
-- Verificar se tabelas existem
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_fichas', 'ficha_ledger', 'coach_queue_entries', 'matches');

-- Verificar se package ficha existe
SELECT id, nome, tipo, preco_brl, qtd_partidas FROM packages WHERE tipo = 'ficha';

-- Verificar se Pedro tem coach row
SELECT c.id, c.slug, p.username, p.is_admin
FROM coaches c JOIN profiles p ON c.profile_id = p.id;
```

---

## Plano de execução (waves)

### Wave 1 — Validação de gaps (1-2h)
- [ ] Rodar queries SQL acima no Supabase dashboard
- [ ] Ler `src/app/api/webhooks/mercadopago/route.ts` completo — entender fluxo PIX → ficha
- [ ] Ler `src/app/checkout/[packageId]/actions.ts` — entender criação do PIX charge

### Wave 2 — Fechar gaps críticos (2-3h)
- [ ] Inserir package ficha no Supabase (após Pedro definir preço)
- [ ] Corrigir/adicionar lógica webhook → `ficha_ledger` se não existir
- [ ] Criar coach row pra Pedro se não existir
- [ ] Testar end-to-end: checkout → PIX sandbox → ficha aparece → entra na fila → admin inicia PT → confirma

### Wave 3 — Emails Resend (1h, opcional)
- [ ] Email "ficha adquirida" (template básico, sem fancy design)
- [ ] Email "partida confirmada + resumo manual"

### Wave 4 — Smoke test completo (30min)
- [ ] Seguir todos os 9 critérios UAT abaixo
- [ ] Deploy pra preview Vercel (se existir)

---

## Success Criteria (UAT)

1. Pedro loga, acessa `/admin/pros`, vê fila vazia, togla fila aberta.
2. Aluno1 loga, acessa `/dashboard`, vê `UserStatusBar` com "Sem fichas", vê CTA "Comprar ficha pra entrar".
3. Aluno1 clica "Comprar ficha", vai pro checkout, gera PIX. Webhook sandbox confirma. Aluno1 atualiza `/dashboard` e vê "1 ficha disponível".
4. Aluno1 entra na fila. Pedro vê Aluno1 em `/admin/pros`.
5. Aluno2/3/4 repetem. Pedro vê 4 alunos com slots visuais preenchidos.
6. Pedro seleciona os 4 e clica "Iniciar PT". Status vira `in_match`.
7. Pedro/alunos jogam Dota manualmente (invitam no client).
8. Pedro volta em `/admin/pros`, vê PT pendente, clica "Confirmar realizada". Fichas dos 4 consumidas (trigger PG). Entries viram `consumed`.
9. Aluno1 atualiza `/dashboard`, vê "0 fichas", histórico mostra a partida em `/partidas`.

---

## Open Questions (Pedro precisa responder antes da Wave 2)

1. **Preço por ficha:** R$ 10? R$ 15? R$ 20? (define o `preco_brl` no package)
2. **Pacotes ou avulso:** Vende sempre 1 ficha por R$ X? Ou oferece bundle (5 fichas por R$ Y com desconto)?
3. **1 jogo = 1 ficha?** Ou 1 sessão (que pode ter N jogos) = 1 ficha? A implementação atual assume 1 ficha = 1 PT (partida com Pedro).
4. **Pedro tem acesso ao `/admin/pros`?** Confirmar se tem registro na tabela `coaches`. Se não, quem cria? (seed SQL manual ou UI admin já existente?)
5. **Webhook AbacatePay ou Mercado Pago?** O discovery encontrou o webhook em `/api/webhooks/mercadopago/` mas o CLAUDE.md original menciona AbacatePay. Confirmar qual provider está ativo pra fichas avulsas agora.

---

## Risco principal

O sistema parece completo em código, mas pode haver gap entre o código
implementado e o que está configurado no Supabase (funções PG, triggers,
dados seed). A Wave 1 de validação vai revelar se a execução real é 1h ou 6h.
