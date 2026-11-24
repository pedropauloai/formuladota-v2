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
| R6 | O dono compartilha a tela com áudio pelo `getDisplayMedia` e escolhe a qualidade (resolução e quadros) vendo o consumo estimado por hora. |
| R7 | Na sala pública, a plateia ouve e assiste; fala só quem o PPA chamar; quem quer falar levanta a mão. |
| R8 | Na sala pública, chat de texto: o dono apaga mensagem, e qualquer um denuncia mensagem ou pessoa. |
| R9 | O dono muta, expulsa (sai desta sala) e bane (não entra mais nas salas dele). |
| R10 | Lugares contados na sala pública; o Battlepass entra mesmo com a sala cheia (escolha 9). |
| R11 | A tela vai em duas camadas (simulcast); o servidor escolhe a camada de cada pessoa pela regra de custo. |
| R12 | Nada gravado: nenhuma mídia passa por servidor do FORMULADOTA nem é guardada pela Cloudflare. |
| R13 | Teto de tráfego que bloqueia tela nova, baixa a camada da plateia antes disso e avisa o PPA. |
| R14 | Métricas de cada pessoa a cada 10 s: perda de pacote, jitter, RTT, resolução e quadros, e o atraso estimado. |

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

**Estado:** proposta (revista para a sala pública). O cliente pede o estado a cada 2 s (dono e quem fala) ou 3 s (plateia). O pedido é também o batimento de presença e traz o chat. Uma função no banco (`voice_room_tick`, só para a service role) grava o batimento e devolve, numa ida só, tudo o que a regra precisa: sala, vínculo, membros online com nome e avatar, faixas, bloqueios, faixas recebidas e as últimas mensagens. As regras continuam em TypeScript puro, testadas. Com 50 pessoas na plateia são cerca de 17 pedidos por segundo e uma consulta por pedido. Supabase Realtime e Durable Object ficam para a fase 2, com centenas de pessoas.

### ADR-005: custo estimado no próprio servidor, teto em 30 dias corridos

**Estado:** proposta. O servidor sabe toda faixa que cada pessoa recebe, com início, fim e camada. A estimativa é a soma de `duração x bitrate da camada` (com 10% de cabeçalho no vídeo), um limite superior do que a Cloudflare mede. O teto vale para os últimos 30 dias corridos, porque o ciclo de cobrança pode não começar no dia 1. As métricas dos navegadores dão o consumo medido ao lado, para comparar.

### ADR-006: simulcast em duas camadas, com a camada escolhida pelo servidor

**Estado:** proposta. Na sala pública o custo cresce com a plateia: cada pessoa recebe a tela inteira. A tela sobe em duas camadas, `f` (a qualidade escolhida) e `h` (metade da resolução, cerca de um quarto do bitrate). A pessoa escolhe "alta" ou "leve" na tela; o servidor decide a camada que vale: na mentoria, sempre a que ela pediu; na sala pública, a leve por padrão, a alta para quem pedir enquanto o consumo dos 30 dias estiver abaixo de 50% do teto, e só a leve acima disso. Subir duas camadas pede mais upload do PPA (que já transmite para a Twitch); a medida no teste real diz se cabe.

## 6. Rotas do servidor

Todas exigem login (cookie do Supabase) e a flag ligada, validam o corpo com Zod e respondem em JSON no formato do SFU (`errorCode`, `errorDescription`). `/api/sala` fica entre as rotas de fluxo próprio do middleware: cada rota confere login, banimento e acesso e responde 401 sem login.

| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/sala/[id]/entrar` | quem pode entrar | confere acesso, marca presença, devolve as credenciais de TURN, o papel e as qualidades de tela |
| `POST /api/sala/[id]/rtc/sessions/new` | quem pode entrar | cria a sessão no SFU; fecha a anterior da mesma pessoa |
| `POST /api/sala/[id]/rtc/sessions/[sid]/tracks/new` | dono da sessão | publicar: tipo do SDP conferido contra o papel, a qualidade e o teto; receber: só faixa de quem está no palco ou na sala, sem bloqueio, com a camada que a regra de custo manda |
| `PUT .../renegotiate`, `PUT .../tracks/close`, `PUT .../tracks/update` | dono da sessão | resposta SDP; fechar faixa; trocar a camada pedida (passa pela regra de custo) |
| `POST /api/sala/[id]/faixas` | dono da faixa | rótulo (`voz`, `tela`, `tela_audio`) e, na tela, a qualidade escolhida |
| `POST /api/sala/[id]/estado` | quem está na sala | batimento, microfone, mão levantada, métricas a cada 10 s; devolve membros, faixas, palco e chat |
| `POST /api/sala/[id]/chat` | quem está na sala pública | manda mensagem (até 300 caracteres, uma a cada 2 s) |
| `POST /api/sala/[id]/chat/[msgId]/apagar` | dono | apaga a mensagem para todos |
| `POST /api/sala/[id]/membros/[userId]/{falar,ouvir,mutar,expulsar,banir}` | dono | chama para o palco, devolve à plateia, muta, expulsa, bane |
| `POST /api/sala/[id]/bloqueios`, `/denuncias`, `/convite`, `/sair` | quem está na sala | bloquear, denunciar (pessoa ou mensagem), convite da mentoria, sair |
| `/sala` | qualquer um | leva à sala pública aberta do PPA ou diz que ela abre na live |
| ações em `/admin/salas` | admin | criar sala pública, de mentoria e da party; convite; encerrar; desbanir; consumo e denúncias |

Tarefa `sala-voz` no cron do site (a cada minuto): fecha no SFU as sessões sem batimento há 45 s, encerra salas vencidas, recalcula o consumo dos 30 dias, avisa o PPA nos limiares e no pico e apaga o que passou do prazo (seção 10).

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
| `voice_room_stats` | qualidade a cada 10 s | perda, jitter, RTT, voz picotada, resolução, quadros, congelamento, bytes, TURN, limite do envio, `jitter_buffer_ms`, `latency_ms` |
| `voice_room_reports` | denúncia | sala, quem denunciou, quem foi denunciado, `message_id` e cópia do texto, motivo, detalhe, situação |
| `user_age_confirmations` | a marcação "tenho 18 anos ou mais" | `user_id`, `confirmed_at`, `terms_version` |

**Leitura (RLS).** O membro ativo lê a própria sala e a lista dela (pela função `is_voice_room_member`, `SECURITY DEFINER`, para não cair na recursão de políticas que já derrubou as tabelas de party). Quem denunciou lê as próprias denúncias; cada um lê a própria marcação de idade. Sessões (com IP), faixas, métricas, chat, banidos e configuração: só o admin; o servidor usa a service role. Nenhuma tabela tem `insert`, `update` ou `delete` para `anon` ou `authenticated`.

**Funções.** `confirm_adult(p_terms_version)`: grava a marcação da própria pessoa uma vez (`EXECUTE` só para `authenticated`). `is_voice_room_member(room)`: auxiliar de RLS. `voice_room_tick(room, user, muted, hand, chat_after)` e `voice_room_access(room, user)`: o batimento e o contexto numa consulta só, só para a service role (ADR-004). Flag `sala_voz` nasce desligada.

**Prova:** `scripts/seguranca/sala-voz.sql`, em transação que sempre termina num erro proposital (nada fica gravado): visitante e quem está fora não leem; ninguém escreve pela API; a marcação de idade só vale para a própria pessoa; as funções do batimento não abrem para o navegador. Fica vermelha quando a trava é revertida. `funcoes-abertas.sql` continua vazio.

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
| Compartilhar tela | sim (escolhe a qualidade) | não | não | na mentoria, se a sala permitir |
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

**Moderação.** O dono muta à força (a pessoa não reabre o microfone), devolve à plateia, expulsa e bane; apaga mensagem do chat. Banido não entra em nenhuma sala do dono até ser desbanido no painel. A denúncia vai ao canal privado do PPA no Discord (o dos avisos de venda) com o motivo e, se for de mensagem, o texto. Até 5 denúncias por pessoa por sala por hora; até uma mensagem de chat a cada 2 s. A tela da denúncia mostra os canais públicos para caso grave (Disque 100 e SaferNet).

**Nada gravado.** O SFU só encaminha pacotes; a sala não usa gravação da Cloudflare. A sala avisa "Esta sala não é gravada". O chat é texto guardado por 30 dias para moderação, e a sala avisa isso também.

## 10. Guarda de dados

| Dado | Prazo | Por quê |
|---|---|---|
| Sessões (com IP e navegador) | 6 meses, depois o cron apaga (menos as de sala com denúncia aberta) | registro de acesso, Lei 12.965/2014 (Marco Civil), art. 15 |
| Faixas publicadas e recebidas | junto com a sessão | base do custo (só precisa de 30 dias) |
| Chat | 30 dias (`chat_retention_days`), menos o de sala com denúncia aberta | moderação |
| Métricas | 90 dias | aceite e diagnóstico |
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
- Camada: a plateia recebe a camada leve por padrão. Quem pede a alta recebe enquanto o consumo dos 30 dias estiver abaixo de 50% do teto; acima disso, só a leve.
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
| Celular | o iPhone e boa parte dos Androids não compartilham tela | assiste e fala; a tela não quebra em 390 px |
| Upload do PPA | duas camadas de tela somam cerca de 1,25 vez a qualidade escolhida, além do OBS da live | `qualityLimitationReason` vai nas métricas; o teste real diz se cabe |

A tela sobe com `contentHint = "detail"` e `degradationPreference = "maintain-resolution"` (sob aperto, o navegador baixa quadros antes da resolução), nas duas camadas: `f` na qualidade escolhida e `h` com `scaleResolutionDownBy = 2`.

## 13. Métricas e atraso

A cada 5 s o cliente lê `RTCPeerConnection.getStats()`; a cada 10 s manda um resumo no batimento, gravado em `voice_room_stats`.

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

- **`/sala`** (endereço fixo para anunciar na live): leva à sala pública aberta do PPA; sem sala aberta, diz que ela abre quando a live começar.
- **`/sala/[id]`**: título e tipo, "Esta sala não é gravada", atraso e qualidade da conexão; o palco com a tela (e a escolha "alta" ou "leve" para quem assiste); na sala pública, quem está no palco, a plateia com as mãos levantadas e o chat; os controles (mutar, levantar a mão, compartilhar a tela com a escolha da qualidade e o consumo por hora, volumes, sair).
- **Primeira entrada:** a marcação "Tenho 18 anos ou mais" com as regras da sala.
- **`/admin/salas`**: abrir a sala pública da live, a de mentoria (de um horário pago) e a da party; link e convite; encerrar; banidos (desbanir); consumo estimado e medido; denúncias.

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
- **Ponta a ponta (`pnpm sala:e2e`):** servidor local, banco de produção com sala e usuários de teste (`is_test`, apagados no fim) e o app real do Realtime, com a mídia falsa do Chrome. Mentoria: os dois se ouvem, a tela chega em 1080p, mutar, denunciar, teto, bloqueio, expulsão. Sala pública: o ouvinte não publica voz, o chamado publica, a plateia recebe a camada leve (540p) e o atraso estimado aparece, o chat chega e o apagado some, o banido não volta, os lugares contam. Portões: login, fora, menor (sem a marcação), convite e flag desligada, até para o admin.
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
