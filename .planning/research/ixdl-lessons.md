# IxDL Research — Lessons para FormulaDota

> Documento de pesquisa profunda sobre IxDL (Inhouse Dota League) e o ecossistema de inhouse leagues Dota 2.
> Propósito: extrair lessons learned aplicáveis ao FormulaDota V2/V3+.
> Data da pesquisa: 2026-05-23.

---

## 1. Contexto histórico — ixmike88

**Identidade**: Michael "ixmike88" Ghannam, nascido em 7 de junho de 1991, americano (EUA).

**Carreira profissional**: jogador de suporte/capitão com carreira ativa de ~2011 a 2022. Passou por quase 30 times diferentes ao longo da carreira. Times de maior notoriedade: Team Liquid, compLexity Gaming, beastcoast, TEAM TEAM. Conquistou ~USD 53.000 em prize money ao longo de 100+ torneios. Destaque de carreira: 7º-8º lugar no The International 3 (2013) com Team Liquid.

**Status atual (2026)**: inativo como jogador profissional desde 2022. Twitch: twitch.tv/ixmike88 (canal existente, atividade intermitente).

**Origem das inhouse leagues**: ixmike88 descreve a si mesmo como um "inhouse junkie" — jogador obcecado com jogos internos de alta competitividade. Sua primeira experiência com inhouses foi em DotA 1, onde descobriu o "IHL" (Inhouse League) criado por **Ucross**, que o impressionou pelo conceito de "todo mundo levando o jogo mais a sério, sem leavers". Em 2009, começou a programar sistemas de league para Warcraft III usando o **Stealth Bot**, com ajuda do amigo Whd.Mark. Sem esse aprendizado inicial, IXDL e NEL provavelmente nunca existiriam.

