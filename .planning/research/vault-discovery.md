# Vault Discovery — Arquivos formuladota-v2 em segundo-cerebro

**Data:** 2026-05-23
**Vault path:** `C:\Users\ADM\projects\segundo-cerebro`
**Total arquivos identificados:** 25 arquivos com menção explícita a formuladota/Fórmula Dota/etc.
**Arquivos de negócio core analisados:** 14 (os restantes 11 são menções contextuais em notas periféricas)

---

## Sumário pra Pedro (TL;DR)

14 arquivos de negócio diretamente relacionados ao formuladota foram lidos com profundidade. O arquivo principal do vault (`Sistema novo Dota - formuladota v2.md`, 786 linhas, atualizado 2026-05-22) é um snapshot extraordinariamente completo — provavelmente o melhor contexto único pra usar com ChatGPT 5.5. Dos 14 arquivos, **1 está completamente atualizado**, **7 estão outdated mas úteis como histórico** e **6 têm informações valiosas que o projeto não incorporou ainda** (gaps reais). O outdated crítico principal é que o vault registra o projeto com fontes antigas (Cinzel, cyan/purple, limite 3 partidas, AbacatePay como V1 definitivo) antes das mudanças massivas de Design Foundations (V2.5) e do pivô de branding de 2026-05-23.

---

## Arquivos por categoria

### ATUALIZADO (bate com estado atual do projeto em 2026-05-22)

| Path | Tamanho | Resumo |
|------|---------|--------|
| `07 - Negocio/Sistema novo Dota - formuladota v2.md` | 786 linhas, 40KB — atualizado 2026-05-22 | Snapshot completo: TL;DR do produto, historico de commits, modelo de negocio (R$15/ficha), schema DB completo (27 migrations), fluxos do sistema, features implementadas, V2 backlog, 23 pontos abertos pra brainstorm, roadmap 4 semanas. Feito ESPECIFICAMENTE pra alimentar ChatGPT 5.5. Unico arquivo que foi atualizado apos o pivo MVP fichas. |

### OUTDATED CRITICOS (CUIDADO ao usar com ChatGPT!)

| Path | Tamanho | O que está outdated | Realidade atual |
|------|---------|--------------------|-----------------|
| `07 - Negocio/Plataforma antiga formuladota.md` | 66 linhas — criado 2026-04-30 | Hipotese de reconstrucao com stack proposto, checklist "a descobrir". Cita "Next.js 15" como proposta, fontes nao definidas, paleta nao definida, custo estimado "5-10h total". | Plataforma JA foi reconstruida com Next.js 16, 50+ commits, V2.5 Design Foundations completo, 27 migrations, ExitLag-inspired theme, Geist Sans + Teko. |
| `07 - Negocio/Priorizacao das frentes de receita.md` | 143 linhas — criado 2026-04-30 | "Plataforma formuladota (refazer)" como item de R$0 no horizonte, estimativa "5-10h de construcao". Pipeline quente de clientes como prioridade 1. Revalidar em 15/05/2026 (data ja passou). | Plataforma 85% implementada (MVP Fichas). Muitos dos "pipelines quentes" citados (V4 Company, William, Wagner) ja foram processados ou mudaram. |
| `07 - Negocio/Metodologia de ensino Pedro.md` | 104 linhas — criado 2026-04-30 | Cita "Cinzel + Marcellus + Inter (fontes Valve-like)" e menciona "Meta historica FORMULADOTA: formar 200 jogadores Imortal em 2025" como atributo de credencial. | Fonts mudaram radicalmente: agora Geist Sans (principal) + Teko condensed (display). Meta "200 imortal em 2025" nao consta na plataforma atual. |
| `07 - Negocio/Trajetoria profissional - de Dota 2 a IA.md` | 56 linhas — criado 2026-04-30 | "Pedro hoje: R$70 em caixa, dividas R$2.430". Cita formuladota.com como "caiu, pode reativar" — como se nao existisse ainda. | Situacao financeira mudou (provavelmente). Plataforma existe e opera. |
| `10 - Pessoal/Conflitos/Voltar ou nao voltar pro Dota.md` | 288 linhas — criado 2026-04-30 | Registra deliberacao sobre 3 caminhos (A/B/C). Conclusao: "construir MVP essa semana com Claude Code". Lista pre-condicoes pra iniciar: CNPJ aberto, Wagner entregue, etc. | Decisao JA foi executada. Formuladota-v2 foi construido. Note: o arquivo registra a decisao historica — util como contexto da genesis. |
| `07 - Negocio/Vendas de vaga em ranked smurf.md` | 50 linhas — criado 2026-04-30 | Produto historico "conta smurf + R$10/vaga". Alerta: conta smurf pode ter sido banida pela Valve. | Produto substituido pelo modelo atual de PT ranked com conta principal + fichas. Conta smurf nao e mais relevante. |

