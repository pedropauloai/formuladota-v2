# Revenue Model — FormulaDota

> **Data:** 2026-05-23
> **Status:** Locked V1 — Pedro aprovou modelo simplificado
> **Autor:** Pedro Paulo
> **Relacao com outros docs:** PHILOSOPHY.md pilares 10 e 13. MULTIPLICATION_MODEL.md para
> o modelo de geracao. PRO_PROMOTION.md para criterios de quem tem direito a participar do split.

---

## Principios Inegociaveis

Antes do modelo em si, os principios filosoficos que o constrangem. Qualquer variacao futura
do modelo precisa respeitar estes principios ou requer revisao explicita dos pilares filosoficos.

**Principio R-1:** Pedro sustentavel (PHILOSOPHY Pilar 10 — nao cassino competitivo)
O founder nao pode ser recompensado de forma que crie incentivo para comprometer a qualidade
cultural da plataforma. Pedro ganha por fazer sua funcao — jogar com alunos e promover PROs
com discernimento — nao por volume de transacoes.

**Principio R-2:** PROs incentivados a permanecer (PHILOSOPHY Pilar 13 — multiplicacao)
Se PROs ficam com uma fatia pequena, o incentivo para manter a qualidade de conduta cai.
O modelo deve recompensar generosamente quem carrega a doutrina.

**Principio R-3:** Plataforma operacionalmente viavel
Infraestrutura tem custo real. O split precisa cobrir Supabase, gateway de pagamento, dominio,
bot Steam, emails transacionais. A plataforma nao pode ser subsidiada indefinidamente.

**Principio R-4:** Anti-MLM estrutural (PHILOSOPHY Pilar 13 — anti-padroes proibidos)
Nenhum participante extrai percentual perpetuo de transacoes que nao gerou. O sponsor fee
de Pedro sobre novos PROs e one-time, nao recorrente. Nao existe cadeia de comissoes por
geracao que incentive recrutamento acima de qualidade.

**Principio R-5:** Transparencia para PROs
Todo PRO tem acesso ao proprio historico de splits. A plataforma nao obscurece como o
dinheiro flui. Cada ficha vendida gera um registro imutavel auditavel.

**Principio R-6:** TAM finito da audiencia Dota 2 BR
A audiencia mundial de Dota 2 em portugues brasileiro tem teto estimado de **~10.000 usuarios
ativos** consumindo conteudo na internet (numero declarado por Pedro em transcript do canal).
Isso significa que o modelo financeiro do FormulaDota nao pode assumir crescimento ilimitado
de usuarios — nao existe TAM gigantesco a conquistar. Implicacoes:

- Nao tentar premium prematuramente — preco baixo e estrategia, nao falta de ambicao
- Nao construir features esperando viralizacao de massa
- A receita por usuario deve ser planejada considerando que o universo total e finito
- O moat e cultural (doutrina + filtro) e nao geografico ou tecnico

**Principio R-7:** Side project saudavel — sem pressao de monetizacao
O FormulaDota v2 e declarado pelo Pedro como **"side project saudavel sem pressao de
monetizacao — limite 1-2h/dia"** no contexto MAI/2026. A fonte de renda principal de Pedro
esta em outra operacao (ver memoria `reference_mentos_semaforo`). Implicacao para o modelo
de receita: o produto pode ser paciente, cerimonial, sem urgencia financeira. Decisoes de
roadmap NAO podem assumir que Pedro precisa que a plataforma gere receita imediata para
sobreviver. Isso libera espaco para qualidade sobre velocidade.

---

## Modelo Aprovado V1

### Estrutura de participantes

| Participante | Descricao | Split padrao |
|-------------|-----------|-------------|
| Plataforma | Infraestrutura FormulaDota | 5% universal |
| Pedro (Founder G0) | Criador e primeiro PRO | 95% das proprias fichas + sponsor fee one-time |
| PRO G1+ | Promovido por Pedro ou Conselho | 85% das proprias fichas (95% apos 1a) |

### Detalhamento por participante

#### Pedro — Founder G0

Pedro e um caso especial. Ele nao e apenas PRO — e o fundador da plataforma e arquiteto
da doutrina. Seu split reflete isso.

**Das proprias fichas:**
- 95% para Pedro (plataforma retira 5%)
- Pedro nao paga sponsor fee para ninguem — nao ha quem o promoveu