**Fontes**:
- [GosuGamers — ixmike88 interview "State of NA Dota"](https://www.gosugamers.net/dota2/features/40615-the-state-of-na-dota-an-ixmike88-interview)
- [Liquipedia — ixmike88 profile](https://liquipedia.net/dota2/Ixmike88)
- [Esports Charts — ixmike88](https://escharts.com/players/ixmike88)

---

## 2. IxDL: o que era, escala, lifecycle

### 2.1 IXDL — Inhouse Dota 2 League

**O que era**: plataforma independente de inhouse league para Dota 2, criada por ixmike88. Oferecia um cliente desktop standalone que substituía o sistema arcaico de IRC usado pelas leagues anteriores. Não era vinculada a nenhuma empresa de esports — começou como projeto pessoal.

**Lançamento**: meados/final de 2013, pós-TI3. O momento não foi coincidência: TI3 gerou um pico de interesse no Dota 2 competitivo e o matchmaking ranqueado ainda não existia (Valve lançou ranked em novembro de 2013). IXDL preencheu um vácuo real.

**Regiões cobertas**:
- North America (principal)
- Europe
- Southeast Asia (SEA) — lançada em maio de 2013
- Australia

**Estrutura de divisões**:
- **IXDL-Open**: série de leagues abertas regionais, qualquer jogador qualificado podia entrar
- **IXDL-Invite**: league fechada por convite, para os melhores jogadores de cada região
- **Top League** (SEA): top 20 jogadores do ranking recebiam convite para liga exclusiva fechada

**Escala**: dados públicos de escala são limitados. A liga SEA em 2013 reportava aproximadamente 20+ jogadores ativos simultaneamente como baseline inicial. A liga NA cresceu significativamente após TI3. Estimativas de comunidade apontam para centenas de jogadores registrados em seu pico, mas sem números oficiais confirmados.

**Modelo de negócio**: gratuito para jogadores. ixmike88 operava com custos de servidor pagos do próprio bolso e/ou através de doações da comunidade. A plataforma também permitia que qualquer pessoa hospedasse sua própria league por uma mensalidade fixa — modelo de SaaS primitivo.

### 2.2 NEL — NADota Elite League

**O que era**: league separada, co-criada por ixmike88 e NEODota, focada exclusivamente no NA. Mais elitista que IXDL-Open — pool fechado de jogadores escolhidos a dedo.

**Lançamento**: setembro de 2013. Aaron Stern entrou para gerenciar marketing, casters e produção.

**Impacto comprovado**: NEL foi diretamente responsável pelo desenvolvimento de alguns dos maiores nomes do Dota 2 NA. Jogadores como **Arteezy**, **EternalEnvy (Envy)**, **Zai**, **Cr1t-**, **MoonMeander** fizeram seus nomes através da NEL. Arteezy e EternalEnvy se conheceram dentro da NEL — a equipe Kaipi foi formada apenas semanas depois desse encontro.

### 2.3 Timeline e fim

| Período | Evento |
|---------|--------|
| 2009 | ixmike88 aprende a programar league bots em WC3 |
| 2013 (mai) | IXDL SEA lançada |
| 2013 (set) | IXDL NA ativa + NEL lançada pós-TI3 |
| 2013 (nov) | Valve lança ranked matchmaking (começa a competir) |
| 2015 | IXDL e NEL migram para FACEIT — ixmike88 cita "volume de trabalho avassalador" |
| 2016 (jun) | FACEIT lança FPL-NA, oficialmente substituindo NEL |
| 2022 (jan) | Revival: IXDL 2022 rodou por 2 semanas (1-14 jan), ~50 players NA pros, sem prize pool, sem patrocinador — pura nostalgia competitiva |

**Por que IXDL parou (causas detalhadas em seção 6)**: combinação de burnout do criador, competição do ranked matchmaking da Valve, e absorção pelo FACEIT (empresa com recursos superiores).

**Fontes**:
- [GosuGamers — NEL announcement](https://www.gosugamers.net/dota2/news/25278-neodota-presents-the-nadota-elite-league)
- [GosuGamers — FPL replaces NEL](https://www.gosugamers.net/dota2/news/31100-fpl-expands-to-north-america-replaces-nel)
- [AFK Gaming — IXDL 2022 revival](https://afkgaming.com/dota2/news/top-na-dota-2-pros-to-compete-in-a-two-week-in-house-league)
- [DotaSource — Liquid ixmike88's Inhouse League](https://dotasource.de/thread/31060-liquid-ixmike88-s-inhouse-league/)

---

## 3. Arquitetura técnica (relevante pro Tauri V3+)

### 3.1 Bot Steam + lobby creation

**Problema original**: inhouse leagues pre-2013 dependiam de IRC para coordenar. Jogadores precisavam de cliente IRC separado, conhecer comandos, esperar hosts manuais. Era fricção altíssima.

**Solução IXDL**: cliente desktop standalone (Windows app) que:
1. Fazia login com conta do fórum IXDL
2. Mostrava lista de jogos pendentes em tempo real
3. Permitia iniciar jogo com `.sg` (start game) ou entrar com `.sign`
4. Quando 10 jogadores confirmavam, o host digitava `.confirm`
5. A senha do lobby era gerada aleatoriamente e exibida no chat da league
6. Jogador digitava `.password` para recuperar a senha

**Integração Steam**: o cliente IXDL se integrava com o Steam para verificar identidade. O jogador iniciava o Dota 2 pelo Steam normalmente, e a senha aleatória era o mecanismo de acesso ao lobby correto. Não havia bot automático criando lobbies — o **host era um jogador humano** que criava o lobby manualmente com as configurações padrão da league.

**Evolução moderna — node-dota2 / Steam GC**:

O ecossistema open source evoluiu para bots automatizados. A biblioteca `node-dota2` (Node.js, arquivada em 2022) e seu sucessor `go-dota2` (Go lang) permitem:

```
Bot Steam Account → Steam Client → Game Coordinator (GC)
         ↓
createPracticeLobby(options):
  - game_name: string
  - pass_key: string (password)
  - server_region: ServerRegion
  - game_mode: DOTA_GameMode.CM (Captain's Mode)
  - allow_cheats: false
  - fill_with_bots: false
```

Fluxo completo dos bots modernos (ex: `devilesk/dota-ihl-bot`, `Dota2LobbyBot`):

1. Jogador entra na fila via Discord (`!queue`)
2. Quando 10 players na fila, bot dispara criação de lobby via GC
3. Bot invita cada Steam ID dos 10 jogadores para o lobby
4. Jogadores aceitam o convite in-game (popup aparece automaticamente)
5. Bot rastreia qual slot cada jogador ocupa
6. Lobby avança por estados: `criação → preenchimento → draft → ativo`

**FACEIT usa o mesmo mecanismo**: quando uma partida é criada, cada servidor recebe whitelist de Steam IDs permitidos. Bot FACEIT envia convite de lobby via GC; ao abrir o Dota 2 aparece o popup de convite.

**Implicação crítica para FormulaDota V3+**: o bot Steam precisa de uma conta Steam dedicada (não usar conta pessoal). A conexão é via `node-steam` ou `go-dota2`. O GC pode ser instável e requer lógica de reconexão com exponential backoff. A biblioteca `node-dota2` está arquivada — a alternativa ativa é `paralin/go-dota2`.

**Fontes**:
- [GitHub — devilesk/dota-ihl-bot](https://github.com/devilesk/dota-ihl-bot)
- [GitHub — Arcana/node-dota2](https://github.com/Arcana/node-dota2)
- [GitHub — sushkov/Dota2LobbyBot](https://github.com/sushkov/Dota2LobbyBot)
- [GitHub — ErkoKnoll/Dota2SentinelBot](https://github.com/ErkoKnoll/Dota2SentinelBot)
- [dota2 Python docs](https://dota2.readthedocs.io/en/stable/dota2.features.lobby.html)
- [FACEIT — How to connect to Dota 2 match](https://support.faceit.com/hc/en-us/articles/207569569)

### 3.2 Matchmaking algorithm

**IXDL original**: rating público separado por região. Algoritmo ELO modificado: +40/-40 pontos quando equipes têm ratings similares. Ajustes para disparidade de força entre times, win streaks, e outras variáveis (detalhes exatos não publicados).

**Equilíbrio de times**: IXDL balanceava times para "minimizar a diferença de rating entre Radiant e Dire". Algoritmo de balanceamento buscava combinações de 5v5 dentro do pool de 10 jogadores que minimizassem a variância de rating total entre os lados.

**Implementações open source modernas**:

| Projeto | Rating System | Balanceamento |
|---------|--------------|---------------|
| devilesk/dota-ihl-bot | ELO interno + badge rank OpenDota | FIFO (sem skill-based) |
| belmegatron/OneHead | Híbrido: MMR Dota + IHL performance | Automático por rating |
| UncleVasya/Dota2-EU-Ladder | Sistema próprio | Team balancer com role preference |

**Sistema atual Dota 2 (referência)**: Valve migrou de ELO para Glicko em abril de 2023 (patch 7.33). Glicko adiciona "Rank Confidence" — jogadores com menos partidas têm variância maior. Para uma inhouse league, Glicko é mais correto que ELO puro porque lida melhor com players que jogam irregularmente.

**Recomendação para FormulaDota**: usar TrueSkill 2 (Microsoft, open source) ou Glicko-2 para o sistema de rating interno. TrueSkill funciona melhor para team-based games e suporta draws. Alternativa simples e eficaz: usar o MMR público do Dota como seed inicial e ajustar pelo desempenho interno.

### 3.3 Captain's Pick / Draft system

**IXDL**: usava Captain's Mode (CM) por padrão em torneio — "modo padrão: Captains Mode (CM) em versão torneio, independente do modo selecionado". CM era a escolha óbvia para simular ambiente competitivo.

**Como CM funciona no Dota 2**:
- Cada time tem um capitão
- Alternância de bans (3 bans iniciais por side, mais 2 bans após picks iniciais)
- Alternância de picks (1-2-2-2-1 pattern)
- Pool de heróis: todos disponíveis no meta

**FACEIT/FPL**: captão selecionado por sistema de prioridade:
1. Membership status (premium players primeiro)
2. Se empate, maior ELO decide
- Capitão não pode "abusar" das picks/bans — reportável

**Player Draft (alternativa ao CM)**:
- 2 capitães selecionados automaticamente (maior rating)
- Capitães se alternam escolhendo jogadores do pool de 8 restantes
- Mais adequado para grupos mistos de habilidade (formato mais frequente em inhouses casuais)

**Implicação FormulaDota**: para sessões com Pedro Paulo como professor, o formato **Player Draft** faz mais sentido — Pedro seria sempre um dos capitães (ou capitão fixo) escolhendo times balanceados. Captain's Mode no draft de heróis pode ser opcional (pro vs casual).

### 3.4 Steam integration

**Camadas de integração necessárias**:

```
1. Steam OpenID / OAuth
   → Autenticação do usuário (login via Steam)
   → Obtém SteamID64 confiável
   → Não requer permissões especiais

2. Steam Web API (api.steampowered.com)
   → GetMatchDetails: estatísticas pós-jogo por Match ID
   → GetPlayerSummaries: perfil público do jogador
   → Requer: STEAM_API_KEY (gratuita)

3. Steam Game Coordinator (Dota 2 GC)
   → Criação de lobbies
   → Convite de jogadores
   → Configuração de game mode/region
   → Requer: conta Steam separada + node-dota2 ou go-dota2
   → ATENÇÃO: conexão frágil, requer reconexão automática

4. OpenDota API (opendota.com)
   → Histórico de matches públicos
   → Estatísticas de heróis
   → Badge/rank do jogador
   → Gratuito sem API key (com rate limit)
```

**Multi-account detection**: IXDL implementava detecção de múltiplas contas para impedir que jogadores banidos criassem novo cadastro e voltassem. O Sentinel Bot (Dota2SentinelBot) implementa lógica similar: restrições para "new players" porque "uma vez banido, criar novo usuário é fácil".

### 3.5 Anti-cheat / behavior

**Problemas documentados em inhouse leagues**:
- **Leavers**: sair do jogo a qualquer momento (sem sistema automático de detecção como o da Valve)
- **Smurfs**: jogadores de alta habilidade usando contas alternativas para jogar contra oponentes mais fracos
- **Multi-account**: contornar bans criando nova conta
- **Griefing**: jogar propositalmente mal dentro do lobby
- **Draft abuse**: capitão fazendo picks ruins intencionalmente (reportável no FACEIT)
- **No-show**: entrar na fila, confirmar, e não aparecer no lobby

**Soluções implementadas historicamente**:

| Problema | Solução IXDL/Moderno |
|----------|---------------------|
| Leavers | Ban automático global (Sentinel Bot) — kick imediato do lobby + ban de todas as lobbies do bot |
| Multi-account | Detecção por SteamID + restrição de contas novas |
| Smurfs | Calibração por MMR público do Dota como gate de entrada |
| No-show | Sistema de timeout: não aparecer = penalidade de rating |
| Griefing | Report system + moderadores humanos |
| Draft abuse | Reportável para staff (FACEIT) |

**Sistema de ban do Sentinel Bot**: bans são **globais** — se o jogador saiu de qualquer jogo hospedado pelo bot, é banido de TODOS os jogos do bot. Elegante em simplicidade, mas pode ser draconiano demais para um contexto como FormulaDota onde a relação professor-aluno é mais próxima.

**Fontes**:
- [GitHub — ErkoKnoll/Dota2SentinelBot](https://github.com/ErkoKnoll/Dota2SentinelBot)
- [Dota 2 Wiki — Conduct Summary](https://dota2.fandom.com/wiki/Conduct_Summary)

---

## 4. UX patterns aplicáveis

### 4.1 Lobby flow (IXDL original)

O fluxo que funcionou no IXDL era deceptivamente simples:

```
[Cliente aberto] → Ver lista de jogos pendentes
      ↓
[Clicar "Start Game" ou .sg] → Jogo criado na lista pública
      ↓
[Outros players clicam .sign] → Lista de inscritos atualiza em tempo real
      ↓
[10 players inscritos] → Host confirma com .confirm
      ↓
[Senha gerada aleatoriamente] → Exibida no chat + disponível via .password
      ↓
[Players abrem Dota 2] → Criam/entram lobby com a senha
      ↓
[Jogo começa]
```

**O que fez funcionar**: feedback em tempo real, comandos simples (não precisava de GUI elaborada), centralização de informação (não precisava ficar perguntando "cadê a senha?").

**Modernização (Discord bots)**: o mesmo flow hoje passa pelo Discord como hub de comunicação:

```
!queue → entrar na fila
[bot exibe: "7/10 players na fila"]
[10 players] → bot cria lobby automaticamente via Steam GC
[bot invita cada SteamID] → popup aparece no cliente Dota 2
[players aceitam] → lobby formado
[bot notifica capitães] → draft começa
```

### 4.2 Rating / leaderboard visível

**Padrão universal**: todos os IHLs bem-sucedidos tinham leaderboard público com ranking por ELO/rating. Isso serve como:
- Motivador intrínseco (subir no ranking)
- Sinal de qualidade (jogadores sabem com quem estão jogando)
- Ferramenta de scout para times profissionais

**Granularidade**: separar rating por região era essencial (IXDL fazia isso). Tentar comparar jogadores de latência e meta diferentes distorce o sistema.

### 4.3 Divisões de habilidade (tier system)

**IXDL-Open vs IXDL-Invite**: divisão entre liga aberta e liga fechada criava aspiração. Jogadores da Open queriam subir para a Invite. Criava narrativa de progressão.

**FPL Circuit**: 5 divisões (Bronze → Diamond → Masters → FPL). Top performers de cada divisão sobem. Cria ecosystem sustentável — sempre tem onde ir depois.

**FormulaDota implication**: mesmo com fichas compradas (acesso pago), um tier system interno criaria engajamento de longo prazo. Ex: "aluno Bronze", "aluno Prata", "aluno Ouro" com benefícios progressivos.

### 4.4 Vouching vs. open registration

**Vouch system** (IXDL-Invite, NEL): jogador precisa de indicação de membro estabelecido. Funciona como filtro de qualidade e comportamento. Desvantagem: cria percepção de "clube exclusivo" e pode afastar novos jogadores.

**Open com gate de rating** (IXDL-Open): qualquer um pode se registrar mas o sistema de rating rapidamente separa os skill levels. Mais democrático, mais escalável.

**Hybrid moderno** (LD2L — Learn Dota 2 League): ao invés de whitelist (vouchar quem entra), faz blacklist (remover quem se comporta mal). Muito mais escalável.

**FormulaDota**: o modelo de ficha já é um gate de acesso natural (pagamento). Dentro do contexto pago, o "vouche" é implícito — Pedro seleciona quem pode comprar ficha. Isso é exatamente o modelo correto para a proposta de valor.

### 4.5 Match history e stats

**Universal nos IHLs**: todos os sistemas bem implementados expunham:
- Histórico de partidas com resultado
- Winrate por herói
- Performance vs. oponentes específicos
- Tendência de MMR ao longo do tempo

**OpenDota como backend gratuito**: a maioria dos bots modernos usa a OpenDota API para puxar estatísticas de partidas Dota 2 depois que o Match ID é registrado. O match data fica disponível automaticamente quando a partida é de lobby privado com jogadores com perfis públicos.

---

## 5. Plataformas sucessoras (estado da arte 2024+)

### 5.1 FACEIT Pro League (FPL) — Dota 2

**Status**: ativo, mas historicamente intermitente. Puppey (Clement Ivanov) reativou o FPL Dota 2 em 2024.

**Como funciona**: plataforma web + cliente FACEIT. Matchmaking automático por ELO. Captain's Mode padrão. Bot FACEIT cria lobby Steam automaticamente e convida via GC. Prize pool mensal de USD 20.000.

**Hierarquia**: 5 divisões. Top performers sobem mensalmente.

**Limitação**: focado em jogadores de elite (6.000+ MMR). Não existe uma versão "amateur" oficial bem mantida.

### 5.2 Meta Liga (meta-liga.ggarena.pro)

**Status**: ativo em 2026. Plataforma brasileira.

**O que é**: plataforma web de inhouse league para o Brasil. Autenticação via Steam OAuth. Criada por Marcelo Augusto e Felipe Reducino. Tem seção "Jogar", "Lista de Picks", integração com Discord e Twitch.

**Limitação de informação**: não foi possível acessar detalhes técnicos do matchmaking e criação de lobbies (site requer autenticação para uso completo). É a **referência direta mais relevante** para o contexto BR.

**FormulaDota deve estudar**: como Meta Liga resolve o problema de lobby creation no contexto BR (latência, servidores SA).

### 5.3 Open source bots (estado atual)

**dota-ihl-bot** (devilesk): Node.js, Discord.js + node-dota2 + PostgreSQL. Mais completo em features. Arquitetado para múltiplas leagues simultâneas. Último commit: ativo.

**OneHead** (belmegatron): Python. Rating híbrido (MMR Dota + IHL performance). Mais simples. Docker deployment. Ativamente mantido (v1.58.0, dezembro 2025). Voice channel automation: move jogadores automaticamente para canais de voz por time.

**Dota2-EU-Ladder** (UncleVasya): Python + Django + ValvePython/dota2. Componentes separados: Discord bot + Dota bot + Website de stats. Mais próximo de uma stack completa.

**Dota2SentinelBot** (ErkoKnoll): C#. Foco em anti-leaver com ban global automático. Arquitetura mais robusta com componentes separados (coordinator, lobby, domain).

**FormulaDota recomendação**: estudar `OneHead` como referência de implementação Python/Discord mais limpa, e `Dota2SentinelBot` para a lógica de anti-leaver.

### 5.4 Outras inhouse leagues internacionais relevantes

**LD2L (Learn Dota 2 League)**: focada em jogadores em desenvolvimento. Sistema de blacklist ao invés de whitelist. Gerenciada por Discord bot próprio (ld2l-discord-bot no GitHub).

**NADCL (North American Dota 2 Challenger's League)**: foco em equipes amadoras, não jogadores individuais. Distinto do conceito inhouse.

**Reddit Dota IHL**: bot open source (redditdota/inhouse-bot). Cria filas inhouse para a comunidade Reddit Dota 2.

**Fontes**:
- [Meta Liga](https://meta-liga.ggarena.pro/)
- [GitHub — OneHead](https://github.com/belmegatron/onehead)
- [GitHub — dota-ihl-bot](https://github.com/devilesk/dota-ihl-bot)
- [GitHub — Dota2-EU-Ladder](https://github.com/UncleVasya/Dota2-EU-Ladder)
- [GosuGamers — FPL announcement](https://www.gosugamers.net/dota2/news/30614-faceit-pro-league-announced)
- [ONE Esports — Puppey reativando FPL](https://www.oneesports.gg/dota2/puppey-is-bringing-back-the-dota-2-faceit-players-league/)

---

## 6. Pitfalls a evitar (causas de morte do IxDL)

### 6.1 Burnout do criador único — causa principal

**O que aconteceu**: ixmike88 declarou explicitamente: *"I found IXDL to be an overwhelming amount of work with all of the other things I wanted to do."* IXDL era operado essencialmente por uma pessoa, com ajuda ad hoc. Quando o criador ficou sobrecarregado com a carreira profissional de jogador, a league deteriorou.

**Lição para FormulaDota**: Pedro Paulo também é o produto principal (o jogador Immortal). A plataforma não pode depender de Pedro para operação diária. Automatização máxima + delegação de moderação é crítica. Cada tarefa manual que Pedro tem que fazer é um vetor de burnout.

**Mitigação**: bot autônomo para criação de lobbies, sistema de rating automático, moderadores voluntários da comunidade para enforcement de regras, log automático de resultados.

### 6.2 Competição da própria Valve

**O que aconteceu**: Valve lançou o ranked matchmaking em novembro de 2013. IXDL nasceu exatamente porque ranked não existia. Com ranked, a proposta de valor de "jogo mais sério que pubs" ficou comprometida. Conforme ixmike88 disse: *"IXDL served its purpose. Once Valve introduced ranked matchmaking, the league faced insurmountable competition. Despite player complaints about pub quality, most weren't interested in returning to in-house formats."*

**Lição para FormulaDota**: a proposta de valor não pode ser apenas "jogo mais sério". Precisa ser algo que Valve **nunca vai oferecer**: acesso direto a um jogador Immortal, feedback personalizado, communidade curada. FormulaDota vende a **pessoa Pedro Paulo**, não apenas a mecânica da league. Isso é inimitável pelo matchmaking da Valve.

### 6.3 Player pool pequeno demais — o problema do ovo e da galinha

**O que aconteceu**: inhouse leagues precisam de massa crítica de jogadores para funcionar. Mínimo ~20 jogadores ativos para ter jogos frequentes sem espera excessiva. IXDL SEA reportou dificuldades com apenas 20+ jogadores simultâneos em 2013. Quando o pool era pequeno, os mesmos jogadores se enfrentavam repetidamente, desgastando a experiência.

**Lição para FormulaDota**: o modelo de fichas (vagas limitadas por sessão) contorna esse problema de forma inteligente — não é um matchmaking de pool aberto. Mas quando escalar para V2+ com sessions recorrentes, precisará de 30-50 alunos ativos para ter variedade suficiente de oponentes e evitar repetição constante.

**Mitigação**: eventos semanais com horários fixos (ex: toda sexta às 19h) criam expectativa e concentram o player pool. IXDL SEA usava horários específicos declarados publicamente.

### 6.4 Toxicidade e cliques internos

**O que aconteceu**: ixmike88 identificou 3 obstáculos persistentes: (1) balancear atividade com skill levels, (2) gerenciar ego clashes entre competidores, (3) lidar com cliques e game-picking estratégico. Inhouse leagues são frequentemente criticadas por serem "cliques exclusivistas muito difíceis de entrar" e "tão tóxicas quanto o pub ambiente que tentam deixar para trás, se não mais".

**Lição para FormulaDota**: a Cultura e Doutrina Fórmula Dota (14 princípios + 10 anti-padrões) é exatamente o antídoto correto para esse problema. A doutrina precisa ser comunicada ativamente, não apenas escrita em um documento. Onboarding de novos alunos deve incluir leitura obrigatória das regras de conduta.

**O player pool pequeno paradoxalmente ajuda**: como ixmike88 observou, *"players quickly learn that they can't afford to hold grudges — the player pool is far too small to be petty."* Em uma comunidade pequena e fechada, comportamento tóxico tem consequências sociais reais porque você vai ver a mesma pessoa toda semana.

### 6.5 Falta de sustentabilidade financeira

**O que aconteceu**: IXDL operou inicialmente sem modelo de receita claro. Prize money vinha de doações. Custos de servidor eram pagos do bolso do criador ou via doações comunitárias. Isso não é sustentável a longo prazo.

**Lição para FormulaDota**: o modelo de fichas resolve esse problema desde o MVP. O pagamento está embutido no acesso ao produto principal (jogar com Pedro). Mas ao escalar para V2/V3, considerar premium tiers (ranking especial, acesso a sessões extras, replay review) para diversificar receita sem onerar jogadores que já pagam por ficha.

### 6.6 Dependência de plataforma externa / migração forçada

**O que aconteceu**: quando IXDL migrou para FACEIT em 2015, perdeu controle total sobre a experiência. FACEIT tomou pausas inesperadas ("devido ao volume de LANs no verão"). A identidade da league diluiu. Finalmente, FPL-NA substituiu NEL completamente.

**Lição para FormulaDota**: nunca depender de plataforma de terceiro para o core da experiência. Discord como hub de comunicação é aceitável. FACEIT como backend de lobby não seria — perda de controle sobre dados, experiência e continuidade. O Tauri V3+ precisa ser a plataforma proprietária.

### 6.7 Ausência de analytics e feedback loop

**Pouca informação pública disponível** sobre como IXDL media sucesso ou coletava feedback dos jogadores. Não há evidência de que métricas de retenção, satisfação ou health da community fossem monitoradas sistematicamente.

**Lição para FormulaDota**: instrumentar tudo desde o início. Quantas sessões por semana, taxa de retorno de alunos, NPS pós-sessão, quais horários têm maior adesão. Esses dados guiam decisões de produto sem depender de intuição.

---

## 7. Recomendações concretas pro FormulaDota

### Curto prazo (MVP fichas — v1 atual)

**1. Lobby criado manualmente por Pedro — aceitável para MVP**
No início com 4-5 alunos por sessão, Pedro pode criar o lobby manualmente no Dota 2. Não é necessário bot nesta fase. Foco no produto: a sessão com Pedro, não a infra de lobby.

**2. Comunicação centralizada no Discord**
Um canal `#fila` ou `#sessao` onde Pedro anuncia horário, alunos confirmam presença, e a senha do lobby é compartilhada. Simples e funcional.

**3. Regras de conduta comunicadas antes da primeira sessão**
Todo aluno novo lê e aceita a Doutrina Fórmula Dota antes de acessar a primeira ficha. Onboarding com leitura obrigatória (checkbox na plataforma).

**4. Registro de resultados manual (planilha ou Supabase)**
Mesmo sem sistema automático, registrar resultado de cada sessão: quem jogou, resultado, data. Base para o sistema de rating futuro.

### Médio prazo (V2 HUB — community)

**5. Bot Discord para fila (dota-ihl-bot ou OneHead como referência)**
Implementar bot próprio (fork de `OneHead` ou implementação inspirada) para gerenciar fila de jogadores. Comandos básicos: `!entrar`, `!sair`, `!fila` (ver quem está esperando). Bot notifica quando há 10 jogadores disponíveis.

**6. Rating interno dos alunos (ELO ou TrueSkill)**
Sistema de rating separado do MMR público do Dota 2. Serve como leaderboard interno da comunidade FormulaDota. Seed inicial: usar badge/MMR do Dota 2 como ponto de partida (via OpenDota API).

**7. Automação de lobby via Steam bot account**
Bot Steam com conta dedicada criando lobbies automaticamente quando fila completa. Usar `go-dota2` (Go) ou fork ativo do `node-dota2`. Servidor: Brasil (SA) com menor latência possível para players BR.

**8. Página de stats por aluno**
Após cada sessão, bot coleta Match ID do Dota 2 e pede aos alunos para registrar. Usa OpenDota API para puxar stats detalhadas. Exibe no dashboard: winrate, heróis mais jogados, evolução de rating interno.

**9. Sistema de reporte e ban**
Qualquer aluno pode reportar comportamento inadequado. Pedro (e moderadores confiáveis) decide sobre bans. Ban = remoção da comunidade + sem reembolso de fichas não utilizadas (comunicado nas regras).

### Longo prazo (V3+ Tauri desktop)

**10. Cliente Tauri como hub central (inspirado no IXDL client, mas moderno)**

Stack recomendada:
```
Frontend: React/Next.js (embutido no Tauri webview)
Backend Tauri: Rust (lightweight, seguro)
Bot Steam: Go (go-dota2) rodando como serviço separado
Comunicação: REST API + WebSockets para updates em tempo real
Database: Supabase (já existe no projeto)
```

**Features do cliente desktop FormulaDota V3+**:
- Login via Steam (OpenID) + conta FormulaDota
- Fila de sessões em tempo real (WebSocket)
- Aceitação de lobby com 1 clique (dispara invite via bot Steam)
- Draft picker integrado (Captain's Mode com interface visual)
- Histórico de partidas com stats
- Leaderboard da comunidade
- Notificações push quando Pedro está ao vivo / sessão disponível
- Chat integrado (ou deeplink para Discord)

**11. Sistema de tier/divisões**
Divisões internas: "Iniciante", "Aprendiz", "Avançado", "Elite". Progressão baseada em rating interno + número de sessões completadas. Benefícios por tier: acesso a sessões especiais, badge no Discord, replay review com Pedro.

**12. Anti-leaver robusto desde V3**
Inspirado no Dota2SentinelBot: saiu do jogo sem motivo válido = ban temporário de sessões futuras (7 dias primeira vez, 30 dias segunda, permanente terceira). Sistema de appeal via formulário (Pedro decide).

**13. Preservar o que torna FormulaDota único — o que IxDL não tinha**
IxDL era uma league horizontal — todos os jogadores eram pares. FormulaDota tem uma proposta vertical: Pedro Paulo, Immortal Top 0.5%, como figura central de aprendizado. Isso não é bug, é feature. O produto não é só "jogo organizado" — é acesso a um mentor de elite. Nunca diluir isso tentando replicar o modelo puramente horizontal do IxDL/FPL.

**14. Referência para arquitetura de dados de sessão**

```
sessions:
  - session_id (uuid)
  - date (timestamp)
  - pedro_present (boolean)
  - match_id (dota2 match id)
  - lobby_config (game_mode, server_region, pass_key)
  - players: [
      { user_id, steam_id, team (radiant/dire), hero_picked }
    ]
  - result (radiant_win | dire_win)
  - vods (array of URLs)

player_ratings:
  - user_id
  - session_count
  - wins
  - losses
  - elo_rating
  - tier (iniciante | aprendiz | avancado | elite)
  - last_updated

behavior_log:
  - user_id
  - session_id
  - event_type (report | commend | ban | unban)
  - reporter_id
  - description
  - resolved_by
  - resolution
```

---

## Apêndice A — Comparativo IxDL vs FormulaDota

| Dimensão | IxDL (2013-2015) | FormulaDota V3+ |
|----------|-----------------|-----------------|
| Modelo de acesso | Aberto/Vouche | Pago via ficha |
| Player pool | Centenas (NA/EU) | Dezenas (BR, curado) |
| Proposição de valor | Games sérios sem leavers | Aprendizado com Immortal |
| Monetização | Doações / taxa de hosting | Fichas de sessão |
| Figura central | ixmike88 (organizador) | Pedro Paulo (professor + player) |
| Cliente | Desktop standalone (Windows) | Tauri cross-platform |
| Bot lobby | Manual → bot IRC | Bot Steam autônomo |
| Rating | ELO modificado | TrueSkill/Glicko-2 |
| Anti-toxicidade | Moderação manual | Doutrina + ban automático |
| Tier system | Open vs Invite | 4 divisões internas |
| Sustentabilidade | Burnout/doações | Receita de fichas |
| Plataforma final | Absorvida pelo FACEIT | Proprietária (Tauri) |

---

## Apêndice B — Repositórios open source relevantes para V3+

| Repo | Lang | Features principais |
|------|------|---------------------|
| [devilesk/dota-ihl-bot](https://github.com/devilesk/dota-ihl-bot) | JS/Node | Queue, lobby, ELO, multi-league |
| [belmegatron/onehead](https://github.com/belmegatron/onehead) | Python | Hybrid MMR, voice channels, Docker |
| [UncleVasya/Dota2-EU-Ladder](https://github.com/UncleVasya/Dota2-EU-Ladder) | Python | Full stack: bot + site + stats |
| [ErkoKnoll/Dota2SentinelBot](https://github.com/ErkoKnoll/Dota2SentinelBot) | C# | Anti-leaver, ban global, C# |
| [sushkov/Dota2LobbyBot](https://github.com/sushkov/Dota2LobbyBot) | JS/Node | DB-driven lobby creation |
| [paralin/go-dota2](https://github.com/paralin/go-dota2) | Go | node-dota2 successor, ativo |
| [redditdota/inhouse-bot](https://github.com/redditdota/inhouse-bot) | JS | Simples, Discord queue |

---

## Apêndice C — Fontes completas

- [GosuGamers — State of NA Dota: ixmike88 interview](https://www.gosugamers.net/dota2/features/40615-the-state-of-na-dota-an-ixmike88-interview)
- [GosuGamers — NEL announcement](https://www.gosugamers.net/dota2/news/25278-neodota-presents-the-nadota-elite-league)
- [GosuGamers — FPL replaces NEL](https://www.gosugamers.net/dota2/news/31100-fpl-expands-to-north-america-replaces-nel)
- [Liquipedia — ixmike88](https://liquipedia.net/dota2/Ixmike88)
- [AFK Gaming — IXDL 2022 revival](https://afkgaming.com/dota2/news/top-na-dota-2-pros-to-compete-in-a-two-week-in-house-league)
- [Esports Heaven — ixmike88 on EternalEnvy](https://www.esportsheaven.com/features/ixmike88-on-eternalenvy-players-quickly-learn-that-they-cant-afford-to-hold-grudges-i-dont-know-if-there-ever-was-any-real-contempt-but-the-player-pool-is-far-too-small-to-be-petty/)
- [RotoWire — Inhouse leagues future of the scene](https://www.rotowire.com/esports/article/dota-2-inhouse-leagues-the-future-of-the-scene-35159)
- [FACEIT — Captain selection](https://support.faceit.com/hc/en-us/articles/25322756241948)
- [node-dota2 documentation](https://dota2.readthedocs.io/en/stable/dota2.features.lobby.html)
- [IXDL SEA Facebook](https://www.facebook.com/IXDL.SEADota2/)
- [Meta Liga](https://meta-liga.ggarena.pro/)
- [GosuGamers — FPL Circuit](https://www.gosugamers.net/dota2/news/45410-faceit-kicks-of-the-dota-2-fpl-circuit-where-everyone-can-fight-for-a-chance-to-play-with-the-pros)
- [ONE Esports — Puppey reativando FPL](https://www.oneesports.gg/dota2/puppey-is-bringing-back-the-dota-2-faceit-players-league/)