### UTIL HISTORICO (nao-atualizado mas valioso pra contexto)

| Path | Resumo |
|------|--------|
| `07 - Negocio/Liga do Formula Dota.md` | Produto historico de assinatura (R$120→R$80→R$50/mes), pico 77 assinantes, encerrado nov/2025. Documenta aprendizados: modelo assinatura funcionou mas churn + custo emocional destruiu. Util pra discussao sobre se/como reativar assinatura Mercado Pago (V2 backlog). |
| `07 - Negocio/Sistema vendas vagas em lobby Dota 2.md` | Lobby coaching ao vivo — mecânica unica: lobby personalizado + bot Python automatizado + live no YouTube comentando em tempo real + replay no canal. Pedro desenvolveu bot Python proprio. Pico: parte dos R$10k/mes. Parado. Util pra discussao de V3+ com lobbies in-house e bot Dota integrado. |
| `07 - Negocio/Canal Formula Dota.md` | 14k inscritos dormentes. 3 caminhos possiveis (A: Dota puro / B: ponte Dota+IA / C: pivot IA). Recomenda Caminho B. Util pra discussao de estrategia de aquisicao do formuladota. |
| `07 - Negocio/Formula do MMR - 14 videos.md` | 14 videos JA PUBLICADOS gratuitamente no YouTube em nov/2025 como retribuicao. NAO podem ser revendidos como curso. Podem servir como funil pra formuladota (CTA nos videos). Aula avancada nova PAGA e possivel (conteudo novo). |
| `07 - Negocio/Mentorias particulares 2 pra 1.md` | Mentoria Dota 2:1 (R$200/sessao, 14d, R$400/mes). Unica receita recorrente real de Pedro ate formuladota escalar. Util pra discussao de integracao mentoria 1:1 no formuladota V2. |
| `07 - Negocio/Decisoes/Decisao - sair do Dota novembro 2025.md` | Historia completa do burnout e saida. Compromissos publicos feitos. Licao: "sair foi certo pra saude mental mas incompleto operacionalmente". Contexto essencial pra entender restricoes emocionais do Pedro nas decisoes de produto. |
| `10 - Pessoal/Visao de vida/Visao - Jarvis particular.md` | Jarvis particular: assistente IA pessoal com memoria persistente + acoes + proatividade. Pedro ve formuladota como caso de uso / prova de conceito de que sabe construir SaaS. Desktop Tauri/Rust na visao. Util pra discussao de V3+ desktop launcher. |

### INFO NOVA (ideias no vault que NAO estao no projeto ainda)

| Path | Ideia | Valor |
|------|-------|-------|
| `07 - Negocio/Sistema vendas vagas em lobby Dota 2.md` | **Bot Python de lobby automation** — Pedro JA desenvolveu bot Python que move jogadores automaticamente entre salas no Dota. Codigo pode estar em HD/repo. Seria base tecnica para o sistema de bots (`bots` table) do V2 backlog de lobbies in-house. | Alto — reduz trabalho de desenvolvimento de zero se codigo for recuperavel. |
| `07 - Negocio/Canal Formula Dota.md` | **"Como uso Claude Code pra estudar Dota 2"** — ideia de video experimental que une canal Dota (14k) com conteudo IA. Seria funil duplo: traz audience Dota pro formuladota E posiciona Pedro como dev IA. Nao existe nenhum plano de content marketing no projeto. | Alto — aquisicao organica barata. |
| `07 - Negocio/Metodologia de ensino Pedro.md` | **"Fórmula do Dota de Corrida" como lead magnet PDF** — documento textual ja existe na raiz do projeto. Estruturar em markdown + PDF compartilhavel = lead magnet que captura email antes de entrar na plataforma. Nao implementado. | Medio — complementa funil de conversao. |
| `07 - Negocio/Metodologia de ensino Pedro.md` | **Principios universalizaveis Dota→IA** — tabela de correspondencias ("A culpa nunca e do outro" → "prompt ruim e sua responsabilidade") que poderia virar conteudo editorial na plataforma OU no canal @pedropauloai. Totalmente fora do projeto. | Medio — diferencial narrativo. |
| `07 - Negocio/Formula do MMR - 14 videos.md` | **"Fórmula do MMR — Avancado"** — 14 videos novos, conteudo aprofundado, R$197-397 pago. Nao e repackage (os originais sao gratuitos). Poderia integrar com assinatura mensal do formuladota como beneficio exclusivo de assinantes. | Alto — monetizacao complementar a fichas. |
| `07 - Negocio/Mentorias particulares 2 pra 1.md` | **Oferta combo "Mentoria Dota 2 + Claude Code"** — produto hibrido pra quem joga Dota e quer entrar em IA. Zero implementado no formuladota. Poderia ser modal de upsell pos-PT realizada. | Baixo-Medio — nicho muito especifico mas diferencial. |

