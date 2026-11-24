# Comunicação dentro do FORMULADOTA: fase 1, sala de voz com tela

Aberta em 23/11/2026. Estado: proposta, com as escolhas de produto marcadas como **recomendação** até o PPA decidir (seção 15). DoD da frente: [docs/definicao-de-pronto.md](../definicao-de-pronto.md), seção "Comunicação, fase 1".

## 1. Por que existe

Em 17/08/2026 o Discord desligou vídeo, Go Live e compartilhamento de tela no Brasil por ordem da ANPD; texto e voz continuam lá. O PPA dá mentoria de Dota e precisa mostrar a tela. Em 23/11/2026 ele decidiu que a comunicação (voz, tela e, depois, canais) passa a acontecer dentro do FORMULADOTA, para o jogador não depender do Discord nisso. O Discord fica para outros jogos, e o login pelo Discord e pela Steam continua como está.

## 2. Escopo

**Fase 1 (esta spec, com código):** uma sala de voz com compartilhamento de tela no próprio site, em `/sala/[id]`, atrás da flag `sala_voz` (desligada por padrão e autoritativa: desligada, some para todos, inclusive o admin). Dois tipos de sala:

- **Mentoria:** ligada a um horário pago da agenda da loja (`store_bookings` do tipo `agenda`, pedido `pago`). PPA e aluno.
- **Party:** ligada à live em andamento. PPA e quem está na party agora (`store_bookings.queue_state = 'na_party'`).

O que a sala faz: voz com cancelamento de eco, supressão de ruído e ganho automático; mutar; o dono compartilha a tela com o áudio do jogo; lista de quem está na sala; expulsar, bloquear e denunciar; nada gravado; teto de custo; métricas de qualidade.

**Fora da fase 1 (só neste documento, seção 16):** canais de texto e voz da comunidade (fase 2) e aplicativo de computador (fase 3). Também fora: gravação, sala pública, LiveKit ou servidor de mídia próprio, mudança em pagamento, no login do Discord, nos tokens e no kit de design.

## 3. Requisitos

### Funcionais

| # | Requisito |
|---|---|
| R1 | Só o admin (hoje, o PPA) cria sala. Toda sala é privada: entra só quem é membro. |
| R2 | Sala de mentoria nasce de um horário pago da agenda; o membro é quem comprou. Comprador que pagou sem login entra por convite de uso único. |
| R3 | Sala da party nasce da live no ar; membro é quem está na party naquele momento, e quem sai da party perde o acesso sozinho. |
| R4 | Entrar exige conta identificada (Discord ou Steam vinculada) e data de nascimento informada uma vez. |
| R5 | Voz com `echoCancellation`, `noiseSuppression` e `autoGainControl`; botão de mutar. |
| R6 | O dono compartilha a tela com áudio pelo `getDisplayMedia`, em até 1920x1080 a 30 quadros por segundo. |
| R7 | Lista de quem está na sala, com o estado do microfone, indicador de fala e a qualidade da conexão. |
| R8 | O dono expulsa; qualquer membro bloqueia e denuncia. |
| R9 | Nada gravado: a mídia nunca passa por servidor do FORMULADOTA nem é guardada pela Cloudflare. |
| R10 | Teto de tráfego que bloqueia nova transmissão de tela e avisa o PPA. |
| R11 | Métricas de qualidade de cada pessoa (perda de pacote, jitter, RTT, resolução e quadros da tela) guardadas para medir o aceite. |

### Não funcionais

| Tema | Meta | Como se mede |
|---|---|---|
| Qualidade da tela | 1080p (altura 1080 no receptor) em pelo menos 90% do tempo de tela | `voice_room_stats.video_height` (seção 12) |
| Perda de pacote | abaixo de 2% na hora inteira | `voice_room_stats.packet_loss_pct` |
| Voz | sem corte perceptível: amostras ocultadas pelo navegador abaixo de 2% e nenhuma reclamação do PPA ou do aluno | `voice_room_stats.audio_concealed_pct` mais o relato do PPA |
| Latência | RTT até o SFU abaixo de 150 ms no Brasil | `voice_room_stats.rtt_ms` |
| Custo | dentro dos 1.000 GB grátis por mês da Cloudflare | estimativa do servidor e painel da Cloudflare (seção 11) |
| Disponibilidade | o site continua de pé se o Realtime cair: a sala mostra o erro e o resto do site não depende dela | sala atrás da flag e de rotas próprias |

### Restrições

Site em Next.js 16 no Cloudflare Workers pelo OpenNext; Supabase com RLS obrigatória; PPA não lê código (a prova é comando que passa ou falha); computador primeiro (1920 e 3440), celular só não pode quebrar.

## 4. Arquitetura

```
 Navegador (Chrome)                    Worker do site (Next.js no OpenNext)          Cloudflare Realtime
 +----------------------+  HTTPS + cookie  +-------------------------------+  HTTPS + segredo  +------------------+
 | /sala/[id]           | ---------------> | /api/sala/[id]/rtc/*          | ----------------> | API do SFU       |
 | RTCPeerConnection    | <---- SDP ------ |   autoriza cada chamada       | <---------------- | rtc.live.        |
 | (partytracks)        |                  |   grava sessão, faixa, custo  |                   |  cloudflare.com  |
 |                      |                  | /api/sala/[id]/estado (2 s)   |                   +------------------+
 |                      |                  | /api/sala/[id]/entrar, sair,  |                   +------------------+
 |                      |                  |   expulsar, denunciar ...     |                   | SFU na borda     |
 |                      | ================ mídia WebRTC (UDP, ou TURN) =====================> | (São Paulo etc.) |
 +----------------------+                  +---------------+---------------+                   | TURN             |
                                                           |                                   +------------------+
                                                           v
                                            Supabase: salas, membros, sessões, faixas,
                                            assinaturas (custo), métricas, denúncias, idade
```

