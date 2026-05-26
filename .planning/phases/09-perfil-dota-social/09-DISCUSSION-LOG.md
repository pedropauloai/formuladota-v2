# Phase 9: Perfil Dota 2 + Social — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisões capturadas em CONTEXT.md — este log preserva alternativas consideradas.

**Date:** 2026-05-26
**Phase:** 09-perfil-dota-social
**Mode:** discuss
**Areas discussed:** Catálogo de heróis, Hero portrait fundo, Sistema de presença, Modelo friendship, Tabs /me, Sidebar collapsed state, UI edição, Default sidebar state, Tab Histórico conteúdo, Tab Conduta conteúdo

---

## Pre-discussion decisions (consolidadas da sessão anterior)

Antes de invocar `/gsd:discuss-phase`, as seguintes decisões foram tomadas em conversa direta com Pedro:

| Decisão | Escolha |
|---------|---------|
| Escopo MVP | Tudo de uma vez (visual + edição + amigos reais) |
| Lista de amigos | Sistema completo de friendships |
| Campos editáveis | Status message + Heróis favoritos + Hero portrait + Avatar custom (4/4) |
| Workflow | GSD completo (discuss → ui → plan → execute) |

Essas viraram a base do Phase Boundary e dos gray areas apresentados.

---

## Gray areas selecionadas pra discussão

Pedro selecionou (multiSelect):
✓ Catálogo de heróis Dota
✓ Hero portrait de fundo
✓ Sistema de presença online
✓ Tabs do /me

---

## Catálogo de heróis Dota

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Bundle estático JSON no app (Recomendado) | ~100KB, zero latency, atualiza quando Valve lança herói (raro) | ✓ |
| OpenDota API live | Sempre fresco mas latency ~200-500ms + rate limit | |
| Bundle + sync mensal via build script | Best of both, requer rodar `pnpm gen:heroes` manual | |

**User's choice:** Bundle estático JSON
**Notes:** Padrão usado pelo próprio OpenDota web — recomendação aceita.

### Schema dos heróis

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Mínimo (id, slug, nome, portrait_url) | ~30KB, MVP enxuto | |
| Completo (+ roles, primary_attr, complexity, image_full, image_icon) | ~150KB, permite filtrar/buscar por role/atributo | ✓ |
| Você decide | Claude define schema | |

**User's choice:** Completo
**Notes:** Permite UX mais rica no HeroPicker (filtros por carry/support/etc).

---

## Hero portrait de fundo

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Apenas URLs Valve oficiais do catálogo (Recomendado) | Zero upload, zero storage extra, MVP simples | ✓ |
| Valve + upload custom em Supabase Storage | Mais flexível, mais complexo | |
| Apenas upload custom | Máxima flexibilidade, mais friction onboarding | |

**User's choice:** Apenas Valve oficial
**Notes:** Decisão MVP — mantém escopo apertado. Upload custom de background fica como deferred idea pra V2.

---

## Sistema de presença online

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Supabase Realtime presence (Recomendado) | Online = aba FD aberta, zero deps externas | ✓ |
| Discord presence (via bot) | Mostra online no Discord, precisa bot Gateway + intent privileged | |
| Híbrido (FD + Discord) | Indicador visual diferencia fonte, mais infra | |

**User's choice:** Supabase Realtime presence
**Notes:** Aceita simplicidade do MVP. Discord/Steam integration vira deferred V2/V3.

### Modelo de friendship

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Mutual com confirmação (Recomendado, estilo Dota 2/Discord) | A pede → B aceita → mutual | ✓ |
| Follow assimétrico (estilo Twitter) | A segue B sem aceite, reciprocidade opcional | |
| Você decide | Claude escolhe | |

**User's choice:** Mutual com confirmação
**Notes:** Alinha com Dota 2 client (referência canônica) + mais privacidade.

---

## Tabs do /me

