# Backlog — Features pós-METHODOLOGY.md

> **Origem**: sessão de auditoria 2026-05-24 após criação do `docs/foundations/METHODOLOGY.md`.
>
> **Status**: features identificadas durante a auditoria do código contra os docs de fundação atualizados. NÃO foram aplicadas nesta sessão — viram phases GSD dedicadas quando Pedro priorizar.
>
> **Contexto**: a plataforma ainda está em construção fundamental (não deployada). As features abaixo aprofundam a fidelidade do código ao METHODOLOGY.md + HONOR_SYSTEM.md + UX_PRINCIPLES.md.

---

## Feature 1 — Pergunta canônica obrigatória pós-derrota

**Origem**: `UX_PRINCIPLES.md` M13 (Pergunta Canônica de Auditoria).

**O que fazer**:
- Nova tabela `match_reflections (match_id, user_id, content, submitted_at)` no Supabase
- Componente bloqueante na tela pós-partida em DERROTA
- Textarea com placeholder = pergunta literal: *"O que eu poderia ter feito diferente para ter ganho essa partida, mesmo com o time jogando mal?"*
- Validação `LENGTH(content) >= 30` antes de liberar fechamento
- Texto submetido NÃO é analisado por IA — valor está no ato de escrever
- Em VITÓRIA, campo presente mas não bloqueante (Doutrina §Pilar 5: derrota é mais valiosa)

**Princípios envolvidos**: anti-padrão #14 (Recusa de Auditoria), Pilar 5 (Derrota > Vitória).

**Dependências técnicas**: bot Steam capturando dados de partida (Phase 5+). Sem isso, não há "pós-partida" pra renderizar.

**Risco**: médio. Mexer em fluxo crítico (pós-partida) requer feature flag e teste cuidadoso.

---

## Feature 2 — Componente `<DrillSuggestion>` no dashboard Visitante

**Origem**: `CALIBRATION.md` seção "Sugestão de pré-requisito técnico durante Visitante".

**O que fazer**:
- Componente sugerido (não obrigatório) no dashboard de usuário em `calibration_status = 'visitante'`
- 3 drills oficiais expostos: LH @20min (255 QoP ref), corrida até level 25, 1000 last hits
- Upload de screenshot do scoreboard via Supabase Storage
- Achievement "Treino Validado" no eixo HONOR quando drill validado (sem peso de strike — sinal positivo)
- Tabela `drill_submissions (user_id, drill_type, screenshot_url, submitted_at, validated_at, validated_by)`

**Princípios envolvidos**: a Fórmula prega disciplina + treino. Frase canônica: *"Se você não consegue fazer 10.000 de ouro sozinho com os creeps, jamais conseguirá com nove pessoas atrapalhando."*

**Dependências técnicas**: Storage configurado, admin review flow.

**Risco**: baixo. Feature opcional, não bloqueante.

---

## Feature 3 — Campo `severity` no `Antipattern` type

**Origem**: `HONOR_SYSTEM.md` seção "Critérios de Strike" — matriz Leve/Média/Grave/Crítica.

**O que fazer**:
- Adicionar campo opcional `severity?: "leve" | "media" | "grave" | "critica"` no tipo `Antipattern` em `src/lib/doctrine.ts`
- Preencher os 15 anti-padrões com a classificação documentada:
  - **Leve** → #1, #4, #5, #7, #11, #13
  - **Média** → #2, #3, #8, #12, #14, #15
  - **Grave** → #6, #9 (já têm `directSeverity: "suspensao"`)
  - **Crítica** → #10 (já tem `directSeverity: "banimento"`)
- Quando HONOR loss automatizado for ativado (Phase 6+), usar essa classificação pra calcular delta_honor por strike

**Princípios envolvidos**: Pilar 3 (dois eixos SKILL + HONOR).

**Dependências técnicas**: nenhuma imediata — campo informativo. Phase 6+ vai consumir.

**Risco**: muito baixo. Adição não-breaking ao type.

---

## Feature 4 — Loading screens com princípios canônicos rotacionando

**Origem**: `UX_PRINCIPLES.md` M6 (Loading Cinematográfico) + M7 (Empty States Narrativos).

**O que fazer**:
- Em toda tela de loading + transições críticas (entrar na fila, pós-partida revelado, cerimônia de calibração), exibir um princípio da Doutrina ou frase canônica do METHODOLOGY.md
- Rotação determinística por hash de `user_id` + timestamp (mesmo princípio durante a sessão)
- Frases candidatas inicial:
  - "Permita-se questionar. Sobre tudo e qualquer coisa."
  - "A culpa nunca é do outro."
  - "Ou você ganha, ou você aprende."
  - "Dota 2 é um jogo de corrida."
  - "O relógio é o seu principal guia."
  - "99,5% jogam simulador de herói. Você não é mais um deles."
  - "Permita-se evoluir."
- Componente `<DoctrineLoadingScreen>` reusável

**Princípios envolvidos**: UX_PRINCIPLES M6 (cinematográfico) + cultura como ritual.

**Dependências técnicas**: nenhuma. Pode ser implementado standalone.

**Risco**: baixo. Feature de polimento.

---

## Sugestão de priorização (não-prescritiva)

| Feature | Esforço | Impacto | Risco | Quando |
|---------|---------|---------|-------|--------|
| **3** — campo `severity` | 15min | Médio | Muito baixo | Pode aplicar hoje |
| **4** — loading screens com princípios | 2-4h | Alto (cultura) | Baixo | Próxima onda de polimento |
| **2** — `<DrillSuggestion>` | 1 dia | Médio | Baixo | Quando Calibration receber atenção |
| **1** — pergunta canônica pós-derrota | 2 dias | **Alto** | Médio | Junto com bot Steam (Phase 5+) |

---

## Como esse backlog se relaciona com `TASKS.md`

- `TASKS.md` raiz = backlog original do PRD (Phases 1-6 originais). Histórico.
- `.planning/methodology-features-backlog.md` (este arquivo) = features identificadas pós-METHODOLOGY (2026-05-24). Específico desta onda.
- Quando uma feature deste backlog virar phase GSD ativa, criar `.planning/phases/XX-nome-da-phase/` correspondente.
