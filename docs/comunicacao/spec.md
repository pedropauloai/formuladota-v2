# Comunicação dentro do FORMULADOTA: fase 1, salas de voz com tela

Aberta em 23/11/2026; revista em 24/11/2026 com as correções do PPA (sala pública da live na fase 1, só maiores de 18 com uma marcação, qualidade escolhida na hora). Estado: proposta. O que o PPA já decidiu está marcado com a data; o que espera a decisão dele está na seção 15, com a recomendação. DoD da frente: [docs/definicao-de-pronto.md](../definicao-de-pronto.md), seção "Comunicação, fase 1".

## 1. Por que existe

Em 17/08/2026 o Discord desligou vídeo, Go Live e compartilhamento de tela no Brasil por ordem da ANPD; texto e voz continuam lá. O PPA dá mentoria de Dota e precisa mostrar a tela. Em 23/11/2026 ele decidiu que a comunicação (voz, tela e, depois, canais) passa a acontecer dentro do FORMULADOTA. O Discord fica para outros jogos, e o login pelo Discord e pela Steam continua como está.

O caso principal, nas palavras do PPA: durante a live, ele anuncia o canal dele no site, e quem assiste entra na sala pública para ver a tela dele sem o atraso das plataformas de streaming e interagir de verdade ("é assim que tem que fazer").

## 2. Escopo

**Fase 1 (esta spec, com código):** salas de voz com tela no próprio site, atrás da flag `sala_voz` (desligada por padrão e autoritativa: desligada, some para todos, inclusive o admin). Três tipos:

| Tipo | Quem entra | Quem fala | Tela |
|---|---|---|---|
| **Sala pública da live** (palco) | qualquer conta identificada, maior de 18, dentro dos lugares | o PPA e quem ele chamar | a do PPA, com camadas de qualidade (simulcast) |
| **Mentoria** (privada) | o PPA e quem comprou o horário (pedido pago) | todos | a do PPA; a do aluno, se a sala permitir |
| **Party** (privada) | o PPA e quem está na party da live agora | todos | só voz, por padrão |

O que toda sala faz: voz com cancelamento de eco, supressão de ruído e ganho automático; mutar; o dono compartilha a tela com o áudio do jogo e escolhe a qualidade na hora; lista de quem está; denunciar; o dono muta, expulsa e bane; nada gravado; teto de custo; métricas de qualidade e de atraso. A sala pública tem ainda chat de texto com moderação, mão levantada e lugares contados.

**Fora da fase 1 (só neste documento, seção 16):** canais de texto e voz da comunidade (fase 2) e aplicativo de computador (fase 3). Também fora: gravação, LiveKit ou servidor de mídia próprio, mudança em pagamento, no login do Discord, nos tokens e no kit de design, e a barra de cima do site (é da sessão de design; ela recebe as rotas da seção 14).

## 3. Requisitos

### Funcionais

| # | Requisito |
|---|---|
| R1 | Só o admin (hoje, o PPA) cria sala. A sala pública abre durante a live; mentoria e party são privadas. |
| R2 | Mentoria nasce de um horário pago da agenda; quem pagou sem login entra por convite de uso único. |
| R3 | Party nasce da live no ar; membro é quem está na party naquele momento. |
| R4 | Entrar exige conta identificada (Discord ou Steam vinculada) e a marcação "tenho 18 anos ou mais", feita uma vez. |
| R5 | Voz com `echoCancellation`, `noiseSuppression` e `autoGainControl`; mutar. |
| R6 | Quem pode compartilha a tela com áudio pelo `getDisplayMedia` e escolhe a qualidade (resolução e quadros) vendo o consumo estimado por hora: no canal de voz comum (voz livre), qualquer um na sala, como o Go Live do Discord; no canal de palco, quem está no palco; na mentoria e na party, o dono (pedido do PPA de 24/11/2026). Uma tela por vez em cada sala. |
| R7 | Na sala pública, a plateia ouve e assiste; fala só quem o PPA chamar; quem quer falar levanta a mão. |
| R8 | Na sala pública, chat de texto: o dono apaga mensagem, e qualquer um denuncia mensagem ou pessoa. |
| R9 | O dono muta, expulsa (sai desta sala) e bane (não entra mais nas salas dele). |
| R10 | Lugares contados na sala pública; o Battlepass entra mesmo com a sala cheia (escolha 9). |
| R11 | A tela vai em duas camadas (simulcast). A qualidade é só de quem transmite: quem assiste recebe a camada alta, sem escolher nada (pedido do PPA de 24/11/2026: "o consumo não preocupa"). A leve fica para quem está fora da página da sala e, só para não congelar, para quem tem a conexão fraca: dois congelamentos em 20 s descem para a leve por 60 s, e a espera dobra se a tela cair logo depois de voltar, até 5 min (`fluidez.ts`). O SFU só troca de camada quando quem transmite para de mandar a alta (`ridNotAvailable`); a troca dele por banda prendia na leve e congelava 3 s a cada tentativa de subir. |
| R12 | Nada gravado: nenhuma mídia passa por servidor do FORMULADOTA nem é guardada pela Cloudflare. |
| R13 | Teto de tráfego que bloqueia tela nova, baixa a camada da plateia antes disso e avisa o PPA. |
| R14 | Métricas de cada pessoa a cada 10 s: perda de pacote, jitter, RTT, resolução e quadros, e o atraso estimado. |
| R15 | Navegar pelo site sem cair da sala, como no Discord (exigência do PPA, 24/11/2026): a conexão (a `RTCPeerConnection`, as faixas e o batimento) vive fora da página da sala, e um painel de voz compacto aparece em todas as páginas com o nome da sala, quem está falando, mutar, sair e voltar para a sala. A navegação interna é pelo `Link` do Next (no cliente). Recarregar a página volta para a sala sozinho. |
| R16 | Servidor único do FORMULADOTA, como no Discord e no TeamSpeak (pedido do PPA, 24/11/2026): árvore de canais de texto e de voz à esquerda, com quem está em cada canal de voz antes de entrar, e um clique entra. O canal de voz pode ser palco (a plateia ouve, o dono chama) ou livre (quem entra já fala), com limite de pessoas mostrado como "3/5" (5 é uma party do Dota); cheio, não entra mais ninguém (só o dono). O canal de texto é só o chat, guardado enquanto o canal existir. Canal privado: só Battlepass ou vaga na party do dia, com cadeado na árvore. Mentoria e party aparecem como salas privadas para quem pode entrar. O PPA cria, renomeia, ordena, muda o modo, o limite, o público e quem escreve, e apaga canais no `/admin/salas`; banimento e convite seguem valendo. Para o PPA, os canais de voz servem para a comunidade formar grupo e jogar junto (e, quem sabe, virar lobby). |

### Não funcionais

