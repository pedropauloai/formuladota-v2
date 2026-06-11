# DOTA 2 CLIENT REFERENCE

> **Status:** Documento fundacional V2.5
> **Criado:** 2026-05-24 (após reformulação M2 em UX_PRINCIPLES.md)
> **Propósito:** Catalogar imagens de referência canônica do client Dota 2 real, contra as quais toda decisão de UI da plataforma FORMULADOTA deve ser validada.

---

## Por que este documento existe

Em 2026-05-24, durante reformulação do mandamento M2 (UX_PRINCIPLES.md), ficou claro
que o termo "Dota 2 client" em decisões anteriores foi interpretado de **duas formas
opostas** ao longo das Waves de desenvolvimento:

1. **Interpretação errada (Wave 7-8):** "client de jogo moderno minimalista" — usado
   na prática como sinônimo de Riot Client / Valorant menu (sem sidebar, top-bar +
   viewport fullscreen). Resultou em `src/components/templates/client-shell.tsx`
   (Sistema B, agora `@deprecated`).
2. **Interpretação correta (confirmada por Pedro 2026-05-24):** o **Dota 2 client REAL**
   com 3 colunas (sidebar identidade+amigos esquerda + top-bar central + sidebar
   matchmaking contextual direita + bottom-bar com [JOGAR DOTA] verde).

Este doc fixa a **interpretação correta** como referência única, eliminando ambiguidade
futura. Toda nova interface da plataforma é validada contra este catálogo.

---

## Escopo deste documento (hierarquia definida por Pedro 2026-06-11)

Este catálogo é lei sobre **ESTRUTURA, LAYOUT e DENSIDADE**: colunas, sidebars,
bottom-bar, modos da sidebar direita, posição e peso dos CTAs, densidade de listas.

Este catálogo **NÃO é lei sobre cores, materiais e tipografia** — a PELE da plataforma
é a identidade FormulaDota (vermelho ExitLag, verde GamersClub, neutros ExitLag,
Ubuntu+Teko, dourado pra números), definida em `src/styles/tokens/`. Replicar a
estrutura do Dota 2 com a pele FormulaDota é o objetivo; copiar a paleta marrom da
Valve NÃO é.

**Gap conhecido deste doc:** ele cataloga estrutura mas ainda não tem a seção
"Medidas de densidade" (alturas de linha da friends list, tamanhos de fonte da nav,
paddings dos painéis, amostrados das imagens). Adicionar na Fase 1 do plano visual —
sem essas medidas, agentes copiam a estrutura e inventam a escala.

---

## Inventário canônico — 9 imagens

As imagens estão atualmente na raiz do projeto (`./`). Migração para
`docs/foundations/dota2-reference/` é decisão pendente (envolveria atualizar referências
em [[feedback-dota2-client-canonical]], `src/components/client-shell/shell.tsx` e
`UX_PRINCIPLES.md`).

### 1. `dota 2 menu.png` — Main Menu Canônico

- **Tamanho:** 4.6 MB
- **Captura:** 2026-05-04
- **Mostra:** Tela principal do Dota 2 v7.37 com 3 colunas + bottom-bar.
- **Sidebar esquerda:** avatar circular + medalha Imortal + nick "only mid (ACR1)" +
  busca de amigos + lista categorizada (NO DOTA 5 / MEMBROS DO CLA / FAVORITOS /
  EM LINHA 18) com avatares pequenos.
- **Centro top:** tabs HERÓIS / ARSENAL / ASSISTIR / APRENDER / SALÃO DE JOGOS.
- **Centro:** hero portrait do evento ativo (QUIOSQUE DO QUARTERO) com personagens
  destacados + medalha de progresso "32".
- **Sidebar direita:** ausente nesta tela (estado idle pré-matchmaking).
- **Bottom:** notificações esquerda + "Para [ACME Corp.]" + servidor + idioma +
  setting + **[JOGAR DOTA] verde grande direita**.
- **Quando referenciar:** estrutura 3-col base + bottom-bar com CTA verde + top tabs.

### 2. `dashboard-current.png` — FormulaDota /dashboard Fiel

