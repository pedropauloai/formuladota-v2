# PRO Promotion — Criterios, Fluxo e Governance

> **Data:** 2026-05-23
> **Status:** Documento fundacional V1
> **Autor:** Pedro Paulo
> **Relacao com outros docs:** PHILOSOPHY.md Pilar 13. HONOR_SYSTEM.md secao de elegibilidade.
> MULTIPLICATION_MODEL.md para o modelo de arvore generacional. REVENUE_MODEL.md para splits.

---

## Por que este documento existe

Promover alguem a PRO e a decisao de maior peso no FormulaDota. Mais pesada do que banir
um jogador. Mais pesada do que mudar uma regra da Doutrina.

Uma promocao equivocada — um PRO promovido por skill sem honor, por relacionamento pessoal
sem criterio objetivo, por pressao de amigos — corrompe o ambiente de uma forma que e
dificil de reverter. Um PRO toxico com credencial formal e pior do que um membro toxico
comum: ele ensina o comportamento errado com autoridade institucional.

Por isso este documento existe: para que a decisao de promover nao seja intuitiva, nao seja
rapida, e nao seja silenciosa. Cada promocao segue um processo. Cada etapa e documentada.
Cada promocao tem audit log publico.

---

## Glossario

**PRO:** Membro do FormulaDota com acesso a dashboard `/pro`, capacidade de vender proprias
fichas de partida, e responsabilidade de carregar a doutrina para seus alunos.

**Elegibilidade PRO:** Conjunto de criterios quantitativos que habilitam o membro a entrar
no processo de promocao. Elegivel nao e PRO — e candidato ao processo.

**Promocao:** O ato formal de conferir o status PRO apos o processo completo.

**Founder Authority:** Poder de veto e decisao final de Pedro como fundador. Existe em V1
e persiste mesmo em V2/V3 para casos excepcionais.

**Conselho de PROs:** Orgao colegiado de PROs ativos com mandato definido. Nao existe em V1.
Previsto para V2 (5+ PROs ativos). Documentado aqui para referencia futura.

**G0, G1, G2...:** Geracao de PRO. G0 = Pedro (founder). G1 = promovido diretamente por
Pedro. G2 = promovido por PRO G1 com endosso do Conselho. Ver MULTIPLICATION_MODEL.md.

---

## Parte I — Criterios de Elegibilidade

### 1.1 Criterios Quantitativos (verificaveis automaticamente)

Os criterios abaixo sao verificados pelo sistema. Nao dependem de julgamento humano.
Um membro que satisfaz todos eles aparece como "elegivel" no sistema de admin do Pedro.

| # | Criterio | Threshold | Campo no banco |
|---|----------|-----------|---------------|
| Q1 | Tier HONOR atual | Imortal da Formula (tier 8) | `honor_scores.tier = 'imortal-da-formula'` |
| Q2 | Sustentacao de tier | Honrado+ por 2+ temporadas consecutivas | `honor_tier_history` ultimas 2 seasons >= tier 5 |
| Q3 | Commendations mentor | 3+ commendations tipo "mentor" na carreira | `peer_commendations` all-time tipo "mentor" |
| Q4 | Skill minima | Tier 6 interno (Mestre) | `skill_scores.tier >= 6` |
| Q5 | Historico de strikes | Zero strikes graves em todo o historico | `honor_ledger` sem nenhum `strike_grave` |
| Q6 | Tempo de doutrina | Aceitou doutrina ha 6+ meses | `profiles.doctrine_accepted_at <= NOW() - INTERVAL '6 months'` |
| Q7 | Presenca minima | 80%+ de presenca na ultima temporada completa | `match_attendance.rate >= 0.80` ultima season |

**Nota sobre Q5:** Strikes graves incluem: toxicidade explicita com abuso verbal documentado,
banimento temporario anterior, manipulacao de partida, comportamento antidesportivo reincidente.
Strikes menores e medios nao bloqueam elegibilidade — apenas graves.