---

## Recomendacao de uso com ChatGPT 5.5

### Arquivos a USAR (atualizados ou historicos valiosos)

- `07 - Negocio/Sistema novo Dota - formuladota v2.md` — **USAR COMO CONTEXTO BASE**. E o arquivo mais completo, feito especificamente pro brainstorm com ChatGPT. Cola inteiro como contexto inicial.
- `07 - Negocio/Liga do Formula Dota.md` — util pra discussao sobre se/quando reativar assinatura Mercado Pago (V2 backlog) e quais armadilhas evitar (churn, custo emocional).
- `07 - Negocio/Sistema vendas vagas em lobby Dota 2.md` — util pra discussao de V3+ lobbies in-house + bot Python + live YouTube como diferencial.
- `07 - Negocio/Canal Formula Dota.md` — util pra discussao de estrategia de aquisicao de usuarios via canal dormente.
- `10 - Pessoal/Conflitos/Voltar ou nao voltar pro Dota.md` — util como contexto dos limites emocionais e operacionais do Pedro (restricoes que moldam decisoes de produto).

### Arquivos a EVITAR (outdated criticos)

- `07 - Negocio/Plataforma antiga formuladota.md` — informacoes de antes da construcao. Vai confundir o ChatGPT com hipoteses que ja foram realizadas.
- `07 - Negocio/Priorizacao das frentes de receita.md` — dados de 2026-04-30, muito superados. Pipeline de clientes, estimativas de tempo e receita nao refletem realidade de 2026-05-23.
- `07 - Negocio/Trajetoria profissional - de Dota 2 a IA.md` — snapshot financeiro antigo (R$70 em caixa) pode criar contexto errado sobre situacao atual.

### Combos recomendados pra brainstorm especifico

- **Discussao Bot/Lobbies V3+**: usar `Sistema vendas vagas em lobby Dota 2.md` + `.planning/research/ixdl-lessons.md` (no projeto, 558 linhas) + `Sistema novo Dota - formuladota v2.md` secao "V2 backlog → Lobbies in-house"
- **Discussao monetizacao / assinatura vs fichas**: usar `Liga do Formula Dota.md` (licoes historicas) + `Sistema novo Dota - formuladota v2.md` secao "Pontos abertos pra brainstorm → #4 Mensalidade R$47 quando reativar"
- **Discussao aquisicao de usuarios / marketing**: usar `Canal Formula Dota.md` + `Formula do MMR - 14 videos.md` + `Sistema novo Dota - formuladota v2.md` secao "#6 Estrategia de aquisicao inicial"
- **Discussao design/branding V2.5**: usar APENAS arquivos do projeto (`.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`) — o vault NAO tem documentacao do design atual ExitLag-inspired
- **Discussao V3+ desktop launcher Tauri**: usar `Visao - Jarvis particular.md` + `Sistema novo Dota - formuladota v2.md` + `.planning/research/ixdl-lessons.md`
- **Contexto historico/emocional do Pedro**: usar `Decisao - sair do Dota novembro 2025.md` + `Voltar ou nao voltar pro Dota.md` — essencial pra ChatGPT entender restricoes reais de burnout/energia

---

## Gaps identificados (oportunidades de iteracao)

1. **Bot Python de lobby** — Pedro ja desenvolveu um bot Python que automatizava lobbies Dota. O vault indica que o codigo pode estar "em algum HD/repo". Recuperar esse codigo seria base tecnica para o sistema de bots in-house do V2 backlog, potencialmente economizando semanas de desenvolvimento. Pedro sabe onde esta o codigo?

2. **Funil de aquisicao via canal dormente** — O formuladota nao tem nenhuma estrategia de content marketing documentada. O vault sugere: 1 video "Como uso Claude Code pra estudar Dota 2" poderia reativar os 14k inscritos como funil duplo. Nenhuma referencia a isso existe no projeto.

3. **Lead magnet PDF "Fórmula do Dota de Corrida"** — documento `.txt` ja existe na raiz do projeto mas nunca foi transformado em PDF estruturado + landing de captura de email. O vault cita isso como oportunidade. Seria captacao de contato antes de compra.

4. **"Fórmula do MMR Avançado" como produto de assinatura** — 14 videos novos (nao repackage dos gratuitos) que poderiam ser beneficio exclusivo de assinantes mensais Mercado Pago. Une o backlog de assinatura com producao de conteudo. Nao consta nos planos do projeto.

