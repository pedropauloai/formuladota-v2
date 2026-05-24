# Pricing Model — FormulaDota

**Data:** 2026-05-23
**Status:** Locked V1 (Pedro aprovou modelo descentralizado com guardrails)
**Decisor:** Pedro Paulo (Founder)

---

## Princípios filosóficos respeitados

- `PHILOSOPHY.md` princípio 10: NÃO cassino competitivo
- `PHILOSOPHY.md` princípio 11: NÃO ganhar dinheiro jogando — mentoria é o produto
- `PHILOSOPHY.md` princípio 13: Multiplicação por exemplo
- `HONOR_SYSTEM.md`: tier HONOR define autoridade para cobrar mais
- Visitante dignificado: floor R$ 10 nunca quebra acessibilidade

---

## Modelo

### Floor universal: R$ 10

Ninguém pode cobrar menos. Protege o mercado contra corrida para o fundo.
Alinha com o preço histórico de Pedro e com o ticket de "hobby, não trabalho".
O PRO que cobra R$ 10 já está comprometido com entrega de valor, não com preço.

### Ceiling escalonado por tier HONOR

| Tier HONOR | Score mínimo | Preço máximo | Filosofia |
|---|---|---|---|
| Tiers 1-5 (Aprendiz → Honrado) | < 1700 | R$ 25 | Baseline — PRO ainda constrói reputação |
| Tier 6 (Mestre) | 1700 | R$ 35 | Capacidade demonstrada — valoriza expertise |
| Tier 7 (Lendário) | 1900 | R$ 45 | Referência cultural — preço premium orgânico |
| Tier 8 (Imortal da Fórmula) | 2100 | R$ 50 | Máximo PRO regular — ainda acessível |
| Pedro Founder (exception) | — | R$ 100 | Founder authority — sem dependência de tier |

**Pedro Founder exception:** Pedro é admin (`profiles.is_admin = true`). A função `get_max_price_for_pro` retorna R$ 100 para qualquer usuário com `is_admin = true`. Sem lógica especial de sponsor — fundador não precisa justificar para o sistema.

### Cooldown: 30 dias entre mudanças

Preço é compromisso, não marketing. O cooldown de 30 dias protege alunos de instabilidade e impede pricing wars por período curto.

A função `can_change_price(package_id)` retorna `can_change`, `next_change_allowed_at` e `days_remaining`.

### Histórico imutável

`package_price_history` é append-only. Nenhuma policy de UPDATE/DELETE existe via RLS para usuários normais. Service role é o único que insere (via Server Action `updateMyPackagePrice`).

Transparência sagrada: qualquer visitante pode ver a evolução de preços na página `/coaches/[slug]`.

### Alunos atuais protegidos

`purchases` armazena `preco_brl` no momento da compra. Não existe mecanismo de cobrança retroativa. Quem comprou por R$ 10 recebeu o serviço por R$ 10 — ponto final.

---

## Implementação técnica

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| DB — schema | `supabase/migrations/032_pricing_descentralizado.sql` | Coluna `last_price_change_at`, tabela `package_price_history`, funções `get_max_price_for_pro` e `can_change_price` |
| DB — types | `src/types/database.ts` | Gerado automaticamente pós migration |
| Server Actions | `src/app/pro/pricing-actions.ts` | `updateMyPackagePrice` (guardrails + audit) e `getMyPricingInfo` |
| UI — editor PRO | `src/components/pro/price-editor-card.tsx` | Client Component com slider, razão obrigatória, cooldown, histórico |
| UI — painel PRO | `src/app/pro/page.tsx` | Seção "Meu Pricing" integrada |
| UI — página pública | `src/app/coaches/[slug]/page.tsx` | Perfil público com preço + histórico + CTA |

---

## Anti-padrões proibidos

- **Pricing wars dia-a-dia:** cooldown de 30 dias previne
- **Coaching de luxo desconectado:** ceiling escalonado previne
- **Dumping R$ 1 pra atrair:** floor R$ 10 previne
- **Mudança retroativa em alunos:** purchase armazena preço da época
- **Promoção temporária / desconto:** sem mecanismo — seria marketing manipulativo
- **PRO copiando ceiling de outro:** cada um tem ceiling baseado em **seu** score HONOR

---

## Evolução futura (backlog, não V1)

- Ceiling Tier 8 (Imortal) poderia subir para R$ 60 com volume mínimo de alunos
- Pacotes mensais poderiam ter modelo de precificação separado
- Cooldown poderia ser reduzido para 15 dias após 12 meses como PRO ativo
- Desconto de fidelidade (não promoção): aluno recorrente paga menos — explorar em V3

Qualquer alteração nos guardrails requer aprovação explícita do Pedro — esses valores são parte da filosofia da plataforma, não ajustes técnicos.