| Tema | Meta | Como se mede |
|---|---|---|
| Atraso da tela e da voz | **menos de meio segundo** para 95% das amostras (nunca se promete "zero") | atraso estimado pela `getStats` (seção 13) |
| Qualidade da tela | resolução e quadros da qualidade escolhida em 90% do tempo de tela (na mentoria, 1080p) | `voice_room_stats.video_height` e `video_fps` |
| Perda de pacote | abaixo de 2% na hora inteira | `voice_room_stats.packet_loss_pct` |
| Voz | sem corte perceptível: amostras ocultadas abaixo de 2% e nenhuma reclamação | `audio_concealed_pct` mais o relato do PPA |
| Custo | dentro do orçamento que o PPA escolher (escolha 7) | estimativa do servidor e painel da Cloudflare (seção 11) |
| Escala | sala pública com até 50 pessoas sem pesar no banco | uma consulta por batimento (ADR-004) |

### Restrições

Site em Next.js 16 no Cloudflare Workers pelo OpenNext; Supabase com RLS obrigatória; PPA não lê código (a prova é comando que passa ou falha); computador primeiro (1920 e 3440), celular só não pode quebrar.

## 4. Arquitetura

```
 Navegador (Chrome)                    Worker do site (Next.js no OpenNext)          Cloudflare Realtime
 +----------------------+  HTTPS + cookie  +-------------------------------+  HTTPS + segredo  +------------------+
 | /sala/[id]           | ---------------> | /api/sala/[id]/rtc/*          | ----------------> | API do SFU       |
 | RTCPeerConnection    | <---- SDP ------ |   autoriza cada chamada       | <---------------- | rtc.live.        |
 | (partytracks)        |                  |   grava sessão, faixa, custo  |                   |  cloudflare.com  |
 |                      |                  | /api/sala/[id]/estado (2-3 s) |                   +------------------+
 |                      |                  |   uma função no banco por     |                   +------------------+
 |                      |                  |   batimento (estado + chat)   |                   | SFU na borda     |
 |                      | ================ mídia WebRTC (UDP, ou TURN) =====================> | (camadas f e h)  |
 +----------------------+                  +---------------+---------------+                   | TURN             |
                                                           v                                   +------------------+
                                            Supabase: salas, membros, sessões, faixas,
                                            faixas recebidas (custo), chat, banidos, métricas
```

- O navegador fala WebRTC direto com o SFU da Cloudflare, que só encaminha os pacotes (não decodifica nem grava).
- Toda chamada à API do SFU passa pelo servidor do site, que usa o segredo do app e decide se a pessoa pode fazer aquilo. O navegador nunca vê o segredo.
- A tela do PPA sobe em duas camadas (simulcast): `f`, a qualidade que ele escolheu, e `h`, metade da resolução. O SFU entrega a cada pessoa a camada que o servidor pediu por ela.
- O TURN da Cloudflare entra quando a rede da pessoa bloqueia UDP direto. A credencial é de curta duração, marcada com a sala e revogada ao expulsar ou encerrar.
- Supabase guarda quem pode entrar, quem está online, que faixa cada um publicou e recebeu (base do custo), o chat, os banidos, as métricas e as denúncias. O navegador não grava nada direto no banco.

### Fluxo da sala pública

1. Com a live no ar, o PPA abre a sala pública em `/admin/salas` e anuncia `formuladota.com.br/sala`, que leva à sala aberta dele.
2. Quem chega entra com o Discord (se ainda não entrou), marca "tenho 18 anos ou mais" na primeira vez e clica em "Entrar na sala" (o clique libera o som no navegador).
3. O PPA compartilha a tela: escolhe a qualidade numa lista que mostra o consumo por hora de cada opção com a plateia do momento, e depois a janela do Dota.
4. A plateia ouve o PPA, assiste à tela e escreve no chat. Quem quer falar levanta a mão; o PPA chama, a pessoa fala, e ele devolve à plateia quando quiser.
5. Expulsar tira da sala na hora; banir também impede a volta em qualquer sala do PPA.

## 5. Decisões de arquitetura (ADR)

### ADR-001: mídia pelo Cloudflare Realtime SFU

**Estado:** aceita (sessão central, 23/11/2026; o PPA aprovou criar o app em 23/11: "Pode criar os dois").

**Contexto.** Voz e tela com baixo atraso no Brasil, sem servidor de mídia para manter e com custo previsível. O site já roda na Cloudflare.

| | Cloudflare Realtime SFU | LiveKit Cloud | Servidor próprio |
|---|---|---|---|
| Complexidade | baixa: API HTTPS, sem servidor | baixa | alta |
| Custo | 1.000 GB grátis por mês (SFU e TURN juntos), depois US$ 0,05 por GB de saída | por minuto de participante | VPS fixa mais banda |
| Escala | borda da Cloudflare, sem região | boa | o que a máquina aguentar |

**Decisão.** Cloudflare Realtime SFU com o TURN da própria Cloudflare; interface própria no site. **Consequência:** a Cloudflare não tem teto de gasto; o limite mora no site (ADR-005).

### ADR-002: o servidor do site autoriza toda chamada ao SFU

**Estado:** proposta. A API do SFU usa um segredo único do app; com ele, qualquer um publica e recebe qualquer faixa. A rota `/api/sala/[id]/rtc/[...caminho]` recebe as chamadas que o cliente faria ao SFU, confere tudo (seção 8) e só então repassa. Ela grava cada sessão, cada faixa publicada (o tipo vem do SDP da oferta) e cada faixa recebida com a camada pedida (base do custo). Na sala pública, o servidor reescreve a camada pedida pela regra de custo.

### ADR-003: cliente WebRTC pelo partytracks, atrás de um módulo nosso

**Estado:** proposta. partytracks 0.0.56 (Cloudflare, licença ISC, o mesmo do Orange Meets): negocia em fila, refaz a conexão sozinho e já trata simulcast. Versão fixa, importada só por `src/lib/sala/cliente/conexao.ts`, para trocar por cliente próprio sem mexer na tela. Revisitar se ficar 12 meses sem versão nova.

### ADR-004: estado por batimento, com uma consulta só ao banco

**Estado:** proposta (revista em 24/11/2026 para a sala pública e para o plano grátis do Supabase).

**Contexto.** O projeto do FORMULADOTA está no plano grátis do Supabase: 5 GB de saída de dados por mês para o site inteiro e 500 MB de banco (medido em 24/11: 81 MB). Se cada pedido de estado trouxesse do banco a lista de membros com nome e avatar e as últimas 50 mensagens (cerca de 30 KB), 30 pessoas pedindo a cada 3 s, 3 horas por dia, dariam perto de 100 GB por mês, 20 vezes a franquia; estourada a franquia, o Supabase restringe o projeto e o site inteiro para.

**Decisão.** Separar o que é comum da sala do que é de cada pessoa:

- **Estado comum** (`voice_room_snapshot`): quem está online com papel, microfone e mão, as faixas rotuladas, o chat novo, as mensagens apagadas e quem foi expulso. É igual para todos, então o servidor guarda na memória por 3 s e pede ao banco só o chat posterior ao que já tem. Cliente pergunta a cada 2 s (dono e quem fala) ou 3 s (plateia), e quase sempre a resposta sai da memória.
- **Batimento da pessoa** (`voice_room_tick`): a cada 10 s, ou na hora em que ela muta ou levanta a mão, grava presença, microfone e mão e devolve o contexto da regra de acesso, os bloqueios e as faixas que ela recebe. Online é quem bateu nos últimos 30 s. A decisão de acesso fica guardada no servidor até o próximo batimento.
- **Nome e avatar** (`voice_room_identities`): uma vez por pessoa, pela rota `pessoas`.