**Nota sobre Q1 + Q2:** Um membro pode atingir Q1 (Imortal da Formula) em uma temporada e
ainda nao satisfazer Q2 (sustentacao de 2 temporadas). Nesse caso, aguarda a proxima temporada
para ter o historico necessario. O sistema exibe isso claramente no perfil: "Elegibilidade PRO:
1 de 2 temporadas concluidas".

### 1.2 Criterios Qualitativos (avaliados na entrevista)

Os criterios abaixo nao podem ser verificados automaticamente. Sao avaliados por Pedro
(V1) ou pelo Conselho (V2+) na entrevista cultural.

**Q8 — Capacidade pedagogica:**
O candidato consegue explicar conceitos de Dota 2 de forma que um jogador menos experiente
compreenda? Paciencia com erros basicos, habilidade de identificar o que o aluno precisa
aprender — nao apenas o que o mentor quer ensinar.

Evidencias buscadas na entrevista: exemplos concretos de situacoes onde ajudou alguem a
melhorar, como lida com aluno que comete o mesmo erro repetidamente, como comunica critica
sem desmoralizar.

**Q9 — Maturidade emocional:**
O candidato mantem estabilidade em situacoes de alta pressao? Consegue perder partidas
importantes na presenca de alunos e mostrar o modelo correto de processamento? Ou o
Principio 3 da Doutrina (nao e o fim do mundo) e apenas teoria?

Evidencias buscadas: como reagiu a derrotas publicas registradas, feedback de companheiros
de equipe em partidas adversas, auto-relato de situacoes dificeis.

**Q10 — Alinhamento doutrinario profundo:**
O candidato internalizou a doutrina ou apenas a cumpre instrumentalmente? Existe diferenca
entre quem nao da strike porque tem medo de perder HONOR e quem nao da strike porque
genuinamente acredita que comportamento destrutivo e incompativel com o que e ser um
bom jogador.

Evidencias buscadas: perguntas abertas sobre situacoes hipoteticas (como reagiria se um
aluno estivesse claramente errando, mas se recusasse a aceitar feedback?), coerencia entre
o que diz e o que o historico de conduta mostra.

**Q11 — Disposicao para responsabilidade:**
PRO e responsabilidade, nao privilegio. O candidato entende que ter proprios alunos significa
ser cobrado pela conduta deles? Que um aluno de um PRO com comportamento toxico mancha a
reputacao do PRO?

Evidencias buscadas: o candidato faz perguntas sobre responsabilidades ou apenas sobre
beneficios? Como planeja selecionar seus proprios alunos?

---

## Parte II — Fluxo de Promocao

### 2.1 Como uma promocao comeca