**De cada novo PRO promovido:**
- 10% da PRIMEIRA ficha vendida pelo novo PRO (sponsor fee one-time)
- Esse 10% e deduzido da fatia do PRO na primeira transacao apenas
- Da segunda ficha em diante do mesmo PRO, Pedro nao recebe nada

**Racional do sponsor fee one-time:**
Pedro investe tempo real em cada promocao: entrevista cultural, endosso formal, acompanhamento
inicial. O sponsor fee compensa esse investimento sem criar dependencia financeira perpetua.
O fee ser one-time e o que separa este modelo de uma estrutura MLM.

#### PRO G1+ — Promovido

PRO e qualquer Imortal da Formula promovido formalmente (ver PRO_PROMOTION.md).
G1 significa promovido diretamente por Pedro. G2 seria promovido por um PRO G1, se o
Conselho de PROs habilitar esse mecanismo no futuro (ver MULTIPLICATION_MODEL.md).

**Das proprias fichas:**
- Primeira ficha: 85% para o PRO (5% plataforma + 10% sponsor fee one-time para Pedro)
- Segunda ficha em diante: 95% para o PRO (5% plataforma)

**Racional do split 95%:**
A fatia de 95% pos-primeira-ficha e deliberadamente alta. O objetivo e que o PRO sinta
que a plataforma e um instrumento a servico dele, nao uma extratora de valor. PROs que
percebem o split como justo tem incentivo para recrutar alunos, manter qualidade de conduta,
e permanecer ativos.

#### Plataforma

5% de TODAS as transacoes, sem excecao. Isso inclui fichas de Pedro e fichas de PROs.

**O que o 5% cobre:**
- Supabase (banco de dados + autenticacao + storage)
- Gateway de pagamento (Mercado Pago / AbacatePay fees, tipicamente 1.5-3%)
- Dominio + CDN
- Bot Steam (infra de deteccao de partidas)
- Resend (emails transacionais)
- Custos operacionais imprevistos

**Nota sobre gateway:** O gateway de pagamento ja cobra uma taxa (normalmente 1.5-3% no PIX).
Esse custo e absorvido dentro do 5% da plataforma — o PRO recebe o split calculado sobre o
valor bruto da ficha, e a plataforma arca com os custos do gateway a partir do proprio 5%.

---

## Exemplo Numerico

Ficha = R$ 10.00

**Cenario A: Pedro vende sua propria ficha**

| Destinatario | Valor | Percentual |
|-------------|-------|-----------|
| Plataforma | R$ 0.50 | 5% |
| Pedro | R$ 9.50 | 95% |

**Cenario B: Maria (PRO G1) vende sua primeira ficha**

| Destinatario | Valor | Percentual | Natureza |
|-------------|-------|-----------|---------|
| Plataforma | R$ 0.50 | 5% | Universal |
| Pedro | R$ 1.00 | 10% | Sponsor fee one-time |
| Maria | R$ 8.50 | 85% | Receita PRO |

**Cenario C: Maria vende sua segunda ficha (e todas as subsequentes)**

| Destinatario | Valor | Percentual | Natureza |
|-------------|-------|-----------|---------|
| Plataforma | R$ 0.50 | 5% | Universal |
| Pedro | R$ 0.00 | 0% | Sponsor fee ja liquidado |
| Maria | R$ 9.50 | 95% | Receita PRO |

**Por que esse modelo funciona:**
Maria fica com 95% a partir da segunda ficha. Isso e melhor do que a maioria das plataformas
de marketplace (que ficam com 20-30%). Maria tem incentivo estrutural enorme para: (a) manter
qualidade para reter alunos, (b) permanecer na plataforma em vez de criar estrutura propria,
(c) recomendar a plataforma para outros Immortais da Formula.

---

## Implementacao Tecnica

### Estrutura de banco de dados