- O navegador fala WebRTC direto com o SFU da Cloudflare, que só encaminha os pacotes (não decodifica nem grava). Cada pessoa tem uma conexão (`RTCPeerConnection`) com o SFU: envia a própria voz e recebe as faixas dos outros.
- Toda chamada à API do SFU (criar sessão, publicar faixa, receber faixa, renegociar, fechar) passa pelo servidor do site, que usa o segredo do app e decide se a pessoa pode fazer aquilo. O navegador nunca vê o segredo.
- O TURN da Cloudflare entra quando a rede da pessoa bloqueia UDP direto (rede de empresa, alguns roteadores). O servidor gera credenciais de TURN de curta duração a cada entrada e entrega ao navegador. Tráfego entre o TURN e o SFU da Cloudflare não é cobrado.
- Supabase guarda quem pode entrar, quem está online, que faixa cada um publicou e recebeu (base do custo), as métricas e as denúncias. O navegador não grava nada direto no banco: tudo passa pelas rotas do servidor.

### Fluxo de uma mentoria

1. O PPA abre `/admin/salas`, escolhe o horário pago e cria a sala. Recebe o link (e o convite, se o comprador pagou sem login) e manda ao aluno pelo WhatsApp, como já faz.
2. O aluno abre o link, entra com o Discord se ainda não entrou, informa a data de nascimento na primeira vez e clica em "Entrar na sala" (o clique libera microfone e som no navegador).
3. `POST /api/sala/[id]/entrar` confere a flag, a sala aberta, o membro ativo, a idade, a lotação e devolve as credenciais de TURN.
4. O cliente (partytracks) cria a sessão e publica a voz pelo servidor; o servidor grava a sessão e a faixa, e o cliente rotula a faixa como `voz`.
5. A cada 2 s o cliente chama `POST /api/sala/[id]/estado`, que serve de batimento (presença), leva as métricas a cada 10 s e devolve quem está na sala e quais faixas ele pode receber. Faixa nova na lista: o cliente pede ao servidor para recebê-la.
6. O PPA clica em "Compartilhar tela": o servidor confere que ele é o dono, que o teto não foi atingido e que não há outra tela no ar, e só então deixa publicar a faixa de vídeo e a do áudio da tela.
7. Expulsar: o servidor marca o membro como expulso e fecha à força, no SFU, todas as faixas dele. A próxima consulta dele recebe "removido da sala".

## 5. Decisões de arquitetura (ADR)

### ADR-001: mídia pelo Cloudflare Realtime SFU

**Estado:** aceita (sessão central, 23/11/2026). **Quem decide:** PPA.

**Contexto.** A sala precisa de voz e tela com baixa latência no Brasil, sem servidor de mídia para manter e com custo previsível. O site já roda na Cloudflare (Workers Paid).

**Opções.**

| | Cloudflare Realtime SFU | LiveKit Cloud | Servidor próprio (LiveKit ou mediasoup numa VPS) |
|---|---|---|---|
| Complexidade | baixa: API HTTPS, sem servidor | baixa | alta: servidor, TURN, atualização, monitoramento |
| Custo | 1.000 GB grátis por mês (SFU e TURN juntos), depois US$ 0,05 por GB de saída | por minuto de participante | VPS fixa mais banda |
| Escala | borda da Cloudflare, sem região | boa | o que a máquina aguentar |
| Familiaridade | mesma conta e mesmo painel do site | conta nova | nenhuma |

**Decisão.** Cloudflare Realtime SFU com o TURN da própria Cloudflare. Sem LiveKit, sem servidor próprio. Interface própria no site.

**Consequências.** A Cloudflare não tem teto de gasto: o limite de consumo precisa morar no site (ADR-005). Ficamos sem os recursos prontos de uma plataforma de reunião (gravação, legenda), o que a fase 1 não quer.

### ADR-002: o servidor do site intermedeia e autoriza toda chamada ao SFU

**Estado:** proposta.

**Contexto.** A API do SFU usa um segredo único do app; com ele, qualquer um publica e recebe qualquer faixa de qualquer sessão. A biblioteca de servidor do partytracks (`routePartyTracksRequest`) só repassa a chamada e prende a sessão a quem a criou por cookie: não confere se quem recebe uma faixa é membro da sala, se foi expulso ou bloqueado, nem o teto de custo.

**Decisão.** Uma rota própria, `/api/sala/[id]/rtc/[...caminho]`, recebe as chamadas que o cliente faria ao SFU, confere tudo (seção 8) e só então repassa com o segredo. A rota grava cada sessão, cada faixa publicada (com o tipo, `audio` ou `video`, tirado do SDP da oferta) e cada faixa recebida (base da estimativa de custo).

**Consequências.** Toda mídia continua indo direto ao SFU; só o controle passa pelo servidor (algumas dezenas de chamadas por sessão). O servidor precisa ler o SDP da oferta para saber o tipo de cada faixa, porque o partytracks dá nomes aleatórios às faixas: é uma função pura e testada.

### ADR-003: cliente WebRTC pelo partytracks, atrás de um módulo nosso

**Estado:** proposta.

**Contexto.** O cliente precisa negociar SDP com o SFU em fila (uma mudança por vez), receber várias faixas, refazer a conexão quando a rede cai e manter tudo vivo por 1 hora ou mais.

**Opções.**

| | partytracks 0.0.56 (Cloudflare, licença ISC) | cliente próprio |
|---|---|---|
| Complexidade | média: usa RxJS, que o projeto não usa | média: 300 a 400 linhas de negociação e reconexão |
| Confiabilidade | é o que o Orange Meets, app de referência da Cloudflare, usa; reconecta sozinho com sessão nova e republica as faixas | tudo a escrever e provar |
| Manutenção | versão 0.0.x, um mantenedor, última versão em 20/04/2026; 45 mil downloads no último mês | nossa |
| Pontos de atenção | nomes de faixa aleatórios; nova tentativa sem limite quando o servidor recusa | nenhum herdado |