**Via Pedro (V1 — padrao):**
Pedro identifica um membro elegivel no painel `/admin/users` (filtro "elegibilidade PRO
ativa"). Pedro pode iniciar o processo a qualquer momento — nao ha restricao de calendario.

**Via candidatura (V1 — possivel):**
Membro elegivel pode sinalizar interesse a Pedro via Discord (canal privado ou DM). Pedro
decide se inicia o processo ou aguarda. Nao ha obrigacao de resposta imediata.

**Via Conselho (V2+):**
Qualquer PRO ativo pode nomear um elegivel ao Conselho. O Conselho vota para iniciar o
processo de entrevista. Pedro mantem veto mesmo em V2+.

### 2.2 Etapas do processo

#### Etapa 1 — Notificacao de elegibilidade

**Responsavel:** Sistema automatico + Pedro

**Acao:** Quando um membro satisfaz todos os criterios quantitativos (Q1-Q7), o sistema:
- Notifica Pedro via Discord (canal admin privado)
- Registra o evento em `pro_eligibility_log` com timestamp e snapshot dos criterios
- NAO notifica o membro publicamente (para evitar expectativa prematura)

Pedro pode optar por notificar o membro via DM que ele e elegivel e que o processo
pode comecado quando ambos estiverem prontos.

#### Etapa 2 — Entrevista cultural

**Responsavel:** Pedro (V1) ou 2 membros do Conselho designados (V2+)

**Formato:** Conversa em voz no Discord, sem roteiro rigido mas com os criterios Q8-Q11
como guia. Duracao tipica: 30-60 minutos. Pode ser feita em mais de uma sessao.

**Documentacao:** Pedro (ou entrevistadores do Conselho) registra um sumario da entrevista
em `pro_interview_notes` — nao e transcricao, e avaliacao dos criterios qualitativos.
Este registro e privado (visivel apenas para Pedro e Conselho), mas existente.

**Resultado possivel da entrevista:**
- Aprovado: segue para Etapa 3
- Reprovado com feedback: Pedro comunica ao candidato os pontos especificos de desenvolvimento
  necessarios antes de nova avaliacao. Periodo de carencia de 1 temporada antes de nova
  tentativa.
- Reprovado sem carencia (caso raro): Criterio qualitativo inegociavel identificado (ex:
  candidato revelou fundamentalmente nao acreditar na filosofia do FormulaDota durante
  a entrevista). Documentado em `pro_interview_notes`.

**Nota critica:** Reprovacao nao e punition — e protecao. Tanto do candidato (que ainda
nao esta pronto) quanto dos futuros alunos (que merecem um mentor preparado).

#### Etapa 3 — Endosso formal

**Responsavel:** Pedro (V1). Conselho vota + Pedro valida (V2+).

**Acao:**
- Pedro registra endosso em `pro_endorsements` com campo `endorsed_by`, `reason` (texto
  livre, minimo 100 caracteres), e `approved_at`
- Em V2+: 2/3 do Conselho vota favoravel + Pedro nao usa veto

**Este e o ponto sem retorno simbolico.** Apos o endosso, o candidato e comunicado
formalmente da decisao.

#### Etapa 4 — Contrato de conduta PRO

**Responsavel:** Candidato

**Conteudo do contrato:**
1. Confirmacao de leitura de PHILOSOPHY.md, HONOR_SYSTEM.md, PRO_PROMOTION.md e REVENUE_MODEL.md
2. Comprometimento com os 14 principios da Doutrina como PRO (nao apenas como membro)
3. Confirmacao de entendimento das responsabilidades sobre os proprios alunos
4. Ciencia do modelo de revenue (split de fichas) e do processo de revogacao
5. Aceite de que o audit log da promocao e publico

**Formato tecnico:** Checkbox no sistema com campos preenchidos e `signed_at` timestamp.
Nao e contrato juridico — e compromisso documentado dentro da plataforma.

#### Etapa 5 — Ativacao

**Responsavel:** Sistema + Pedro

**Acoes automaticas apos assinatura:**
- `profiles.pro_status = 'active'` com `pro_activated_at = NOW()`
- Acesso a rota `/pro/dashboard` habilitado (RLS policy atualizada)
- Badge PRO visivel no perfil publico
- Registro em `pro_promotions` (tabela de historico imutavel)

**Acoes manuais de Pedro:**
- Anuncio publico no Discord do servidor FormulaDota (canal de anuncios)
- Mensagem personalizada de boas-vindas ao novo PRO (privado)

#### Etapa 6 — Audit log publico

**Responsavel:** Sistema

**Conteudo publico (visivel para todos os membros):**
- Nome do PRO promovido
- Temporada de promocao
- Quem endossou (Pedro ou, futuramente, Conselho)
- Data da promocao

**Conteudo privado (visivel apenas para Pedro + PRO):**
- Notas da entrevista
- Razao detalhada do endosso

A transparencia do audit log e o mecanismo anti-corrupcao central. Quando qualquer membro
pode ver quem foi promovido e quando, qualquer promocao suspeita e imediatamente questionavel.

---

## Parte III — Governance

### 3.1 V1 — Pedro Sole Authority

**Quando:** Desde o inicio ate o FormulaDota ter 5+ PROs ativos simultaneamente.

**Como funciona:**
- Pedro toma todas as decisoes de promocao sozinho
- Pedro pode consultar PROs existentes informalmente, mas a decisao e dele
- Pedro mantem founder authority absoluta: pode vetar qualquer promocao ou revogacao
- Sem orgao colegiado — velocidade de decisao maxima, responsabilidade total em Pedro

**Limitacao conhecida:** Se Pedro estiver ausente por periodo longo (ex: burnout, vida
pessoal), o processo trava. Aceito como risco V1 — em troca de simplicidade operacional.

### 3.2 V2 — Pedro + Conselho Inicial

**Quando:** FormulaDota atingir 5+ PROs ativos simultaneamente por pelo menos 1 temporada.

**Composicao do Conselho V2:**
- 3 membros: os 3 PROs mais antigos com status ativo e tier HONOR Lendario+ na temporada corrente
- Mandato: 1 temporada (renovavel por continuidade automatica se mantiver criterios)
- Pedro permanece com founder authority (veto)

**Como funciona em V2:**
- Qualquer PRO pode nominar candidato elegivel ao Conselho
- 2 membros do Conselho conduzem entrevista (Pedro pode participar mas nao e obrigatorio)
- Voto 2/3 do Conselho para aprovacao
- Pedro tem 7 dias para exercer veto (silencio = aprovacao tacita)
- Se Pedro veta: informa razao ao Conselho (privado). Candidato pode aguardar proxima temporada

**Nota V2:** O Conselho nao tem poder de promover sem Pedro — tem poder de recomendar com
peso formal, que Pedro pode aprovar sem entrevistar pessoalmente se confiar no processo.

### 3.3 V3+ — Conselho Estendido

**Quando:** 15+ PROs ativos. Escala torna impraticavel para Pedro participar de todas as
entrevistas.

**Composicao V3:**
- 5 membros eleitos pelos PROs ativos (voto secreto, mandato de 2 temporadas)
- Pedro mantem founder authority — agora como excecao, nao como regra
- Conselho tem autonomia de promover. Pedro usa veto apenas em casos de clara violacao
  de principios filosoficos

**Eleicao do Conselho V3:**
- Candidatos devem ser PROs ativos com 3+ temporadas como PRO
- Votacao pelos PROs ativos ao final de cada 2 temporadas
- Resultado publico (transparencia)

---

## Parte IV — Revogacao de Status PRO

### 4.1 O que causa revogacao

Revogacao e a perda formal do status PRO. Nao e banimento — e um nivel de resposta
especifico para violacoes que comprometem a funcao de PRO.

**Causas de revogacao obrigatoria (sem processo de apelacao em V1):**
- Strike grave por toxicidade explicita como PRO (comportamento perante alunos)
- Fraude no sistema de fichas ou revenue
- Violacao documentada de principios filosoficos centrais (ex: PRO defendendo publicamente
  que comportamento destrutivo e aceitavel se o jogador e habilidoso)
- Comportamento que cause dano reputacional ao FormulaDota externamente

**Causas de revogacao com processo (PRO pode contestar):**
- HONOR tier caiu abaixo de Respeitado (tier 4) por 2 temporadas consecutivas
- Inatividade prolongada sem comunicacao (2+ temporadas sem jogar + sem justificativa)
- Reclamacoes documentadas de alunos sobre comportamento do PRO fora de partida

**O que NAO causa revogacao:**
- Passar por periodo dificil de vida pessoal (comunicar a Pedro, solucao = pausa voluntaria)
- Queda temporaria de HONOR por um strike medio isolado (acompanhado, nao revocado)
- Discordancia de Pedro sobre estrategia de Dota (opiniao tecnica nao e criterio moral)

### 4.2 Fluxo de revogacao

#### Para causas obrigatorias:

1. Pedro documenta o incidente em `pro_strikes_grave` (tabela especifica de eventos graves)
2. Pedro registra decisao de revogacao em `pro_revocations` com `reason` detalhado
3. Status atualizado: `profiles.pro_status = 'revoked'` com `pro_revoked_at` e `revoked_by`
4. Acesso a `/pro/dashboard` removido imediatamente
5. Audit log publico: nome, temporada, motivo generico (ex: "violacao de conduta grave")
6. Anuncio no Discord (canal de anuncios) — sem detalhes humilhantes, apenas o fato

**Nota:** Revogacao nao apaga historico. Partidas jogadas como PRO permanecem. Alunos
continuam registrados. O fato de ter sido PRO permanece no historico — o que muda e o
status atual e o acesso.

#### Para causas com processo:

1. Pedro (ou Conselho em V2+) notifica o PRO da situacao em revisao (DM Discord)
2. PRO tem 7 dias para apresentar contexto
3. Decisao tomada por Pedro (V1) ou Conselho com veto Pedro (V2+)
4. Resultado comunicado ao PRO antes de ser tornado publico
5. Se revocado: fluxo acima (etapas 2-6)
6. Se mantido: documentado em `pro_review_outcomes` (para historico interno)

### 4.3 Possibilidade de re-promocao

PRO revocado pode ser re-promovido? Em principio, sim — com barreiras adicionais.

**Para causas obrigatorias:** Periodo de carencia minimo de 4 temporadas. Novo processo
completo desde zero. Pedro mantem poder de recusa definitiva sem explicacao adicional
(founder authority).

**Para causas com processo:** Periodo de carencia de 2 temporadas. Novo processo completo.
Criterios quantitativos calculados do zero (exceto historico de strikes).

---

## Parte V — Aposentadoria Voluntaria

### 5.1 O que e aposentadoria

PRO pode decidir pausar ou encerrar voluntariamente o status PRO — por vida pessoal, burnout,
mudanca de prioridades, ou qualquer razao. Aposentadoria e diferente de revogacao em todos
os aspectos: e uma saida digna, nao uma penalidade.

### 5.2 Tipos de aposentadoria

**Pausa temporaria:**
- PRO comunica a Pedro a necessidade de pausa (pode ser informal, via Discord)
- Status muda para `'paused'` — acesso ao dashboard mantido em modo leitura
- Fichas nao podem ser vendidas em modo pausado
- Alunos ativos sao notificados pelo PRO (responsabilidade do PRO, nao da plataforma)
- Sem prazo maximo de pausa — PRO retorna quando estiver pronto

**Aposentadoria permanente:**
- PRO comunica decisao a Pedro
- Status muda para `'retired'` — acesso ao dashboard encerrado
- Badge especial "PRO Aposentado" permanece visievel no perfil publico como legado
- Historico de partidas, alunos e contribuicoes permanece intacto

### 5.3 Honras de aposentadoria

PRO aposentado que completou 3+ temporadas ativas com status clean (sem revocacao) recebe:

- Titulo honorario "Guardiao da Formula" exibido no perfil publico
- Mencionado no Hall of Fame de PROs fundadores (permanente na plataforma)
- Acesso de leitura ao Conselho de PROs (sem direito a voto) pelo resto da historia da plataforma

A aposentadoria nao e fim — e transicao para um tipo diferente de pertencimento.

---

## Parte VI — Anti-corrupcao

### 6.1 Conflitos de interesse documentados

**PRO promovendo proprio mentee:**
Um PRO nao pode ser o unico decisor na promocao de alguem que foi seu aluno. Mesmo em V1,
Pedro deve ter consciencia do relacionamento mentor-mentee antes de endossar.

Em V2+: o PRO que foi mentor do candidato e excluido do voto do Conselho para aquele
candidato especifico. Pedro revisa o processo com atencao adicional.

**Razao:** O mentor tem viés natural positivo em relacao ao mentee. O sistema de avaliacao
precisa de perspectiva externa para equilibrar esse vies.

**Pedro promovendo amigo pessoal:**
Pedro tem founder authority, mas compromete publicamente a aplicar os criterios objetivos
mesmo para amigos pessoais. O audit log publico e o mecanismo de accountability: se Pedro
promove alguem abaixo dos criterios quantitativos, isso e visievel para qualquer membro
que inspecione o historico.

**Em V2+:** O Conselho pode questionar formalmente uma promocao de Pedro que aparentemente
viola criterios. Pedro deve responder ao Conselho (nao a toda a comunidade, mas ao Conselho).

**PRO usando status para beneficio financeiro indireto:**
PRO nao pode recomendar servicos externos em troca de remuneracao para seus alunos dentro
da plataforma. O espaco de mentoria da plataforma e exclusivamente para desenvolvimento
de Dota 2 — nao para marketing pessoal de outros negocios.

### 6.2 Transparencia como anti-corrupcao

O mecanismo anti-corrupcao mais poderoso do sistema nao e uma regra — e a visibilidade.

Audit log publico de promocoes significa que qualquer membro pode ver:
- Quem foi promovido
- Quando foi promovido
- Quem endossou

Se uma promocao parece irregular a qualquer membro, ele pode questionar Pedro (Discord).
Pedro tem o compromisso de responder a questionamentos formais dentro de 7 dias.

Esse mecanismo nao garante que corrupcao nunca aconteca — garante que corrupcao tem custo
reputacional real e imediato.

---

## Parte VII — Notas de Implementacao Tecnica

### Tabelas necessarias (draft)

```sql
-- Log de elegibilidade (quando membro satisfez criterios quantitativos)
CREATE TABLE pro_eligibility_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  became_eligible_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criteria_snapshot JSONB NOT NULL, -- snapshot dos valores no momento da elegibilidade
  notified_admin BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, became_eligible_at::DATE) -- um registro por dia por usuario
);

-- Notas de entrevista (privadas)
CREATE TABLE pro_interview_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  interviewed_by UUID NOT NULL REFERENCES auth.users(id),
  interview_date DATE NOT NULL,
  q8_pedagogia_score INTEGER CHECK (q8_pedagogia_score BETWEEN 1 AND 5),
  q9_maturidade_score INTEGER CHECK (q9_maturidade_score BETWEEN 1 AND 5),
  q10_doutrina_score INTEGER CHECK (q10_doutrina_score BETWEEN 1 AND 5),
  q11_responsabilidade_score INTEGER CHECK (q11_responsabilidade_score BETWEEN 1 AND 5),
  notes TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'rejected_with_feedback', 'rejected_final')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Endossos formais
CREATE TABLE pro_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  endorsed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (char_length(reason) >= 100),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promocoes (registro imutavel publico)
CREATE TABLE pro_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by UUID NOT NULL REFERENCES auth.users(id),
  generation INTEGER NOT NULL DEFAULT 1, -- G1, G2, etc.
  season_id UUID REFERENCES seasons(id),
  endorsement_id UUID NOT NULL REFERENCES pro_endorsements(id),
  public_note TEXT -- texto do anuncio publico
  -- Sem UPDATE nem DELETE via RLS
);

-- Revogacoes (registro imutavel publico)
CREATE TABLE pro_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by UUID NOT NULL REFERENCES auth.users(id),
  cause_type TEXT NOT NULL CHECK (cause_type IN ('mandatory', 'process')),
  reason_public TEXT NOT NULL, -- motivo generico exibido publicamente
  reason_private TEXT, -- motivo detalhado (visivel apenas para admin)
  -- Sem UPDATE nem DELETE via RLS
);
```

### Politicas RLS

- `pro_eligibility_log`: SELECT para admin; sem acesso direto de membros
- `pro_interview_notes`: SELECT para admin e para o proprio entrevistado (readonly)
- `pro_endorsements`: SELECT para admin; publico apos promocao efetivada
- `pro_promotions`: SELECT para todos os membros (audit log publico); INSERT apenas service role
- `pro_revocations`: SELECT para todos os membros (campo reason_public); reason_private apenas admin

---

*Este documento e fundacional e permanente. O processo pode ser otimizado em versoes futuras
mas os principios de transparencia, criterio objetivo e anti-corrupcao sao intocaveis.
Versao 1.0 — 2026-05-23.*