**Conta.** Pior caso planejado (30 pessoas, 3 horas por dia, todo dia): estado comum de cerca de 4 KB a cada 3 s por instância do servidor, mais 30 batimentos de cerca de 0,7 KB a cada 10 s, dá perto de 1,5 GB por mês. As métricas da plateia vão a cada 30 s (não 10 s) e ficam 30 dias, para o banco não passar de 500 MB. As regras continuam em TypeScript puro, testadas. Supabase Realtime e Durable Object ficam para a fase 2, com centenas de pessoas; subir o Supabase para o plano pago (US$ 25 por mês) tira a pressão, e é decisão do PPA.

### ADR-005: custo estimado no próprio servidor, teto em 30 dias corridos

**Estado:** proposta. O servidor sabe toda faixa que cada pessoa recebe, com início, fim e camada. A estimativa é a soma de `duração x bitrate da camada` (com 10% de cabeçalho no vídeo), um limite superior do que a Cloudflare mede. O teto vale para os últimos 30 dias corridos, porque o ciclo de cobrança pode não começar no dia 1. As métricas dos navegadores dão o consumo medido ao lado, para comparar.

### ADR-006: simulcast em duas camadas, com a camada escolhida pelo servidor

**Estado:** revisada em 24/11/2026. A tela sobe em duas camadas, `f` (a qualidade escolhida) e `h` (metade da resolução). Quem assiste recebe a `f`, sem escolher nada: a qualidade é de quem transmite. A `h` vale para quem está fora da página da sala e, por um tempo, para quem tem a tela congelando de novo e de novo (a proteção mora no navegador de quem assiste, `fluidez.ts`). O SFU só troca quando quem transmite para de mandar a `f`: a troca dele por banda (`priorityOrdering: asciibetical`) prendia na `h` e congelava 3 s a cada tentativa de subir, mesmo com banda sobrando. A regra antiga (plateia da sala pública na leve, a alta só abaixo de metade do teto) saiu: medida no `pnpm sala:tela`, a camada leve chegava a 17 a 48 quadros por segundo, e o PPA disse que o consumo não preocupa. O teto que barra tela nova continua. Subir duas camadas pede mais upload do PPA (que já transmite para a Twitch); a medida no teste real diz se cabe.

### ADR-007: a sala vive fora da página

**Estado:** aceita (R15). A sessão da sala (`SessaoSala`, que já não dependia do React) passa a morar num registro único da aba (`src/lib/sala/cliente/registro.ts` e `sala-ativa.ts`): a página `/sala/[id]` só mostra a sessão do registro, e o painel de voz (`src/components/sala/painel-voz.tsx`, montado no `ClientShell`) lê a mesma sessão. As vozes tocam em elementos de áudio fora do DOM, então seguem tocando na troca de página.

- **Sair:** só pelo botão Sair, ao entrar em outra sala ou ao fechar ou recarregar a aba (`pagehide` manda a saída pelo `sendBeacon`). Trocar de página no site não sai.
- **Recarregar:** a sala fica anotada no `sessionStorage` da aba e volta sozinha 1,5 s depois de a página abrir, para a saída da página anterior chegar antes ao servidor. Se o navegador segurar o som por falta de clique, a sala e o painel mostram "Ativar o som da sala".
- **Custo:** fora da página da sala ninguém vê a tela: ela segue chegando na camada leve e volta à escolhida ao abrir a sala. A faixa não é solta nem pedida de novo, porque criar faixa no meio da conexão às vezes quebra a renegociação no Chrome ("RTP extension ID reassignment not supported", visto no e2e em 24/11/2026); trocar a camada não renegocia.
- **Ligação que trava:** quando uma faixa pedida não chega nem na segunda tentativa (8 s cada), o navegador dá a conexão por perdida, ou a voz some do servidor duas vezes seguidas, a sessão sai e entra de novo por baixo (2 ou 3 s, "Reconectando" na tela). Visto no e2e em 24/11/2026: depois de o dono parar e voltar a compartilhar, a renegociação às vezes matava a sessão do ouvinte no SFU ("Session appears to be disconnected"). Quem compartilhava a tela precisa escolher a janela de novo, porque o navegador só abre a escolha com um clique.
- **Peso do site:** o painel vai em todas as páginas, mas o código da conexão (partytracks e rxjs) só carrega na página da sala ou quando há sala anotada para retomar.
- **Painel:** no canto de baixo, em cima da party, como no Discord (escolha do PPA em 24/11/2026, entre essa e uma pílula dentro da barra de cima).

### ADR-008: cada canal é uma sala

**Estado:** aceita (R16). O canal não é uma tabela nova: é uma linha de `voice_rooms` com lugar na lista (`channel_position`, migration 198). O canal de texto (`kind = 'texto'`) herda da sala o chat, a moderação (apagar, expulsar, banir), o ritmo, a denúncia, a porta dos 18 anos, o benefício e a presença por batimento, sem duplicar regra; ele nunca abre sessão no SFU nem gera TURN (o intermediário recusa com `sala_sem_midia`). O canal de voz é a sala de palco com o modo (`voice_mode`): no livre, a regra de acesso devolve falante a quem entra, e a linha antiga da plateia vale como falante (`effectiveRole`), então a voz de todos chega a todos; cheio, só o Battlepass fura a fila. Canal fica aberto (`closes_at` em 2100) até o PPA apagar, e apagar encerra a sala como antes. A lista sai de duas funções só da service role: `voice_channel_list` (igual para todos, guardada 5 s por instância, com até 12 pessoas por canal de voz) e `voice_private_rooms` (as privadas da pessoa, 15 s). A coluna mora no layout da `/sala`, então trocar de canal não derruba a voz (ADR-007). O limite é o `max_members` da sala (lista pela migration 200): na voz livre ninguém fura a lotação, nem o Battlepass, porque o limite é o tamanho do grupo; no palco da live vale a escolha 9 (o Battlepass e quem foi chamado entram cheio). Tela compartilhada por qualquer um na voz livre fica para depois: hoje só o dono compartilha no canal de voz.

## 6. Rotas do servidor

Todas exigem login (cookie do Supabase) e a flag ligada, validam o corpo com Zod e respondem em JSON no formato do SFU (`errorCode`, `errorDescription`). `/api/sala` fica entre as rotas de fluxo próprio do middleware: cada rota confere login, banimento e acesso e responde 401 sem login.

| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/sala/[id]/entrar` | quem pode entrar | confere acesso, marca presença, devolve as credenciais de TURN, o papel e as qualidades de tela |
| `POST /api/sala/[id]/rtc/sessions/new` | quem pode entrar | cria a sessão no SFU; fecha a anterior da mesma pessoa |
| `POST /api/sala/[id]/rtc/sessions/[sid]/tracks/new` | dono da sessão | publicar: tipo do SDP conferido contra o papel, a qualidade e o teto; receber: só faixa de quem está no palco ou na sala, sem bloqueio, com a camada que a regra de custo manda |
| `PUT .../renegotiate`, `PUT .../tracks/close`, `PUT .../tracks/update` | dono da sessão | resposta SDP; fechar faixa; trocar a camada pedida (passa pela regra de custo) |
| `POST /api/sala/[id]/faixas` | dono da faixa | rótulo (`voz`, `tela`, `tela_audio`) e, na tela, a qualidade escolhida |
| `POST /api/sala/[id]/estado` | quem está na sala | devolve o estado comum (membros, faixas, palco, chat novo); a cada 10 s, ou quando a pessoa muta ou levanta a mão, leva também o batimento e as métricas |
| `POST /api/sala/[id]/pessoas` | quem está na sala | nome e avatar de quem é ou foi da sala, uma vez por pessoa (até 60 de uma vez) |
| `POST /api/sala/[id]/chat` | quem está na sala pública | manda mensagem (até 300 caracteres, uma a cada 2 s) |
| `POST /api/sala/[id]/chat/[msgId]/apagar` | dono | apaga a mensagem para todos |
| `POST /api/sala/[id]/membros/[userId]/{falar,ouvir,mutar,expulsar,banir}` | dono | chama para o palco, devolve à plateia, muta, expulsa, bane |
| `POST /api/sala/[id]/bloqueios`, `/denuncias`, `/convite`, `/sair` | quem está na sala | bloquear, denunciar (pessoa ou mensagem), convite da mentoria, sair |
| `/sala` | qualquer um | leva à sala pública aberta do PPA ou diz que ela abre na live |
| ações em `/admin/salas` | admin | criar sala pública, de mentoria e da party; convite; encerrar; desbanir; consumo e denúncias |

Tarefa `sala-voz` no cron do site (a cada minuto): fecha no SFU as sessões sem batimento há 60 s, encerra salas vencidas, recalcula o consumo dos 30 dias, avisa o PPA nos limiares e no pico e apaga o que passou do prazo (seção 10).

Segredos no Worker (por `wrangler secret`, nunca em tela nem no repositório): `REALTIME_APP_SECRET` e `REALTIME_TURN_KEY_TOKEN`; mais `REALTIME_APP_ID` e `REALTIME_TURN_KEY_ID`. Quem copia os tokens no painel da Cloudflare é o PPA; o script `scripts/sala/gravar-segredos-realtime.ps1` lê da área de transferência, confere na Cloudflare e grava sem exibir.

## 7. Modelo de dados

Migration `196_sala_voz.sql`, com RLS em todas as tabelas. O navegador não escreve em nenhuma: quem grava é o servidor (service role) ou a função `confirm_adult`, que valida `auth.uid()`.

| Tabela | Para que | Colunas principais |
|---|---|---|
| `voice_settings` | configuração única, editável pelo admin | `cap_gb_30d`, `video_max_kbps`, lugares por tipo (`palco_max_members`, `palco_max_speakers`, `mentoria_max_members`, `party_max_members`), `party_screen_enabled`, `chat_retention_days`, consumo calculado e o último aviso |
| `voice_rooms` | a sala | `kind` (`palco`, `mentoria`, `party`), `title`, `owner_id`, `booking_id` ou `live_session_id`, `status`, `max_members`, `screen_policy`, `audience` (`todos`, `beneficio`), `chat_open`, `closes_at`, convite (só o hash), `is_test` |
| `voice_room_members` | quem está ou esteve | `role` (`dono`, `membro`, `falante`, `ouvinte`), `status` (`ativo`, `expulso`), `joined_via`, `muted`, `force_muted`, `hand_raised_at`, `last_seen_at`, `turn_username` |
| `voice_bans` | banidos das salas de um dono | `owner_id`, `user_id`, `reason`, `created_by`, `created_at` |
| `voice_room_sessions` | sessão do SFU (registro de acesso) | `id` (o `sessionId`), `room_id`, `user_id`, `ip`, `user_agent`, `closed_at`, `close_reason` |
| `voice_room_tracks` | faixa publicada | `session_id`, `track_name`, `mid`, `kind`, `tipo`, `quality`, `closed_at` |
| `voice_room_subscriptions` | faixa recebida, base do custo | `session_id`, `mid`, faixa de origem, `kind`, `rid` (camada), `rate_kbps`, início e fim, `is_test` |
| `voice_room_messages` | chat da sala pública | `room_id`, `user_id`, `body` (até 300), `created_at`, `deleted_at`, `deleted_by` |
| `voice_room_stats` | qualidade a cada 10 s (plateia da sala pública, a cada 30 s) | perda, jitter, RTT, voz picotada, resolução, quadros, congelamento, bytes, TURN, limite do envio, `jitter_buffer_ms`, `latency_ms` |
| `voice_room_reports` | denúncia | sala, quem denunciou, quem foi denunciado, `message_id` e cópia do texto, motivo, detalhe, situação |
| `user_age_confirmations` | a marcação "tenho 18 anos ou mais" | `user_id`, `confirmed_at`, `terms_version` |

**Leitura (RLS).** O membro ativo lê a própria sala e a lista dela (pela função `is_voice_room_member`, `SECURITY DEFINER`, para não cair na recursão de políticas que já derrubou as tabelas de party). Quem denunciou lê as próprias denúncias; cada um lê a própria marcação de idade. Sessões (com IP), faixas, métricas, chat, banidos e configuração: só o admin; o servidor usa a service role. Nenhuma tabela tem `insert`, `update` ou `delete` para `anon` ou `authenticated`.

**Funções.** `confirm_adult(p_terms_version)`: grava a marcação da própria pessoa uma vez (`EXECUTE` só para `authenticated`). `is_voice_room_member(room)`: auxiliar de RLS. `voice_room_access(room, user)`, `voice_room_tick(room, user, muted, hand)`, `voice_room_snapshot(room, chat_after)` e `voice_room_identities(room, ids)`: o contexto, o batimento da pessoa, o estado comum e os nomes, cada um numa consulta só e só para a service role (ADR-004). Flag `sala_voz` nasce desligada.

**Prova:** `scripts/seguranca/sala-voz.sql`, em transação que sempre termina num erro proposital (nada fica gravado): visitante e quem está fora não leem; ninguém escreve pela API; a marcação de idade só vale para a própria pessoa; as funções do batimento, do estado comum e dos nomes não abrem para o navegador. Fica vermelha quando a trava é revertida. `funcoes-abertas.sql` continua vazio.

## 8. Permissões

Uma função pura (`decideRoomAccess`, testada no Vitest) decide toda entrada e toda chamada ao SFU, parando no primeiro "não". Quem está sem login ou fora da sala não descobre se ela existe ou foi encerrada.

1. Flag `sala_voz` ligada.
2. Login.
3. Sala existe.
4. Vínculo: dono; na mentoria, membro `ativo`; na party, reserva `na_party` agora; na sala pública, qualquer um, menos banido pelo dono e expulso desta sala; e, com `audience = beneficio`, só quem tem Battlepass ativo ou vaga na party do dia.
5. Sala `aberta`, antes de `closes_at`.
6. Conta identificada: Discord ou Steam vinculada (conta só de e-mail não entra).
7. Conta não banida nem suspensa no site (a regra do middleware, `behavior_status`).
8. Marcação "tenho 18 anos ou mais" feita.
9. Lugares: pessoas online menos que `max_members`; dono, quem está no palco e quem tem Battlepass passam mesmo com a sala cheia (escolha 9).

| Ação | Dono | Falante (palco) | Ouvinte (palco) | Membro (mentoria e party) |
|---|---|---|---|---|
| Ouvir, assistir, mutar a si | sim | sim | sim | sim |
| Publicar voz | sim | sim | não | sim |
| Compartilhar tela | sim (escolhe a qualidade) | quem está no palco; na voz livre, qualquer um | na voz livre, sim | na mentoria, se a sala permitir |
| Levantar a mão | não | não | sim | não |
| Chat | sim | sim | sim | sem chat na fase 1 |
| Chamar, devolver, mutar, expulsar, banir, apagar mensagem | sim | não | não | não |
| Bloquear e denunciar | sim | sim | sim | sim |

Na sala pública, até `palco_max_speakers` pessoas falam ao mesmo tempo além do dono. Devolver à plateia ou mutar pelo dono fecha a faixa de voz da pessoa no SFU na hora.

## 9. Idade e moderação

**Decisão do PPA (23/11/2026, pela sessão central):** o público dele é maior de idade, e ele pediu menos processo. A sala é só para maiores de 18: na primeira entrada, a pessoa marca uma vez "tenho 18 anos ou mais", com as regras da sala ao lado, e a marcação fica guardada com a data e a versão do texto. Saem da fase 1 a data de nascimento, as ferramentas para os pais e o fluxo de menores. O site não tem página de termos de uso; a regra fica na tela da marcação e no código de conduta quando ele ganhar a seção da sala.

A Lei 15.211/2025 (ECA Digital) vale para serviço "de acesso provável" por adolescentes (art. 1º). O que fica da lei na fase 1:

| Artigo | O que pede | Na fase 1 |
|---|---|---|
| Art. 9º | vedada a autodeclaração de idade para conteúdo impróprio (pornografia e o que a lei proíbe a menores) | a sala não tem esse conteúdo; a marcação de maioridade é decisão do PPA, registrada como risco na seção 17 |
| Art. 17, § 4º, I | restringir por padrão a comunicação com menores por usuários não autorizados | entrar exige conta identificada; na sala pública só fala quem o PPA chama |
| Arts. 28 e 29 | canal de denúncia identificado; comunicar às autoridades conteúdo de abuso | "Denunciar" em cada pessoa e mensagem, com o nome de quem denuncia; aviso ao PPA na hora |

**Moderação.** O dono muta à força (a pessoa não reabre o microfone), devolve à plateia, expulsa e bane; apaga mensagem do chat. Banido não entra em nenhuma sala do dono até ser desbanido no painel. A denúncia vai ao canal privado do PPA no Discord (o dos avisos de venda) com o motivo e, se for de mensagem, o texto. Até 5 denúncias por pessoa por sala por hora; até uma mensagem de chat a cada 2 s, conferida no banco ao gravar (`voice_chat_send`, migration 201), no relógio do banco e com trava por pessoa, porque o relógio do servidor do site pode diferir do banco em segundos (visto no e2e em 24/11/2026). A tela da denúncia mostra os canais públicos para caso grave (Disque 100 e SaferNet).

**Nada gravado.** O SFU só encaminha pacotes; a sala não usa gravação da Cloudflare. A sala avisa "Esta sala não é gravada". O chat é texto guardado por 30 dias para moderação, e a sala avisa isso também.

## 10. Guarda de dados

| Dado | Prazo | Por quê |
|---|---|---|
| Sessões (com IP e navegador) | 6 meses, depois o cron apaga (menos as de sala com denúncia aberta) | registro de acesso, Lei 12.965/2014 (Marco Civil), art. 15 |
| Faixas publicadas e recebidas | junto com a sessão | base do custo (só precisa de 30 dias) |
| Chat | 30 dias (`chat_retention_days`), menos o de sala com denúncia aberta; no canal de texto aberto, enquanto o canal existir (apagado o canal, vale o prazo) | moderação; o canal de texto é a conversa guardada da comunidade |
| Métricas | 30 dias | aceite e diagnóstico (o banco do plano grátis tem 500 MB) |
| Denúncias e banidos | sem apagar automático na fase 1 | apuração |
| Marcação de idade | enquanto a conta existir | prova da declaração |
| Áudio e vídeo | nunca guardados | nada gravado |

## 11. Custo

**A conta da Cloudflare.** Cobra o que sai dela para os navegadores: 1.000 GB grátis por mês (SFU e TURN juntos) e US$ 0,05 por GB acima. Publicar é de graça, e o tráfego entre o TURN e o SFU também.

**Consumo por pessoa que assiste, por hora** (vídeo com 10% de cabeçalho, mais a voz do PPA e o áudio do jogo, cerca de 0,09 GB/h):

| Qualidade (o PPA escolhe na hora) | Vídeo | GB por hora por pessoa | Camada leve (`h`) |
|---|---|---|---|
| Leve: 720p a 30 quadros | 1,5 Mbps | 0,83 | 360p, 0,5 Mbps: 0,33 GB/h |
| Padrão: 1080p a 30 quadros | 3 Mbps | 1,57 | 540p, 0,8 Mbps: 0,48 GB/h |
| Alta: 1080p a 30 quadros | 4,5 Mbps | 2,31 | 540p, 0,8 Mbps: 0,48 GB/h |
| Fluida: 1080p a 60 quadros | 6 Mbps | 3,06 | 540p, 1 Mbps: 0,58 GB/h |

**Sala pública, 3 horas por dia, 30 dias (90 horas por mês), qualidade Padrão.** O valor é o que passa da franquia grátis, em dólar, cobrado pela Cloudflare no cartão da conta:

| Plateia | Todos na camada alta | Custo | Todos na camada leve | Custo | Horas que cabem no teto grátis de 800 GB (camada leve) |
|---|---|---|---|---|---|
| 10 pessoas | 1.414 GB | US$ 21 | 434 GB | US$ 0 | 166 h |
| 20 pessoas | 2.829 GB | US$ 91 | 868 GB | US$ 0 | 83 h |
| 30 pessoas | 4.243 GB | US$ 162 | 1.302 GB | US$ 15 | 55 h |
| 50 pessoas | 7.071 GB | US$ 304 | 2.171 GB | US$ 59 | 33 h |

A conta confere com a da sessão central: tela a 4 Mbps para 50 pessoas, 3 horas por dia, dá cerca de 8 TB por mês. Mentoria (cerca de 3 GB por sessão de 90 minutos, uns 60 GB por mês no máximo do catálogo) e party só com voz (cerca de 0,6 GB por hora) somam pouco perto disso.

**O que segura o custo.**
- Lugares: a sala pública tem `palco_max_members` lugares (recomendação: 30).
- Camada: quem assiste recebe a camada alta; a leve fora da página da sala e, por um tempo, para a conexão fraca que congela. A estimativa de custo da plateia passa a contar a camada alta.
- Teto: tela nova fica bloqueada ao chegar no teto; a voz e a tela já no ar continuam. Aviso ao PPA em 50%, 80% e 100% e num pico (mais de 20 GB numa hora).
- O valor do teto é dinheiro e é decisão do PPA (escolha 7): ficar no grátis (800 GB em 30 dias) ou aceitar um gasto mensal.

**Sala de teste fora da conta.** Sala de teste (`is_test`) conta só contra sala de teste: o e2e simula o teto sem mexer no contador nem nos avisos de produção.

## 12. Limites do navegador

| Situação | O que acontece | O que a sala faz |
|---|---|---|
| Compartilhar **a janela do Dota** no Chrome ou Edge do Windows | desde o Chrome 141, `windowAudio: "window"` captura só o áudio daquela janela | é o caminho recomendado ao PPA: só o som do jogo vai |
| Compartilhar **a tela inteira** com o áudio do sistema | o áudio do sistema inclui as vozes que a própria sala toca (eco para a plateia) | pede `restrictOwnAudio: true`, que tira da captura o som da própria página; presente no Chrome 157 desta máquina (sonda de 24/11/2026); sem ele, a tela avisa para compartilhar a janela |
| Dota em tela cheia exclusiva | a captura pode sair preta | orientar "Janela sem bordas"; conferir no teste real |
| Microfone do PPA com o jogo no alto-falante | o cancelamento de eco só tira o som que o navegador toca | fone de ouvido |
| Apertar para falar | navegador não recebe tecla com o Dota em foco | microfone aberto com supressão de ruído; atalho fica para o aplicativo (fase 3) |
| Firefox e Safari | não capturam áudio do sistema nem da janela | entram para ouvir, falar e assistir |
| Página aberta fora da sala | o navegador guarda a regra de permissões da primeira página carregada: com o microfone liberado só nas páginas da sala, quem chegava à sala pelo menu do site ficava sem microfone, sem botão e sem aviso (o PPA na Live, 24/11/2026) | o microfone e a captura de tela valem para o próprio site em todas as páginas (`Permissions-Policy` com `self`), porque a ligação segue pelo site inteiro; câmera e localização seguem desligadas |
| Microfone negado, pendente, sem aparelho ou ocupado | `getUserMedia` recusa (`NotAllowedError`, `NotFoundError`, `NotReadableError`) ou fica esperando a resposta da pessoa | o botão do microfone fica na barra sempre que a pessoa pode falar; o aviso diz o motivo e o caminho (o cadeado do endereço, conectar o aparelho, fechar o outro programa) com Tentar de novo; o navegador não repete o pedido sozinho, e a sala tenta de novo quando a permissão muda ou um microfone chega |
| Celular | o iPhone e boa parte dos Androids não compartilham tela | assiste e fala; a tela não quebra em 390 px |
| Upload do PPA | duas camadas de tela somam cerca de 1,25 vez a qualidade escolhida, além do OBS da live | `qualityLimitationReason` vai nas métricas; o teste real diz se cabe |

A tela sobe como jogo: `contentHint = "motion"` e `degradationPreference = "maintain-framerate"` (sob aperto, o navegador baixa a resolução e mantém os quadros), com o H.264 na frente dos codecs (a placa de vídeo codifica; o VP8 do Chrome é só no processador), nas duas camadas: `f` na qualidade escolhida e `h` com `scaleResolutionDownBy = 2`. Até 24/11/2026 ia como `detail` e `maintain-resolution`: nas métricas reais da Live do PPA em 1080p60, quem assistia recebia 4 a 13 quadros por segundo, com congelamentos de até 5,7 s, e o envio sem limite nenhum. Prova: `pnpm sala:tela` (dois Chromes sem janela, fonte de 60 quadros, a getStats dos dois lados).

## 13. Métricas e atraso

A cada 5 s o cliente lê `RTCPeerConnection.getStats()`; a cada 10 s (a plateia da sala pública, a cada 30 s) manda um resumo no batimento, gravado em `voice_room_stats`.

| Métrica | De onde vem |
|---|---|
| Perda de pacote (%) | `inbound-rtp`: diferença de `packetsLost` sobre `packetsLost + packetsReceived` no intervalo |
| Jitter (ms) | `inbound-rtp.jitter`, a maior entre as faixas de áudio |
| RTT (ms) | `candidate-pair` selecionado: `currentRoundTripTime` |
| Buffer de jitter (ms) | `inbound-rtp` de vídeo (ou de áudio, sem vídeo): diferença de `jitterBufferDelay` sobre a de `jitterBufferEmittedCount` |
| Voz picotada (%) | `inbound-rtp` de áudio: `concealedSamples` sobre `totalSamplesReceived` |
| Tela recebida | `frameWidth`, `frameHeight`, `framesPerSecond`, `totalFreezesDuration` |
| Bytes | `bytesReceived` e `bytesSent` (o consumo medido) |
| TURN em uso | candidato local com `candidateType = 'relay'` |
| Limite do envio | `outbound-rtp` de vídeo: `qualityLimitationReason` |

**Atraso estimado** (o que a meta de "menos de meio segundo" mede): metade do RTT de quem assiste, mais o buffer de jitter dele, mais metade do RTT do PPA no mesmo minuto. Não entra o tempo de captura, codificação e tela (dezenas de milissegundos), por isso a meta tem folga. A tela mostra o atraso de cada pessoa ao passar o mouse na qualidade da conexão.

**Consulta do aceite** (roda depois da live ou da mentoria; o resultado vai para a nota):

```sql
with dono as (
  select date_trunc('minute', s.at) as minuto, percentile_cont(0.5) within group (order by s.rtt_ms) as rtt_dono
    from public.voice_room_stats s join public.voice_rooms r on r.id = s.room_id
   where s.room_id = '<id da sala>' and s.user_id = r.owner_id
   group by 1
)
select s.user_id,
       count(*) as amostras,
       round(max(s.packet_loss_pct)::numeric, 2) as perda_max_pct,
       round(percentile_cont(0.95) within group (order by s.jitter_ms)::numeric, 1) as jitter_p95_ms,
       round(percentile_cont(0.95) within group (order by s.rtt_ms / 2 + coalesce(s.jitter_buffer_ms, 0) + d.rtt_dono / 2)::numeric) as atraso_p95_ms,
       round(avg(s.audio_concealed_pct)::numeric, 2) as voz_picotada_pct,
       round(100.0 * avg(case when s.video_height >= 1080 then 1 else 0 end) filter (where s.video_height > 0), 1) as tempo_em_1080p_pct,
       round(sum(s.bytes_received) / 1e9, 2) as gb_recebidos
  from public.voice_room_stats s
  join dono d on d.minuto = date_trunc('minute', s.at)
 where s.room_id = '<id da sala>'
 group by s.user_id;