| Opção | Descrição | Selected |
|-------|-----------|----------|
| 4 tabs adaptadas: Perfil/Histórico/Conquistas/Conduta (Recomendado) | Fiel ao Dota 2 mapeando ao que temos | ✓ |
| 3 tabs: Perfil/Histórico/Conduta | Tira Conquistas (achievements ainda sem dados reais) | |
| Tab única scroll | Sem tabs, single page | |

**User's choice:** 4 tabs adaptadas
**Notes:** Mantém fidelidade ao Dota 2 e usa AchievementBadge V2.5 que já existem.

---

## Sidebar collapsed state

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Avatar + ícones de ação (Recomendado, ~72px) | Igual Dota 2 real, saldo vira tooltip | ✓ |
| Avatar + nome compacto (~120px) | Identidade visível mas economiza menos | |
| Avatar + nome + saldo (~160px) | Tudo essencial, quase não economiza vs expanded | |

**User's choice:** Avatar + ícones (~72px)
**Notes:** Mais fiel ao Dota 2 client real.

---

## UI de edição do perfil

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Modal in-page com abas (Recomendado, Discord/Dota 2) | <Dialog> primitive V2.5, 4 abas internas | ✓ |
| Rota dedicada /me/editar | Página própria, mais espaço, quebra fluxo Dota 2 | |
| Edição inline (click campo → input) | Sem modal, Notion-style, distinto do Dota 2 | |

**User's choice:** Modal in-page com abas
**Notes:** Fiel ao Dota 2 client + reusa `<Dialog>` primitive V2.5 que já existe.

---

## Default sidebar state (primeira visita)

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Expandida (Recomendado) | Novo user descobre features mais rápido | ✓ |
| Colapsada | Mais espaço pro conteúdo principal | |
| Detectar viewport | <1280px colapsa, ≥1280 expande | |

**User's choice:** Expandida
**Notes:** Descoberta de features prioritária pra novo user.

---

## Tab Histórico — conteúdo

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Embed 10-20 últimas partidas (Recomendado) | <MatchCard> existente, link "Ver tudo → /partidas" | ✓ |
| Stub com link → /partidas | Tab vazia só com card de chamada | |
| Redirect automático | Click navega pra /partidas | |

**User's choice:** Embed das últimas partidas
**Notes:** Mantém user dentro do /me, reusa MatchCard V2.5.

---

## Tab Conduta — conteúdo

| Opção | Descrição | Selected |
|-------|-----------|----------|
| HonorRankMedal XL + breakdown + behavior + link doutrina (Recomendado) | Resume PHILOSOPHY.md visualmente | ✓ |
| Stub com link → /codigo-de-conduta | Tab vazia só com link | |
| Você decide | Confio na sua decisão | |

**User's choice:** HonorRankMedal XL + breakdown completo
**Notes:** Reforça eixo HONOR (PHILOSOPHY.md mandamento) e usa primitives V2.5.

---

## Claude's Discretion

Áreas onde Pedro deixou Claude decidir:
- Avatar upload: tamanho exato min/max, validação MIME server-side
- Heartbeat interval do presence channel
- Margens/spacing exatas do layout 3-col
- Animation transition da sidebar
- Ordem dos 3 heróis favoritos no display
- Comportamento exato quando addressee_id rejeita friendship

## Deferred Ideas

Itens mencionados mas explicitamente fora de escopo Phase 9:
- Chat real-time entre amigos → V2
- Notificações push → V2
- Discord/Steam presence integration → V2/V3
- Sistema de mensagens privadas (DMs) → V2
- Tab Troféus como Battle Pass real → V3
- Tab Ingressos Dota 2 (tournament tickets) → permanentemente fora
- Upload custom de hero portrait → V2 se demanda
- Backgrounds animados (Arcanas animadas) → V3
- Limite máximo de amigos → revisar baseado em dados reais

---

*Phase: 09-perfil-dota-social*
*Discussion log: 2026-05-26*
*Mode: discuss*