**Decisão.** partytracks com versão fixa (`0.0.56`), usado só por `src/lib/sala/cliente/` (o resto do app não importa a biblioteca), para trocar por um cliente próprio sem mexer na tela se ela parar de ser mantida. Recusa do servidor vem com `errorCode` no formato do SFU, e a tela para de pedir quando a consulta de estado diz que a ação não é permitida (o teto, por exemplo), o que corta a repetição.

**Consequências.** RxJS entra só no pacote da rota `/sala`. Revisitar se a biblioteca ficar 12 meses sem versão nova ou se a fase 2 precisar de algo que ela não cobre.

### ADR-004: estado da sala por consulta a cada 2 s

**Estado:** proposta.

**Contexto.** Cada pessoa precisa saber quem está na sala e quais faixas receber, e o servidor precisa saber quem continua conectado.

**Opções.** (A) consulta `POST /estado` a cada 2 s, que também é o batimento; (B) Supabase Realtime (`postgres_changes` com RLS ou Broadcast em canal privado); (C) Durable Object da Cloudflare com WebSocket.

**Decisão.** A. A consulta é o batimento de presença, leva as métricas e devolve a lista de faixas já filtrada (bloqueio, expulsão, teto) pelo servidor, numa regra só. Até 6 pessoas por sala, são 3 requisições por segundo por sala, folgado no Workers Paid. B depende do token do realtime estar setado no cliente (armadilha já vista no projeto) e espalha a regra entre RLS e servidor; C pede outra classe exportada no Worker do OpenNext. Revisitar na fase 2, quando um canal tiver dezenas de pessoas.

**Consequências.** Uma faixa nova aparece para os outros em até 2 s; quem fecha o navegador some da lista em até 15 s.

### ADR-005: custo estimado no próprio servidor, com teto em 30 dias corridos

**Estado:** proposta.

**Contexto.** A Cloudflare cobra só o tráfego que sai dela para os navegadores. A conta não tem teto de gasto, e a análise por GraphQL documentada cobre o TURN (`callsTurnUsageAdaptiveGroups`); para o SFU não achei conjunto de dados documentado (NÃO CONFIRMADO: conferir no painel na hora de ligar o app).

**Decisão.** O servidor sabe toda faixa que cada pessoa recebe (ADR-002), com início e fim. A estimativa é a soma de `duração x teto de bitrate do tipo` de toda faixa recebida, um limite superior do que a Cloudflare mede. O teto vale para os últimos 30 dias corridos (não o mês do calendário), porque o ciclo de cobrança da conta pode não começar no dia 1. As métricas dos navegadores (`bytesReceived`) dão o consumo medido ao lado, para comparar.

**Consequências.** A estimativa erra para cima (bloqueia antes do necessário, nunca depois). Depois da mentoria real, a estimativa, o medido e o painel da Cloudflare vão lado a lado na nota de aceite.

## 6. Rotas do servidor

Todas exigem login (cookie do Supabase), flag `sala_voz` ligada e validam o corpo com Zod. Respostas de erro no formato do SFU, `{ "errorCode": "...", "errorDescription": "..." }`, para o cliente tratar igual.

| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/sala/[id]/entrar` | membro | confere acesso (seção 8), marca presença, devolve credenciais de TURN (válidas até o fim da sala, no máximo 12 h), o papel e os limites |
| `POST /api/sala/[id]/rtc/sessions/new` | membro | cria a sessão no SFU e grava; fecha a sessão anterior do mesmo membro (outra aba ou reconexão) |
| `POST /api/sala/[id]/rtc/sessions/[sid]/tracks/new` | dono da sessão | publicar (faixa `local`): tipo tirado do SDP e conferido contra o papel e o teto; receber (faixa `remote`): só faixa ativa de outro membro ativo da mesma sala, sem bloqueio entre os dois |
| `PUT /api/sala/[id]/rtc/sessions/[sid]/renegotiate` | dono da sessão | repassa a resposta SDP |
| `PUT /api/sala/[id]/rtc/sessions/[sid]/tracks/close` | dono da sessão | repassa e marca o fim da faixa publicada ou recebida |
| `POST /api/sala/[id]/faixas` | dono da faixa | rotula a faixa publicada como `voz`, `tela` ou `tela_audio` (o rótulo tem de bater com o tipo); faixa sem rótulo não aparece para ninguém |
| `POST /api/sala/[id]/estado` | membro | batimento, estado do microfone e métricas a cada 10 s; devolve membros online, faixas que pode receber, se a tela está liberada e o motivo de saída quando houver (expulso, saiu da party, sala encerrada) |
| `POST /api/sala/[id]/sair` | membro | fecha a sessão no SFU (também por `sendBeacon` ao fechar a aba) |
| `POST /api/sala/[id]/membros/[userId]/expulsar` | dono da sala | marca expulso e fecha à força todas as faixas dele no SFU |
| `POST /api/sala/[id]/bloqueios` | membro | bloqueia pelo sistema de amizade que já existe (`friendships`, status `blocked`) e fecha as faixas recebidas entre os dois |
| `POST /api/sala/[id]/denuncias` | membro | grava a denúncia identificada e avisa o PPA no canal privado do Discord |
| `POST /api/sala/[id]/convite` | logado com o convite | troca o convite de uso único pelo lugar de membro na mentoria |
| ações do admin em `/admin/salas` | admin | criar sala de mentoria (de um horário pago), criar sala da party (da live no ar), gerar novo convite, encerrar sala |

Tarefa nova no cron do site (`/api/cron/site`, a cada minuto): fecha no SFU as sessões sem batimento há mais de 45 s, encerra salas vencidas, calcula o consumo dos 30 dias, avisa o PPA ao cruzar 50%, 80% e 100% do teto ou num pico (mais de 20 GB estimados numa hora) e apaga o que passou do prazo de guarda (seção 10).

Segredos no Worker (por `wrangler secret`, nunca no repositório nem em tela): `REALTIME_APP_SECRET` e `REALTIME_TURN_KEY_TOKEN`. Variáveis sem segredo: `REALTIME_APP_ID` e `REALTIME_TURN_KEY_ID`. Sem elas, a sala mostra "Sala de voz indisponível" (falha fechada).

## 7. Modelo de dados

Migration nova, com RLS em todas as tabelas. O navegador não escreve em nenhuma delas: a escrita é do servidor (service role) ou de função `SECURITY DEFINER` que valida `auth.uid()`, com `EXECUTE` revogado de quem não deve chamar.

| Tabela | Para que | Colunas principais |
|---|---|---|
| `voice_settings` | configuração única (linha 1), editável pelo admin no banco | `cap_gb_30d` (800), `video_max_kbps` (4000), `mentoria_max_members` (2), `party_max_members` (6), `alert_level`, `alert_at` |
| `voice_rooms` | a sala | `kind` (`mentoria` ou `party`), `title`, `owner_id`, `booking_id` ou `live_session_id`, `status` (`aberta`, `encerrada`), `max_members`, `screen_policy` (`dono`, `um_por_vez`), `closes_at`, `invite_token_hash`, `invite_used_at`, `is_test` |
| `voice_room_members` | quem pode entrar | `room_id`, `user_id`, `role` (`dono`, `membro`), `status` (`ativo`, `expulso`), `joined_via` (`dono`, `pedido`, `convite`, `party`), `last_seen_at`, `muted`, `removed_by`, `removed_at` |
| `voice_room_sessions` | sessão do SFU de cada pessoa | `id` (o `sessionId` da Cloudflare), `room_id`, `user_id`, `ip`, `user_agent`, `created_at`, `closed_at`, `close_reason` |
| `voice_room_tracks` | faixa publicada | `session_id`, `track_name`, `mid`, `kind` (`audio`, `video`), `tipo` (`voz`, `tela`, `tela_audio`), `created_at`, `closed_at` |
| `voice_room_subscriptions` | faixa recebida, base do custo | `session_id` (quem recebe), `mid`, `publisher_session_id`, `track_name`, `kind`, `rate_kbps` (teto usado na conta), `started_at`, `ended_at`, `is_test` |
| `voice_room_stats` | qualidade a cada 10 s por pessoa | `rtt_ms`, `jitter_ms`, `packet_loss_pct`, `audio_concealed_pct`, `video_width`, `video_height`, `video_fps`, `video_freeze_ms`, `bytes_received`, `bytes_sent`, `relay`, `quality_limitation` |
| `voice_room_reports` | denúncia | `room_id`, `reporter_id`, `reported_id`, `reason`, `details` (até 500 caracteres), `status` (`aberta`, `em_analise`, `resolvida`, `descartada`), `reviewed_by`, `reviewed_at`, `resolution` |
| `user_birthdates` | data de nascimento, só para a regra de idade | `user_id`, `birth_date`, `declared_at` |

**Leitura (RLS).**

- `voice_rooms` e `voice_room_members`: o membro ativo lê a própria sala e a lista dela; o admin lê tudo. A checagem usa a função `is_voice_room_member(room_id)` (`SECURITY DEFINER`, `search_path` vazio), para a política de uma tabela não consultar a outra e cair em recursão, a armadilha que já derrubou as tabelas de party (migration 079).
- `voice_room_sessions` (tem IP), `voice_room_tracks`, `voice_room_subscriptions`, `voice_room_stats` e `voice_settings`: só o admin lê; o servidor usa a service role.
- `voice_room_reports`: quem denunciou lê as próprias denúncias; o admin lê todas.
- `user_birthdates`: a pessoa lê a própria; o admin lê todas (moderação de denúncia envolvendo menor).
- Nenhuma tabela tem política de `insert`, `update` ou `delete` para `anon` ou `authenticated`.

**Funções.**

- `declare_birth_date(p_birth_date date)`: `SECURITY DEFINER`, valida `auth.uid()`, aceita data entre 1900 e hoje menos 5 anos, grava uma vez e recusa troca (só o admin corrige, pelo banco). `EXECUTE` só para `authenticated`.
- `is_voice_room_member(p_room_id uuid)`: auxiliar de RLS, devolve falso sem login.
- Flag: `insert into feature_flags (key, enabled, label) values ('sala_voz', false, 'Sala de voz com tela')`.

**Prova da RLS:** `scripts/seguranca/sala-voz.sql`, no molde de `fila-da-party.sql` (transação que sempre termina num erro proposital, então nada fica gravado), cobre: visitante não lê nada; logado fora da sala não lê a sala nem a lista; membro lê a própria; ninguém escreve em nenhuma tabela pela API; a data de nascimento não muda depois de gravada; `declare_birth_date` recusa data de outro usuário e data absurda. A prova fica vermelha quando a trava é revertida (rodada uma vez sem a política e sem a recusa de troca, com o resultado anotado no PR). `funcoes-abertas.sql` continua vazio.

## 8. Permissões

Uma função pura no servidor (`decideRoomAccess`, testada no Vitest) decide toda entrada e toda chamada ao SFU, nesta ordem, parando no primeiro "não":

1. Flag `sala_voz` ligada.
2. Sala existe e está `aberta`, antes de `closes_at`.
3. Conta identificada: identidade do Discord ou Steam vinculada em `steam_links`. Conta só de e-mail não entra (o Supabase de produção aceita cadastro por e-mail).
4. Conta não banida nem suspensa.
5. Data de nascimento informada; regra de idade (seção 9).
6. Membro: dono, ou membro `ativo` da mentoria, ou, na party, alguém com reserva `na_party` no mesmo ambiente (`is_test`) da sala, conferido a cada chamada.
7. Não expulso desta sala.
8. Lotação: pessoas online menos que `max_members`.

| Ação | Dono | Membro | Fora da sala |
|---|---|---|---|
| Entrar, ouvir, falar, mutar | sim | sim | não |
| Publicar voz | 1 faixa de áudio | 1 faixa de áudio | não |
| Compartilhar tela | sim (1 vídeo e 1 áudio de tela, uma tela por vez na sala) | só com `screen_policy = 'um_por_vez'` na mentoria (escolha 6) | não |
| Receber faixa | de membros ativos, sem bloqueio entre os dois | idem | não |
| Expulsar | sim | não | não |
| Bloquear, denunciar | sim | sim | não |
| Criar e encerrar sala | só admin | não | não |

## 9. ECA Digital e moderação

A Lei 15.211/2025 (Estatuto Digital da Criança e do Adolescente), em vigor desde 17/03/2026, vale para serviço "de acesso provável" por crianças e adolescentes (art. 1º), o caso de uma comunidade de Dota 2. A fiscalização é da ANPD, e a multa chega a R$ 50 milhões por infração (art. 35, II). O que a lei pede e o que a sala faz:

| Artigo | O que pede | Na fase 1 |
|---|---|---|
| Art. 9º, § 1º | verificação de idade confiável, **vedada a autodeclaração**, para conteúdo impróprio (pornografia e o que a lei proíbe para menores) | não se aplica à sala: voz entre jogadores não é conteúdo impróprio. A data declarada é o piso, registrada como risco na seção 17 |
| Art. 10 | experiência adequada à idade | data de nascimento na primeira entrada e regra de idade (abaixo) |
| Art. 13 | dado de idade usado só para isso | `user_birthdates` separada do perfil, lida só pela regra de entrada e pela moderação |
| Art. 17, § 4º, I | por padrão, restringir a comunicação com crianças e adolescentes por usuários não autorizados | sala privada, só o PPA cria, só quem pagou ou está na party entra |
| Arts. 17 e 18 | ferramentas de supervisão dos pais (ver com quem o menor fala, limitar tempo, gerenciar a conta) | fora da fase 1 porque menor não entra em sala de voz (escolha 1, recomendação A); entram na fase 2 |
| Art. 21, parágrafo único | jogo com interação por áudio ou vídeo limita a interação por padrão, para garantir o consentimento dos responsáveis | idem |
| Art. 24 | conta de até 16 anos vinculada à de um responsável | idem |
| Arts. 27 e 28 | canal de notificação; comunicar às autoridades conteúdo de exploração, abuso, sequestro e aliciamento, e reter os dados pelo prazo do Marco Civil | botão "Denunciar" em cada pessoa, aviso ao PPA na hora e procedimento abaixo |
| Art. 29, § 2º | notificação identificada, vedada a denúncia anônima | a denúncia sai da conta logada, com o nome de quem denuncia |

**Regra de idade.** A pessoa informa a data de nascimento uma vez, na primeira entrada numa sala de voz (escolha 2). A idade se calcula no fuso de São Paulo. Pela recomendação da escolha 1, quem tem menos de 18 anos vê "As salas de voz são para maiores de 18 anos por enquanto" e não entra. O servidor conta essas tentativas (sem guardar nada além do usuário e da data), para a decisão de abrir aos 16 e 17 anos ter número.

**Bloquear.** Usa o bloqueio que já existe (`friendships` com `blocked_by`, migration 168). Na sala, nenhum dos dois recebe a faixa do outro, e o servidor fecha na hora as faixas que já corriam entre eles.

**Expulsar.** O dono expulsa; a pessoa sai em até 2 s e não volta a esta sala. Na party, expulsar da sala não tira da fila (a fila é do painel `/admin/loja/fila`).

**Denunciar.** Motivos: assédio ou ofensa, conteúdo sexual, criança ou adolescente em risco, ameaça ou violência, discriminação, spam, outro; texto opcional de até 500 caracteres. Até 5 denúncias por pessoa por sala por hora. O PPA recebe o aviso no canal privado do Discord (o mesmo dos avisos de venda, com menção). A tela da denúncia mostra também os canais públicos: Disque 100 e a central de denúncias da SaferNet Brasil.

**Procedimento do PPA para denúncia grave** (criança ou adolescente em risco, conteúdo sexual): expulsar na hora; não apagar a sala, as sessões nem a denúncia (o cron não apaga o que tem denúncia aberta); banir a conta se confirmar; comunicar às autoridades, como manda o art. 27 (o formato e o prazo dependem de regulamento ainda por sair).

**Nada gravado.** O SFU só encaminha pacotes; a sala não usa gravação da Cloudflare (o RealtimeKit, que grava, não entra); nenhum servidor do FORMULADOTA recebe mídia. A sala avisa "Esta sala não é gravada". Não dá para impedir que alguém grave a própria tela: a regra do código de conduta vale para isso.

## 10. Guarda de dados

| Dado | Prazo | Por quê |
|---|---|---|
| Sessões (com IP e navegador) | 6 meses, depois o cron apaga | registro de acesso a aplicação, Lei 12.965/2014 (Marco Civil), art. 15, citado também pelo art. 27, § 2º do ECA Digital |
| Faixas publicadas e recebidas | 6 meses (apagam junto com a sessão) | base do custo, que só precisa de 30 dias |
| Métricas de qualidade | 90 dias | aceite e diagnóstico |
| Denúncias | sem apagar automático na fase 1 | apuração e o art. 27 |
| Data de nascimento | enquanto a conta existir (apaga junto com ela) | regra de idade |
| Áudio e vídeo | nunca guardados | nada gravado |

## 11. Controle de custo

**A conta.** A Cloudflare cobra o que sai dela para os navegadores: os primeiros 1.000 GB por mês são grátis, somando SFU e TURN, e cada GB acima custa US$ 0,05. Publicar (o que entra na Cloudflare) não é cobrado, e o tráfego entre o TURN e o SFU também não.

| Uso | Taxa usada na estimativa | Por hora |
|---|---|---|
| Tela 1080p a 30 quadros, teto de 4 Mbps (mais 10% de cabeçalho) | 4.400 kbps por pessoa que assiste | cerca de 2 GB por espectador |
| Áudio da tela (estéreo) | 128 kbps por pessoa que assiste | 58 MB |
| Voz (Opus) | 64 kbps por faixa recebida | 29 MB por faixa |

- Mentoria de 90 minutos com tela: cerca de 3 GB. O teto de vagas do catálogo (8 mentorias e 3 acompanhamentos de 4 sessões por mês) dá no máximo 20 sessões, uns 60 GB por mês.
- Party de 5 pessoas só com voz: cada uma recebe 4 vozes, cerca de 0,6 GB por hora de live somando todos. 20 lives de 4 horas: cerca de 46 GB por mês.
- A mesma party com a tela do PPA para os 4: cerca de 10 GB por hora, e 20 lives de 4 horas chegariam a 800 GB. Por isso a recomendação da escolha 5: a sala da party é só de voz (eles já veem o jogo na própria tela e a live na Twitch).

**Limites por sala.** Mentoria até 2 pessoas, party até 6; uma tela por vez; vídeo só do dono (ou do aluno na mentoria, pela escolha 6); uma sessão por pessoa; uma faixa recebida por pessoa para cada faixa publicada. O teto de bitrate vai no próprio envio (`maxBitrate` e `maxFramerate` do `RTCRtpSender`), e quem publica vídeo é sempre de confiança (o dono).

**Teto.** 800 GB estimados nos últimos 30 dias corridos (`voice_settings.cap_gb_30d`). Ao chegar lá, o servidor recusa toda nova transmissão de tela; a voz continua (os 200 GB de folga dariam mais de 6.000 horas de voz recebida) e a tela que já está no ar termina normalmente. Avisos ao PPA no canal privado do Discord, uma vez por limiar: 50%, 80% e 100%, e um aviso de pico quando uma hora passa de 20 GB estimados.

**Conferência.** O painel `/admin/salas` mostra a estimativa (a que conta para o teto) e o medido pelos navegadores (soma de `bytes_received`). Depois da mentoria real, os dois vão ao lado do número do painel da Cloudflare na nota de aceite. Se a conta tiver outro uso do Realtime (outro projeto), o teto do site não o enxerga: ao criar o app, conferir no painel se já existe outro e anotar aqui.

## 12. Limites do navegador

| Situação | O que acontece | O que a sala faz |
|---|---|---|
| Chrome ou Edge no Windows, compartilhando **a janela do Dota** | desde o Chrome 141 o `windowAudio: "window"` oferece capturar só o áudio daquela janela | pede `windowAudio: "window"`; é o caminho recomendado ao PPA: só o som do jogo vai, sem a voz dos outros e sem Spotify ou Discord |
| Compartilhando **a tela inteira** com "compartilhar áudio do sistema" | o áudio do sistema inclui a voz dos outros que a própria sala está tocando: eles se ouvem com atraso (eco) | pede `restrictOwnAudio: true` (Chrome 141, Windows e Mac), que tira da captura o som da própria página; sem suporte, a tela avisa o PPA para compartilhar a janela |
| Versão do Chrome | os dois recursos acima aparecem no Chrome Platform Status como em envio no Chrome 141 de computador, com o estado ainda marcado como proposto | a sala confere `getSupportedConstraints()` e mostra o aviso quando faltar; conferir no Chrome do PPA no teste real |
| Dota em tela cheia exclusiva | a captura da janela pode sair preta | orientar "Janela sem bordas" nas configurações do Dota; conferir no teste real |
| Microfone do PPA com o jogo no alto-falante | o cancelamento de eco do navegador só tira o som que o próprio navegador toca | fone de ouvido (o PPA já usa nas lives) |
| Atalho global (apertar para falar) | navegador não recebe tecla quando o Dota está em foco | microfone aberto com supressão de ruído e botão de mutar; apertar para falar fica para o aplicativo (fase 3) |
| Firefox e Safari | não capturam áudio do sistema nem da janela | entram para ouvir e falar; compartilhar tela com áudio só no Chrome ou Edge |
| Celular | o iPhone e boa parte dos Androids não compartilham tela pelo navegador | entra para ouvir e falar; a tela da sala não quebra em 390 px |
| Som tocando sozinho | o navegador só toca áudio depois de um clique | botão "Entrar na sala" |
| Carga da máquina do PPA | Dota, OBS da live e o Chrome codificando 1080p ao mesmo tempo | `qualityLimitationReason` (cpu ou banda) vai nas métricas; ajustar o teto se o teste mostrar limite |

Pedido de captura da tela:

```ts
navigator.mediaDevices.getDisplayMedia({
  video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, restrictOwnAudio: true },
  systemAudio: "include",
  windowAudio: "window",
  selfBrowserSurface: "exclude",
  surfaceSwitching: "include",
});
```

A faixa de vídeo vai com `contentHint = "detail"` e `degradationPreference = "maintain-resolution"` (o aceite pede 1080p; sob aperto, o navegador baixa quadros antes de baixar a resolução) e `maxBitrate` de 4 Mbps. O teste real decide se troca por `"motion"`.

## 13. Métricas (`getStats`)

A cada 5 s o cliente lê `RTCPeerConnection.getStats()`; a cada 10 s manda um resumo na consulta de estado, gravado em `voice_room_stats`.

| Métrica | De onde vem |
|---|---|
| Perda de pacote (%) | `inbound-rtp`: diferença de `packetsLost` sobre `packetsLost + packetsReceived` no intervalo, em todas as faixas recebidas |
| Jitter (ms) | `inbound-rtp.jitter`, a maior entre as faixas de áudio |
| RTT (ms) | `candidate-pair` selecionado: `currentRoundTripTime` |
| Voz picotada (%) | `inbound-rtp` de áudio: diferença de `concealedSamples` sobre `totalSamplesReceived` |
| Tela recebida | `inbound-rtp` de vídeo: `frameWidth`, `frameHeight`, `framesPerSecond`, `totalFreezesDuration` |
| Bytes | `bytesReceived` e `bytesSent` no intervalo (o consumo medido) |
| TURN em uso | candidato local do par selecionado com `candidateType = 'relay'` |
| Limite do envio | `outbound-rtp` de vídeo: `qualityLimitationReason` |

A tela da sala mostra a qualidade de cada pessoa em três níveis (boa, instável, ruim), com os números ao passar o mouse.

**Consulta do aceite** (roda no banco depois da mentoria real; o resultado vai para a nota):

```sql
select s.user_id,
       count(*) as amostras,
       round(max(s.packet_loss_pct)::numeric, 2) as perda_max_pct,
       round(avg(s.packet_loss_pct)::numeric, 2) as perda_media_pct,
       round(percentile_cont(0.95) within group (order by s.jitter_ms)::numeric, 1) as jitter_p95_ms,
       round(percentile_cont(0.95) within group (order by s.rtt_ms)::numeric, 1) as rtt_p95_ms,
       round(avg(s.audio_concealed_pct)::numeric, 2) as voz_picotada_pct,
       round(100.0 * avg(case when s.video_height >= 1080 then 1 else 0 end)
             filter (where s.video_height > 0), 1) as tempo_em_1080p_pct,
       round(sum(s.bytes_received) / 1e9, 2) as gb_recebidos
  from public.voice_room_stats s
 where s.room_id = '<id da sala>'
 group by s.user_id;