5. **Principios universalizaveis Dota→IA como editorial** — tabela de correspondencias existe no vault mas nao foi usada em nenhum texto da plataforma. Poderia aparecer na pagina /codigo-de-conduta ou /metodologia como diferenciais narrativos.

6. **Perfis publicos com historico de PTs** — o vault cita (em "Pontos abertos #9") que `/me` ou `/perfil` precisa mostrar PTs jogadas, KDA, evolucao MMR. Nao implementado. O ChatGPT pode ajudar a desenhar essa feature.

7. **Replay disponivel pos-PT** — `matches.notas_pedro` ja existe no schema. UI nao construida. Diferencial competitivo vs mercado de boost "anonimo": aluno pode reassistir + ler nota do PRO. Nao consta nas phases futuras do projeto.

8. **Comissao de outros PROs (decisao aberta)** — schema tem `coaches.comissao_pct` (30% default) mas a logica de payout, frequencia e como tratar reembolsos nunca foi decidida. ChatGPT pode ajudar a modelar isso antes de Pedro abrir pra novos PROs.

9. **Bot Discord adaptado ao modelo de fichas** — pasta `bot/` existe mas codigo nao foi testado contra o modelo MVP. Webhook Discord pra avisar "Pedro abriu fila" ou "te selecionaram pra PT" seria mudanca de UX critica. O vault aponta isso como urgente mas nao esta em nenhuma phase futura documentada.

10. **Webhook AbacatePay PIX como bloqueador de lancamento** — o vault identifica explicitamente: "BLOQUEADOR pra lancamento. Hoje admin pode dar ficha gratis via /admin/users mas cliente real nao consegue comprar." (ponto #13 dos 23 abertos). Verificar se isso ja foi resolvido na branch atual.

---

## Conflitos identificados (precisam decisao)

1. **Branding: vault usa "Pedro Paulo" como identidade visivel** — multiplos arquivos do vault referem "Pedro Paulo / PPA / Peter PPA" como identidade de ensino e credencial. O projeto V2.5 implementou regra B6 (remover Pedro Paulo como brand visivel da plataforma). Ha tensao: o vault sugere usar o nome como credencial de marketing ("7000 MMR Immortal Pedro Paulo"), o projeto esconde isso. Pedro precisa reconciliar.

2. **Tema visual: vault nao tem documentacao do design ExitLag** — o vault foi escrito antes do Milestone V2.5 Design Foundations. Nenhum arquivo menciona a paleta `#0B0C0F` + `#C42121`, nem Geist Sans, nem Teko condensed. Se Pedro usar arquivos do vault com ChatGPT pra discussao de branding/UI sem esse aviso, o modelo vai operar com paleta cyberpunk antiga (cyan/purple). Avisar explicitamente antes de qualquer discussao de design.

3. **Mensalidade Mercado Pago: vault tem preco R$47, projeto tem logica diferente** — o vault lista "R$47/mes" como preco de mensalidade. O projeto tem tabela `subscriptions` mas sem decisao de preco ou modelo final. O vault sugere "8 fichas/mes + beneficios" como combinacao. Precisa decisao antes de implementar.

4. **Pricing fichas: vault diz R$15, projeto atual pode ter mudado** — o arquivo principal do vault diz R$15/ficha e faz analise de mercado comparando com boost ~R$10. Se Pedro mudou o preco desde 2026-05-22, o vault esta desatualizado nesse ponto.

5. **Limite de partidas/dia: vault nao tem, CLAUDE.md original tinha** — o `CLAUDE.md` original do projeto tinha "limite hardcoded: maximo 3 partidas/dia agendaveis (protecao saude mental)". O vault nao menciona isso. O projeto atual tambem removeu esse limite. O ChatGPT pode perguntar sobre isso — resposta: foi removido no pivô de 2026-05-01.

---

## Notas tecnicas sobre o vault

- **Estrutura**: `01 - Daily / 02 - Clientes / 03 - Prompts / 04 - Templates / 05 - Padroes / 06 - Pesquisas / 07 - Negocio / 08 - Conhecimento / 10 - Pessoal`
- **Arquivo principal do formuladota** fica em `07 - Negocio/Sistema novo Dota - formuladota v2.md`
- **Data mais recente** de modificacao de arquivo relacionado ao formuladota: 2026-05-22 (arquivo principal)
- **Vault NAO tem**: nenhum arquivo sobre GamersClub patterns, ExitLag paleta, IxDL research, V2.5 Design Foundations, Steam OAuth, Multi-coach, badges Dota Liquipedia, ou qualquer conteudo dos Milestones pos-2026-05-22. Todo esse contexto esta apenas nos arquivos do projeto (`/.planning/research/`).

*Gerado por Claude Code em 2026-05-23. Nao modifica nenhum arquivo do vault — so leitura.*