- **Tamanho:** 763 KB
- **Captura:** 2026-05-21
- **Mostra:** Estado atual de `/dashboard` da plataforma FORMULADOTA.
- **Estrutura:** **estruturalmente idêntica** ao Dota 2 menu (#1) — sidebar esquerda
  com avatar/medalha/amigos + centro hero (TEMPORADA I — GENESIS) + tabs PROGRESSO /
  RANKING / TIMES / TORNEIOS / CONDUTA + [JOGAR DOTA] verde bottom direito.
- **Significado:** evidência de que o Sistema A (`src/components/client-shell/shell.tsx`)
  implementou a **estrutura macro** da referência (3 colunas + bottom CTA).
- **CORREÇÃO 2026-06-11:** a alegação anterior de que esta captura era "estruturalmente
  idêntica / baseline de fidelidade" estava INFLADA — auditoria visual mostrou
  divergências fortes de densidade (linhas e fontes maiores que o client), materiais
  (glassmorphism vs painéis opacos) e elementos faltantes (coluna esquerda persistente
  foi removida em 26/05; bottom-bar virou botão flutuante em vez de faixa). Usar esta
  imagem como registro histórico do progresso, NÃO como baseline aprovado.
- **Quando referenciar:** prova de viabilidade da arquitetura 3-col na nossa stack.

### 3. `menu lateral - competitiva.png` — Sidebar Direita: Matchmaking Idle + Competitivo

- **Tamanho:** 2.8 MB
- **Captura:** 2026-05-04
- **Mostra:** Mesma tela do #1 com **sidebar direita ATIVADA** após user clicar na
  área matchmaking.
- **Sidebar direita modos demonstrados:**
  - **Modo `matchmaking-idle`** (lista de modalidades): COPA DE BATALHAS / SALAS
    PERSONALIZADAS / JOGAR CONTRA BOTS / COMPETITIVA (selecionada).
  - **Modo `competitivo`** (sub-opções de COMPETITIVA): BUSCA POR FUNÇÕES /
    CLÁSSICO / ANCESTRAL.
- **CTA fundo:** **[BUSCAR PARTIDA] verde** grande no rodapé da sidebar direita.
- **Centro:** background hero (QUIOSQUE DO QUARTERO) fica dimmed/embaçado quando
  sidebar direita está ativa.
- **Quando referenciar:** implementar modos 1 e 2 da sidebar direita stateful (task #52).

### 4. `menu lateral - salas personalizadas.png` — Sidebar Direita: Salas Personalizadas

- **Tamanho:** 2.5 MB
- **Captura:** 2026-05-04
- **Mostra:** Sidebar direita com SALAS PERSONALIZADAS selecionado em vez de COMPETITIVA.
- **Sidebar direita modo `salas-personalizadas`:** sub-opções **[+ CRIAR]** e **[• NAVEGAR]**.
- **CTA fundo:** botão ainda presente mas pode estar desabilitado até user escolher
  CRIAR ou NAVEGAR.
- **Quando referenciar:** implementar modo 3 da sidebar direita stateful (task #52).
  Clicar CRIAR dispara modal #6 abaixo. Clicar NAVEGAR muda pro modo #5 abaixo.

### 5. `find por role.png` — Sidebar Direita: Busca por Funções + Dialog Central

- **Tamanho:** 2.3 MB
- **Captura:** 2026-05-04
- **Mostra:** Modo BUSCA POR FUNÇÕES ativo na sidebar direita + dialog central
  explicativo.
- **Sidebar direita modo `busca-por-funcoes`:** checkboxes verticais com funções
  (Suporte dedicado / Suporte / Trilha intermediária / Trilha do meio / Trilha segura).
- **Centro:** dialog grande "BUSCA COM FUNÇÃO" — contador "10 PARTIDAS COM FUNÇÃO
  RESTANTES" + barra de progresso + ícone hexágono "DESEMPENHO EM FUNÇÕES COMPETITIVAS".
- **CTA fundo:** **[BUSCAR PARTIDA] verde** continua presente.
- **Quando referenciar:** implementar modo 4 da sidebar direita stateful + dialog
  central com contexto educativo (task #52).

### 6. `configuração lobby.png` — Modal Fullscreen: Configurações da Sala

- **Tamanho:** 543 KB
- **Captura:** 2026-05-04
- **Mostra:** Modal fullscreen "CONFIGURAÇÕES DA SALA" disparado ao clicar CRIAR em
  sidebar mode salas-personalizadas (#4).
- **Modal:** toma quase 100% do viewport com dimmer + chrome do client (sidebar
  esquerda + top tabs) visível por trás.
- **Campos topo:** NOME DA PARTIDA / MODO (ESCOLHA LIVRE COMPETITIV...) / SENHA DA
  SALA / LOCALIZAÇÃO DO SERVIDOR / VISIBILIDADE DA SALA + checkboxes (ATIVAR TRAPAÇAS
  / SELEÇÃO IMORTAL / Ocultar caracteres).
- **CONFIGURAÇÕES AVANÇADAS** expansível: 3 colunas (COMPETITIVO + REGRAS DE JOGO +
  CONFIG. DE BOTS).
- **Botões bottom:** **[CRIAR SALA]** (desabilitado, cinza) + **[CANCELAR]**.
- **Quando referenciar:** implementar modal fullscreen CRIAR SALA (task #56).

### 7. `lobby criado.png` — Sidebar Direita: Lobby Ativo + Centro Chat

- **Tamanho:** 2.0 MB
- **Captura:** 2026-05-04
- **Mostra:** View após criar sala — centro vira chat + sidebar direita vira painel
  de lobby.
- **Centro esquerda:** chat ativo (Grupo OVERVIEW 1.0, ACME Corp, Sala +).
- **Centro direita:** CONFIGURAÇÕES DA SALA mostradas inline (MODO / BOTS / PAUSAS /
  ESPECTADORES / SERVIDOR / TRANCADA / VISIBILIDADE / Senha) + [EDITAR].
- **Sidebar direita modo `lobby-ativo`:**
  - Nome do lobby ("dsasa") + "Líder: only mid".
  - 2 colunas de times: **"Os Iluminados"** / **"Os Temidos"** — 5 slots cada
    (only mid já na primeira coluna, ENTRAR / VAZIO nos outros).
  - INSTRUTORES (vazio) + INSTRUTORES (vazio).
  - Botões: [EQUILIBRAR EQUIPES] + [TROCAR EQUIPES].
  - JOGADORES DE FORA / Canais de narração.
  - **CTA fundo: [SAIR DA SALA] + [INICIAR PARTIDA] VERMELHO** (não verde!).
- **Quando referenciar:** implementar modo 6 da sidebar direita stateful + transformação
  do centro pra chat (task #52). **Atenção:** este é o único modo onde CTA muda de
  verde pra **vermelho** — indica que ação não é "buscar" mas sim "começar" (estado
  comprometido).

### 8. `lobbys criados.png` — Sidebar Direita: Navegar Salas

- **Tamanho:** 2.2 MB
- **Captura:** 2026-05-04
- **Mostra:** Modo NAVEGAR ativo na sidebar direita.
- **Centro:** background hero (QUIOSQUE DO QUARTERO) persiste, sem dimmer (centro
  fica disponível pra navegação visual).
- **Sidebar direita modo `salas-navegar`:**
  - Título "SALAS DE DOTA" + [ATUALIZAR].
  - Tabela: NOME DA SALA / VAGAS / MODO DE JOGO / REGIÃO (ex: "II.Professional 14 |
    0/10 | Escolha Livre | Brasil").
  - **FILTRAR SALAS:** REGIÃO (Brasil) / MODO DE JOGO (Todos os modos) / NOME DA
    SALA (busca).
  - Botões: [BUSCAR] + [CRIAR SALA] + [ENTRAR NA SALA] (desabilitado até selecionar).
- **Quando referenciar:** implementar modo 5 da sidebar direita stateful (task #52).
  [CRIAR SALA] aqui dispara modal #6.

### 9. `dota2-hero-section.png` — Site Dota 2 Hero (referência marketing)

- **Tamanho:** 1.1 MB
- **Captura:** 2026-05-02
- **Mostra:** Hero section do site dota2.com (não do client).
- **Quando referenciar:** apenas pra inspiração da landing FORMULADOTA quando precisar
  espelhar pesos visuais de marketing oficial Valve. **Não confundir com client UI**.

---

## Régua de validação — toda decisão de UI dota-client

Antes de implementar qualquer elemento de UI que envolva navegação, sidebar, bottom-bar
ou comportamento de "client", aplique esta sequência:

1. **Localizar referência neste catálogo.** Se elemento similar não existe em
   nenhuma das 8 imagens (#1 a #8), questione: é diferencial intencional ou erro?
2. **Documentar referência usada no PR/commit.** Ex: "Sidebar direita modo
   lobby-ativo segue ref `lobby criado.png` (#7) — CTA vermelho [INICIAR PARTIDA]".
3. **Validar em PR review.** Se sub-componente UI diverge da referência, comentar:
   "diverge de #N — qual o motivo?".

Anti-pattern: implementar UI dota-client baseado em memória, screenshots externos
não-catalogados, ou referências verbais sem checar este catálogo primeiro.

---

## Conexões com outros docs fundacionais

- **[[UX_PRINCIPLES]] M2** ("Navigation 3-col Dota 2 Client Style") — referencia
  este catálogo na seção "Histórico — Reformulação 2026-05-24".
- **`src/components/client-shell/shell.tsx`** (Sistema A canônico) — referencia
  imagens #1, #2, #3, #4 no JSDoc.
- **Memória `feedback_dota2_client_canonical.md`** — referencia este catálogo como
  fonte autoritativa visual.

---

## Decisões pendentes

- [ ] **Migrar 9 imagens da raiz para `docs/foundations/dota2-reference/`?** Vantagem:
  organização. Desvantagem: precisa atualizar referências em UX_PRINCIPLES.md, shell.tsx,
  memory file. Decisão Pedro.
- [ ] **Renomear pra kebab-case?** Ex: `dota 2 menu.png` → `01-main-menu.png`. Vantagem:
  paths sem espaços (melhor em CI/scripts). Desvantagem: mesma — atualizar referências.
- [ ] **Adicionar diagramas ASCII** complementares pra cada modo da sidebar direita?
  Útil pra leitura cega (acessibilidade) e contexto sem abrir as imagens. Pode ser
  task separada.