```sql
-- Registro de splits por transacao de ficha
CREATE TABLE revenue_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transacao de origem
  ficha_ledger_id UUID NOT NULL REFERENCES ficha_ledger(id),

  -- Participante que recebe
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('platform', 'pro', 'founder_sponsor')),
  recipient_user_id UUID REFERENCES auth.users(id), -- NULL para platform

  -- Valores
  gross_amount_brl INTEGER NOT NULL, -- valor bruto da ficha em centavos
  split_percentage NUMERIC(5,2) NOT NULL, -- ex: 5.00, 10.00, 85.00
  split_amount_brl INTEGER NOT NULL, -- valor calculado em centavos

  -- Contexto
  is_sponsor_fee BOOLEAN NOT NULL DEFAULT FALSE, -- true apenas para 1a ficha
  sponsor_fee_settled BOOLEAN, -- true = sponsor fee ja foi pago anteriormente

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Imutabilidade: splits nao podem ser deletados ou atualizados
  CONSTRAINT revenue_splits_immutable CHECK (TRUE) -- enforced via RLS + trigger
);

-- Controle de sponsor fee (para saber se primeira ficha ja foi processada)
CREATE TABLE pro_sponsor_fee_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  sponsor_user_id UUID NOT NULL REFERENCES auth.users(id), -- Pedro
  first_ficha_id UUID REFERENCES ficha_ledger(id),
  fee_settled_at TIMESTAMPTZ, -- NULL = ainda nao vendeu primeira ficha
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Trigger de calculo automatico

Um trigger PostgreSQL dispara em cada INSERT em `ficha_ledger` para calcular e inserir os
splits automaticamente em `revenue_splits`. A logica e:

1. Verificar `pro_sponsor_fee_status` para o PRO que vendeu a ficha
2. Se `fee_settled_at IS NULL`: split = plataforma 5% + Pedro 10% + PRO 85%
   Marcar `fee_settled_at = NOW()` em `pro_sponsor_fee_status`
3. Se `fee_settled_at IS NOT NULL`: split = plataforma 5% + PRO 95%

O trigger roda em `SECURITY DEFINER` para garantir que nenhum cliente pode bypassar o calculo.

### Visibilidade na interface

**Pedro — `/admin/users/[id]` → aba Revenue:**
Exibe historico completo de splits gerados por esse PRO, incluindo sponsor fee recebido
e splits recorrentes. Permite auditoria de qualquer transacao.

**PRO — `/pro` → secao Revenue:**
Exibe propria receita acumulada, split de cada ficha vendida, e data de liquidacao do
sponsor fee (para que o PRO saiba que a partir de quando ficou com 95%).

**Nota:** PROs nao veem splits de outros PROs. Pedro ve tudo (admin role).

---

## Politica de Privacidade Financeira

- PRO ve apenas o proprio historico de splits
- Pedro ve todos os splits (founder authority + admin role)
- Alunos (usuarios comuns) nao veem splits — apenas o preco da ficha
- Splits sao imutaveis no banco (append-only, sem UPDATE ou DELETE via RLS)
- Disputas de split sao resolvidas via Discord com Pedro, com log publico da resolucao

---

## Perguntas Frequentes Antecipadas

**"Por que Pedro ganha 10% da primeira ficha se nao jogou naquela partida?"**
Pedro nao e recompensado pela partida em si — e recompensado pelo trabalho de formacao e
promocao do PRO, que representa investimento real de tempo e criterio. O fee one-time
e o equivalente a honorario de mentoria, nao comissao de vendas.

**"E se o PRO sair da plataforma e criar estrutura propria?"**
O modelo nao cria lock-in financeiro — PRO pode sair a qualquer momento. O incentivo de
permanencia e a base de alunos construida dentro da plataforma e a reputacao HONOR acumulada
que nao e transferivel para fora. Nao usamos contratos de exclusividade.

**"Como garantir que a plataforma nao aumenta o proprio percentual no futuro?"**
Esta especificacao e um compromisso publico de Pedro com os PROs. Alteracoes no split
requerem: (a) aprovacao do Conselho de PROs (quando existir), (b) notificacao com 60 dias
de antecedencia, (c) nao se aplicam retroativamente a contratos firmados.

**"Existe split para conteudo produzido por PROs (streams, tutoriais)?"**
Nao. V1 cobre apenas fichas de partida. Monetizacao de conteudo e scope de V2.

---

## Versionamento do Modelo

**V1 (atual):** Pedro Founder + PROs G1. Modelo aprovado por Pedro 2026-05-23.

**V2 (5+ PROs ativos):** Conselho de PROs pode propor ajustes (voto qualificado 2/3).
Mudancas precisam respeitar Principios R-1 a R-5.

**V3+ (escala):** Possivel introducao de tiers PRO (Junior/Senior/Master) com splits
diferenciados por tier. Decisao futura — requer dados reais de operacao.

---

*Este documento e um compromisso operacional de Pedro com os participantes do ecossistema.
A estrutura filosofica (Principios R-1 a R-5) e intocavel sem revisao dos pilares de
PHILOSOPHY.md. Os percentuais especificos podem ser revisados conforme V2+, sempre com
processo participativo. Versao 1.0 — 2026-05-23.*