```

## 14. Interface da fase 1

Usa o kit `src/components/v2` (painel, placa, `v2Page`), os tokens atuais e ícones do `lucide-react`, sem linguagem visual nova: a sessão de design troca a pele depois. Textos em `messages/{pt,en,es}.json` com as mesmas chaves.

- `/sala/[id]`: título e tipo da sala, "Esta sala não é gravada", estado da conexão; no centro, a tela compartilhada; à direita, a lista de pessoas (avatar quadrado, nick, microfone, indicador de fala, qualidade, menu com Expulsar, Bloquear e Denunciar); embaixo, Mutar, Compartilhar tela (dono), volume do jogo e Sair. Visitante deslogado vê o botão de entrar com o Discord, que volta para a mesma sala (por isso `/sala` entra nas rotas públicas do middleware; a página e as rotas da API exigem login).
- `/admin/salas`: salas abertas, criar sala de mentoria a partir dos horários pagos, criar a sala da party da live no ar, link e convite para copiar, encerrar, consumo dos 30 dias (estimado e medido) e denúncias abertas.

Entrada pela página da party e pela página do pedido fica para depois do aceite: na fase 1 o PPA manda o link (essas páginas estão com outras sessões).

## 15. Escolhas de produto (decisão do PPA)

| # | Escolha | Opções | Recomendação |
|---|---|---|---|
| 1 | Menor de idade na sala de voz | A: menor de 18 não entra na fase 1. B: 16 e 17 entram só na mentoria, com consentimento do responsável registrado e o responsável podendo entrar junto; menor de 16 não entra. C: todos, com as ferramentas de supervisão completas (fase 2) | **A**: sem menor na sala, as obrigações de supervisão dos arts. 17, 18, 21 e 24 não entram na fase 1, e a fase 1 sai em dias. A conta de tentativas barradas diz se B vale a pena |
| 2 | Onde pedir a data de nascimento | A: na primeira entrada numa sala de voz. B: no cadastro do site, para todos | **A**: só quem usa a voz responde; não põe um passo a mais no caminho até a compra, que a sessão de design está encurtando |
| 3 | Comprador de mentoria que pagou sem login | A: convite de uso único que o PPA manda; o PPA vê quem usou e pode expulsar. B: casar pelo e-mail do pedido | **A**: o e-mail do Discord muitas vezes é outro que o do pedido |
| 4 | Quem entra na sala da party | A: só quem está na party agora. B: a party e quem espera na fila, só ouvindo | **A**: menos gente estranha falando junto, e quem sai da party sai da sala sozinho |
| 5 | Tela na sala da party | A: só voz. B: o PPA pode compartilhar | **A**: os jogadores já veem o jogo e a live; com tela para 4, 20 lives de 4 horas chegariam ao teto de 800 GB |
| 6 | Quem compartilha tela na mentoria | A: só o PPA. B: o aluno também, um de cada vez (o PPA vê o jogo do aluno ao vivo) e o PPA corta a tela do aluno | **B**, se o PPA analisa o jogo do aluno ao vivo: dobra o valor da mentoria pelo mesmo custo (um espectador). A prova de conceito sai com A e B fica num interruptor por sala |
| 7 | Teto de tráfego | 800 GB em 30 dias corridos com avisos em 50% e 80%, ou 500 GB | **800 GB**: o uso esperado fica perto de 100 GB por mês, e o teto existe para erro ou abuso |
| 8 | Qualidade da tela | 1080p a 30 quadros até 4 Mbps (cerca de 2 GB por hora por espectador), ou 1080p a 60 até 6 Mbps (cerca de 3 GB) | **30 quadros**: o aceite pede 1080p; o teste real diz se 60 faz falta |

Precisam do sim do PPA, numa mensagem só pela sessão central: criar o app do Realtime e a chave do TURN na conta dele (sem custo até 1.000 GB por mês; o teto do site para em 800); aprovar a migration antes do merge e da aplicação em produção; as escolhas acima; o dia da mentoria real de 1 hora.

## 16. Fases 2 e 3 (só documento)

**Fase 2: canais da comunidade.** Canais de texto e de voz abertos aos membros, aproveitando o chat que já existe (`dm_messages`, `party_messages`, `lobby_messages`): tabela de canais com acesso por nível ou papel, moderadores além do PPA, modo lento, fila de moderação das denúncias. Voz em canal com dezenas de pessoas pede outra sinalização (Durable Object com WebSocket ou Supabase Realtime) e simulcast para tela com vários espectadores; transmissão de um para muitos pode sair mais barata pelo Cloudflare Stream (WHIP e WHEP), a comparar. Se menores entrarem: conta de até 16 anos vinculada à de um responsável (art. 24), consentimento dos responsáveis (art. 21), tempo de uso visível e limitável (art. 17, IV), o responsável vendo com quais adultos o menor fala (art. 18, III).

**Fase 3: aplicativo de computador.** O "app" que o projeto já prevê (Tauri): captura do áudio só do processo do Dota pelo próprio Windows, apertar para falar com atalho global, overlay sobre o jogo e aviso de chamada fora do navegador. Usa o mesmo SFU e as mesmas rotas de autorização.

## 17. Riscos e o que revisitar

| Risco | Efeito | O que fazer |
|---|---|---|
| Idade declarada pode ser mentira | menor entra mentindo | conta identificada e data que não muda; denúncia "criança ou adolescente em risco"; se a ANPD regulamentar verificação mais forte para esse tipo de serviço, trocar o método |
| partytracks parar de ser mantido | cliente sem correção | o módulo `src/lib/sala/cliente/` isola a troca por cliente próprio |
| Estimativa de custo errar para baixo | conta acima do grátis | a taxa usada é o teto de cada tipo mais folga; comparar com o painel da Cloudflare depois do teste real e todo mês na primeira fase |
| Chrome do PPA sem `windowAudio` ou `restrictOwnAudio` | eco ou som do sistema inteiro | aviso na tela e orientação de compartilhar a janela; conferir no teste real |
| Supabase fora do ar | ninguém entra, quem está dentro perde o batimento | a mídia segue até a sessão cair; a sala mostra o erro |
| Cloudflare Realtime fora do ar | sem sala | sem plano B automático na fase 1; o Discord segue para voz |

## 18. Provas

- **Unitárias (`pnpm test`):** permissões (`decideRoomAccess` com cada "não" da seção 8), idade no fuso de São Paulo (aniversário no dia, 29 de fevereiro), leitura do SDP (mid para tipo), regras de publicar e receber, estimativa de custo (janela de 30 dias, faixa sem fim, sessão sem batimento), limiares de aviso, resumo das métricas.
- **Banco:** `scripts/seguranca/sala-voz.sql` e `funcoes-abertas.sql` (seção 7).
- **Ponta a ponta (`pnpm sala:e2e`):** servidor local, banco de produção com sala e usuários de teste (`is_test`, criados e apagados pelo próprio teste) e o app real do Realtime. Duas pessoas com mídia falsa do Chrome (`--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream` e a captura de tela automática): as duas se ouvem (`bytesReceived` de áudio maior que zero dos dois lados), o dono compartilha a tela e o aluno recebe (`bytesReceived` de vídeo maior que zero e altura do quadro maior que zero), o aluno mutado, a lista com as duas pessoas, a expulsão (o aluno sai e o servidor recusa a volta), a denúncia gravada, o bloqueio que corta o áudio, a conta de menor barrada, o teto que recusa a tela, alguém de fora recusado e a flag desligada escondendo a sala de todos.
- **Aceite real:** uma mentoria de verdade de 1 hora do PPA com a tela em 1080p, voz sem corte perceptível, perda de pacote abaixo de 2% e consumo dentro da franquia grátis, medidos pela consulta da seção 13 e registrados na nota compartilhada. O dia se combina pela sessão central.

## 19. Entrega

Um PR por etapa, nunca na main; merge com a verificação `verificar` do GitHub verde (a da Vercel falha em todos os PRs e não conta).

1. Esta spec.
2. Ligar o Realtime: app do SFU e chave do TURN criados com o sim do PPA; segredos direto para `wrangler secret put` e para os arquivos de ambiente, sem passar pela tela.
3. Migration com a prova de RLS: merge e aplicação em produção só com o OK do PPA. Aplicação pela Management API, registrada em `supabase_migrations.schema_migrations` com versão por data (nunca `supabase db push`).
4. Prova de conceito atrás da flag, com as provas da seção 18; deploy pela cópia do WSL com a trava `flock /root/deploy-loja.lock`, conferido por `pnpm cf:verificar`.
5. Mentoria real e nota de aceite.
6. Novidade para o jogador só com o OK do PPA.

## 20. Fontes

Consultadas em 23/11/2026.

- Cloudflare Realtime, API do SFU (base `https://rtc.live.cloudflare.com/v1`, `Authorization: Bearer <segredo do app>`, esquema OpenAPI `realtime-api-2024-05-21.yaml`): https://developers.cloudflare.com/realtime/sfu/ e https://developers.cloudflare.com/realtime/static/realtime-api-2024-05-21.yaml
- Preço (US$ 0,05 por GB de saída, 1.000 GB grátis por mês somando SFU e TURN, tráfego TURN e SFU sem cobrança): https://developers.cloudflare.com/realtime/sfu/platform/pricing/ e o FAQ do TURN
- Limites (50 requisições por segundo por sessão, faixa sem pacote por 30 s é descartada, codecs H.264, H.265, VP8, VP9, AV1 e Opus): https://developers.cloudflare.com/realtime/sfu/platform/limits/
- Credenciais do TURN (`/v1/turn/keys/{id}/credentials/generate-ice-servers`) e análise por GraphQL do TURN (permissão "Account Analytics"): https://developers.cloudflare.com/realtime/turn/
- Criar app e chave pela API da conta (`POST /accounts/{account_id}/calls/apps` e `/calls/turn_keys`, permissão "Calls Write" ou "Realtime Admin"): https://developers.cloudflare.com/api/resources/calls/
- partytracks 0.0.56 (código do cliente e do servidor lido no pacote publicado no npm): https://www.npmjs.com/package/partytracks
- Chrome, `systemAudio`: https://developer.chrome.com/docs/web-platform/screen-sharing-controls ; `restrictOwnAudio` e `windowAudio` no Chrome Platform Status: https://chromestatus.com/feature/5128140732760064 e https://chromestatus.com/feature/5072779506089984
- Lei 15.211/2025 (ECA Digital), texto do Planalto: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm
- Lei 12.965/2014 (Marco Civil da Internet), art. 15: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