```

## 14. Interface da fase 1

Usa o kit `src/components/v2` (painel, placa, `v2Page`), os tokens atuais e ícones do `lucide-react`, sem linguagem visual nova: a sessão de design troca a pele depois. Textos em `messages/{pt,en,es}.json`.

- **`/sala`** (endereço fixo para anunciar na live): leva ao canal de voz em modo palco onde o PPA está; sem live, ao primeiro canal de texto; sem canal, diz que o servidor ainda não tem canais.
- **Coluna de canais (R16):** à esquerda, na altura da tela, como no Discord: o nome FORMULADOTA (com a engrenagem do admin), canais de texto (#), canais de voz (palco ou livre, com quem está dentro, microfone, tela e o selo Ao vivo de quem compartilha), salas privadas e, no pé, o painel da conexão de voz. Quem entra ou sai de um canal aparece para todo mundo na hora (pedido do PPA de 24/11/2026: "precisa ser atualizado instantaneamente"): o servidor manda um aviso pelo Broadcast do Realtime (`sala-canais`, sem dado nenhum; o servidor local do e2e usa `sala-canais-teste`) ao entrar, sair, expulsar, fechar a sessão sem sinal e encerrar a sala, e a árvore pede a lista de novo sem a cópia guardada (`?fresco=1`, no máximo uma leitura fresca por segundo por instância). A consulta a cada 10 s fica como rede de segurança. A tabela de sessões tem IP e navegador, por isso o aviso não sai do `postgres_changes`. Na troca de canal, a entrada no novo espera a saída do antigo chegar ao servidor (até 1,5 s), e batimento atrasado de sessão fechada não marca presença. O servidor não tira a pessoa de outra sala aberta em outra aba: a aba derrubada se reconectava sozinha e as duas se derrubavam em laço (visto no e2e). Quem fala, na sala em que a pessoa está, acende na hora.
- **Canal de texto:** cabeçalho com o nome, as mensagens da mais velha para a mais nova com avatar e nome no começo de cada sequência, "Carregar mensagens anteriores" (50 por vez) e o campo fixo embaixo; o dono apaga e bane, qualquer um denuncia; com o chat fechado, só o dono escreve.
- **Trocar a janela** (24/11/2026): quem compartilha escolhe outra janela sem parar a tela; a captura nova entra na mesma faixa (`replaceTrack`), e a plateia segue recebendo sem renegociar. Parar e compartilhar de novo cria faixa nova, e a renegociação às vezes derruba a sessão de quem assiste no SFU (a ligação se refaz sozinha, ADR-007).
- **Barra do canal de voz** (no molde do Discord): microfone, ensurdecer (não ouve ninguém e muta o microfone; religar devolve como estava), tela (compartilhar, trocar a janela, parar), mão, volumes, mostrar ou esconder a coluna do chat e sair em vermelho. Quem está na sala fica na árvore, debaixo do canal, com as ações de cada pessoa. A interface diz que não existe apertar para falar: com o Dota em primeiro plano o navegador não recebe atalho; a voz abre sozinha, com redução de ruído, e o mutar fica na barra e no painel.
- **`/sala/[id]`** (canal de voz): cabeçalho do canal com o modo, "Esta sala não é gravada", atraso e qualidade da conexão; o palco com a tela (na qualidade que quem transmite escolheu); na sala pública, quem está no palco, a plateia com as mãos levantadas e o chat; os controles (mutar, levantar a mão, compartilhar a tela com a escolha da qualidade e o consumo por hora, volumes, sair).
- **Primeira entrada:** a marcação "Tenho 18 anos ou mais" com as regras da sala.
- **Painel de voz (R15):** no pé da coluna de canais dentro da `/sala`, e no canto em todas as outras páginas: o nome da sala (que leva de volta a ela), quem está falando ou quantos estão na sala, mutar, parar a tela, sair e, quando a pessoa é tirada da sala, o motivo até ela fechar o aviso.
- **`/admin/salas`**: os canais do servidor (criar, renomear, subir e descer, modo palco ou livre, só Battlepass, só o dono escreve, apagar), a sala de mentoria (de um horário pago) e a da party; link e convite; encerrar; banidos (desbanir); consumo estimado e medido; denúncias.

As rotas para a barra de cima (sessão de design): `/sala` (sala pública da live) e `/admin/salas`.

## 15. Decisões

| # | Assunto | Situação |
|---|---|---|
| 1 | Idade | **Decidido pelo PPA em 23/11/2026:** só maiores de 18, por uma marcação na primeira entrada; sem data de nascimento nem ferramentas para os pais na fase 1. |
| 2 | Onde pedir a idade | **Decidido com o item 1:** na primeira entrada numa sala. |
| 3 | Comprador de mentoria que pagou sem login | **Recomendação adotada até o PPA dizer o contrário:** convite de uso único que ele manda pelo WhatsApp. |
| 4 | Quem entra na sala da party | **Espera o PPA.** A: só quem está na party agora (recomendado). B: a party e a fila, só ouvindo. |
| 5 | Tela na sala da party | **Espera o PPA.** A: só voz (recomendado; quem quer ver a tela vai para a sala pública). B: o PPA pode compartilhar. |
| 6 | Tela do aluno na mentoria | **Recomendação adotada até o PPA dizer o contrário:** interruptor por sala, desligado por padrão. |
| 7 | Teto de gasto | **Espera o PPA (é dinheiro).** A: ficar no grátis, 800 GB em 30 dias (recomendado para começar). B: até US$ 50 por mês (1.800 GB). C: até US$ 150 por mês (3.800 GB). |
| 8 | Qualidade da tela | **Decidido pelo PPA em 23/11/2026:** ele escolhe na hora de compartilhar, vendo o consumo por hora de cada opção. |
| 9 | Sala pública aberta a todos ou benefício | **Espera o PPA.** A: aberta a todos. B: só Battlepass e quem tem vaga na party do dia. C (recomendado): aberta a todos com lugares contados, e o Battlepass entra mesmo com a sala cheia. |
| 10 | Lugares da sala pública | **Espera o PPA.** Recomendado: 30 (cabe no teto grátis com a plateia na camada leve). |
| 11 | Quem fala na sala pública | **Espera o PPA.** Recomendado: o PPA chama quem levantou a mão, até 4 falando além dele, e devolve à plateia quando quiser. |

### A escolha 9 e o efeito nas lives do YouTube e da Twitch

- **O que se perde.** Quem assiste pelo site não vê anúncio do YouTube, não conta como espectador simultâneo e não escreve no chat das plataformas. O YouTube e a Twitch recomendam lives pelo número de espectadores ao mesmo tempo e pela conversa no chat; menos gente lá é menos descoberta e menos receita de anúncio. Membros do YouTube e subs da Twitch são pagamentos e não caem só por alguém assistir no site, mas quem não volta às plataformas deixa de ver os pedidos de membro e de sub.
- **O que se ganha.** Quem está na sala pública está logado no site, a um clique da vaga na party e do Battlepass, e fala com o PPA de verdade, o que nenhuma plataforma dá.
- **Por que C.** Lugares contados (30) limitam o quanto sai das plataformas e o custo; aberto a todos dá alcance e testa a ideia de verdade (com 1 assinatura de Battlepass na história, uma sala só para o Battlepass ficaria vazia); o Battlepass entrando com a sala cheia dá a ele um benefício concreto.
- **Teste de 14 dias** (proposto pelo agente), a contar da primeira live com a sala pública: **passa** com pelo menos 3 compras (vaga ou Battlepass) de quem esteve na sala e com o pico de espectadores somados de YouTube e Twitch caindo no máximo 10% em relação aos 14 dias anteriores; **falha** com nenhuma compra ou queda acima de 20%, e aí a sala vira benefício (B).

## 16. Fases 2 e 3 (só documento)

**Fase 2: canais da comunidade.** Canais de texto e de voz abertos aos membros, aproveitando o chat que já existe (`dm_messages`, `party_messages`, `lobby_messages`): canais por nível ou papel, moderadores além do PPA, modo lento, fila de moderação das denúncias. Com centenas de pessoas, o estado sai do batimento e vai para Supabase Realtime ou Durable Object com WebSocket, e a transmissão de um para muitos se compara com o Cloudflare Stream (WHIP e WHEP), que cobra por minuto assistido. Se a regra de idade mudar, entram as ferramentas para os pais (arts. 17, 18, 21 e 24 do ECA Digital).

**Fase 3: aplicativo de computador.** O "app" que o projeto já prevê (Tauri): captura só do processo do Dota, apertar para falar com atalho global, overlay sobre o jogo. Usa o mesmo SFU e as mesmas rotas.

## 17. Riscos e o que revisitar

| Risco | Efeito | O que fazer |
|---|---|---|
| Idade declarada por marcação | menor entra mentindo | decisão do PPA (23/11/2026); conta identificada, denúncia e banimento; se a ANPD regulamentar verificação para esse tipo de serviço, trocar o método |
| Plateia saindo das plataformas | menos descoberta e anúncio no YouTube e na Twitch | lugares contados e o teste de 14 dias da escolha 9 |
| Custo da sala pública | conta acima do grátis | camada leve por padrão, lugares, teto e avisos; o PPA escolhe o orçamento |
| Credencial de TURN usada fora da sala | tráfego cobrado que o teto não vê | credencial só para quem entra, marcada com a sala e revogada ao expulsar e ao encerrar |
| Upload do PPA com duas camadas e o OBS | tela travando | medir `qualityLimitationReason` no teste real; baixar a qualidade escolhida |
| partytracks sem manutenção | cliente sem correção | o módulo `src/lib/sala/cliente/` isola a troca |
| Supabase lento ou fora | batimento falha | uma consulta por batimento (ADR-004); a mídia segue até a sessão cair |
| Chat com abuso | ofensa na frente da plateia | apagar, mutar, expulsar, banir, denunciar; uma mensagem a cada 2 s |

## 18. Provas

- **Unitárias (`pnpm test`):** permissões (cada "não" da seção 8, palco e lugares), faixas (quem publica, quem recebe, camada pela regra de custo), estimativa de custo e limiares, leitura do SDP, métricas e atraso, caminho do intermediário, credencial do TURN. `pnpm sala:mutacao` tira cada trava e exige vermelho.
- **Banco:** `scripts/seguranca/sala-voz.sql` e `funcoes-abertas.sql` (seção 7).
- **Ponta a ponta (`pnpm sala:e2e`):** servidor local, banco de produção com sala e usuários de teste (`is_test`, apagados no fim) e o app real do Realtime, com a mídia falsa do Chrome. Mentoria: os dois se ouvem, a tela chega em 1080p, mutar, denunciar, teto, bloqueio, expulsão. Sala pública: o ouvinte não publica voz, o chamado publica, a plateia recebe a camada alta sem escolher e não compartilha a tela, o atraso estimado aparece, o chat chega e o apagado some, o banido não volta, os lugares contam. Portões: login, fora, menor (sem a marcação), convite e flag desligada, até para o admin. Navegação (R15): dentro da mentoria, ir pela barra para `/party` e `/meta` e voltar pelo painel, com o `bytesReceived` do áudio subindo em cada passo, a tela na camada leve fora da sala e de volta na alta, e a página sem recarregar; depois recarregar no `/meta` e a sala voltar sozinha. O servidor local lê a linha de teste da flag (`sala_voz_e2e`), nunca a `sala_voz` de produção.
- **Aceite real:** uma mentoria de 1 hora do PPA (tela em 1080p, perda abaixo de 2%, voz sem corte, atraso p95 abaixo de 500 ms, consumo dentro do orçamento) e a primeira live com a sala pública (atraso p95 abaixo de 500 ms para a plateia), medidos pela consulta da seção 13 e registrados na nota compartilhada.

## 19. Entrega

Um PR por etapa, nunca na main; merge com a verificação `verificar` do GitHub verde.

1. Esta spec (PR 194 e esta revisão).
2. Ligar o Realtime: o agente cria o app e a chave do TURN no Chrome do PPA (sem tocar em segredo); o PPA copia os dois tokens e roda o script de um clique.
3. Migration 196 com a prova de RLS: merge e aplicação em produção só com o OK do PPA, pela Management API, registrada em `supabase_migrations.schema_migrations` com versão por data.
4. Prova de conceito atrás da flag, com as provas da seção 18; deploy pela cópia do WSL com a trava, conferido por `pnpm cf:verificar`.
5. Mentoria real, primeira live com a sala pública e nota de aceite.
6. Novidade para o jogador só com o OK do PPA.

## 20. Fontes

Consultadas em 23 e 24/11/2026.

- Cloudflare Realtime, API do SFU (base `https://rtc.live.cloudflare.com/v1`, `Authorization: Bearer <segredo do app>`, esquema `realtime-api-2024-05-21.yaml`, simulcast com `preferredRid` e `tracks/update`): https://developers.cloudflare.com/realtime/sfu/
- Preço e limites (US$ 0,05 por GB de saída, 1.000 GB grátis por mês somando SFU e TURN, faixa sem pacote por 30 s descartada, 50 requisições por segundo por sessão, codecs): https://developers.cloudflare.com/realtime/sfu/platform/pricing/ e https://developers.cloudflare.com/realtime/sfu/platform/limits/
- TURN: credencial curta com `customIdentifier`, revogação (`/credentials/{username}/revoke`) e análise por GraphQL: https://developers.cloudflare.com/realtime/turn/generate-credentials/
- partytracks 0.0.56 (código publicado no npm): https://www.npmjs.com/package/partytracks
- Chrome: `systemAudio` (https://developer.chrome.com/docs/web-platform/screen-sharing-controls), `restrictOwnAudio` e `windowAudio` no Chrome Platform Status (https://chromestatus.com/feature/5128140732760064 e https://chromestatus.com/feature/5072779506089984)
- Lei 15.211/2025 (ECA Digital): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm
- Lei 12.965/2014 (Marco Civil da Internet), art. 15: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
