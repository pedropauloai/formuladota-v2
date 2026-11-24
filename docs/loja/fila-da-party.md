# Fila da party ao vivo

Frente 1 do [plano v3](plano-v3.md), aberta em 19/11/2026. O plano manda sobre este documento quando divergir.

## O que faz

Quem assiste à live abre `/party`, vê a live, quem está na party do Pedro agora, a fila e as vagas abertas, e garante a vaga do dia com Pix em dois toques: "Garantir minha vaga" e "Copiar código Pix". R$ 25 valem a live inteira, no revezamento: a pessoa joga, volta para a fila e joga de novo na vez dela, até a live acabar (decisão técnica 24). Depois de pagar, a pessoa vê a própria posição andar e é avisada, com o som de partida encontrada do jogo, quando o Pedro a chama para a party. O Pedro opera a fila em `/admin/loja/fila`, e os overlays da live leem `/api/party/fila`.

A vaga vende sempre, com ou sem live (decisão técnica 16). Fora da live, a compra entra na fila aberta, e a pessoa joga na próxima live que o Pedro abrir, na ordem do revezamento (decisão técnica 18): serve para quem vê um vídeo ou o VOD e quer chegar na live com o lugar garantido.

## Para o Pedro

Fora da live a fila fica aberta sozinha: a página vende a vaga para a próxima live, e quem compra aparece na mesa com "comprou fora da live" nos detalhes. O tamanho da fila (começa em 20) e os lugares na party ficam em "Ajustes da live", no topo da mesa, e mudam sem abrir a live. Party de 3 ou de 5 é o número de lugares na party.

A mesa cabe na tela sem rolar a página: à esquerda a party, com o próximo passo e o único botão verde no topo dela, e embaixo as partidas registradas e quem saiu da fila; à direita a fila, em grupos (entram agora, na próxima partida, depois). Atalhos: C completa a party, T marca a partida que terminou, A põe alguém na fila sem pagamento, / busca na fila e Esc cancela a troca.

Durante a live:

1. "Abrir a live". A página mostra sozinha a live da Twitch quando o canal está no ar; o link da live do YouTube (opcional) é a reserva para quando a Twitch estiver fora do ar. A live marcada no painel da agenda para perto da hora vira a live no ar, com as reservas dela.
2. Quem paga aparece na fila na hora, com um aviso embaixo da mesa ("fulano entrou na fila") para você agradecer na live. "Completar a party" chama a fila na ordem do revezamento, e o lugar livre mostra o próximo, com "Chamar". Convide cada um pelo ID do Dota: um clique no ID copia. O cartão mostra o nome que a pessoa usa no Dota (o da Steam). Cada pessoa ocupa um lugar só na party, e a vaga do dia é uma de pé por pessoa.
3. Acabou a partida: "Partida N terminou". A mesa acha sozinha a partida da party na OpenDota (funciona com você na smurf) e mostra o ID, o resultado e quem da party apareceu nela; você confere e toca em "Contar a partida N". Sem achar, "Contar sem o ID" ou cole outro ID. A mesa conta cada partida uma vez só, mesmo com dois toques. Depois da partida, quem tem a vaga do dia volta sozinho para a fila se alguém espera o lugar (quem nunca jogou entra na frente) e fica na party se ninguém espera; o cartão mostra a partida de hoje ("3ª partida hoje"). Quem ainda tem partida comprada (cortesia ou vaga antiga) continua na party até completar.
4. Trocar alguém da party: "Trocar" no cartão e, na fila, "Entrar no lugar" em quem entra. Quem sai volta para a fila no mesmo lugar, sem falta. "Não apareceu", no menu do cartão, é para quem faltou: conta a vez e manda para o fim da fila, sem perder a vaga.
5. O menu "⋯" de cada pessoa dá ou tira uma partida da cortesia e da vaga antiga (a vaga do dia não tem saldo), põe na party fora da ordem quando há lugar livre, abre o perfil na Steam e tira da fila. Tirar da fila e não apareceu pedem um segundo toque. Chamar, tirar da party e trocar podem ser desfeitos no aviso, por alguns segundos. Mexer nas partidas de quem pagou não devolve nem cobra nada: o reembolso, se houver, é no Mercado Pago.
6. "Pôr na fila" (sem pagamento) acha o jogador pelo nome do Discord, pelo nome da Steam ou pelo ID do Dota e põe na fila de cortesia com as partidas que você escolher (de 1 a 20; dar de novo soma na mesma entrada).
7. Quem ainda espera pode sair da fila pela página. A vaga volta à venda, e o canal de vendas do Discord avisa quanto devolver no Mercado Pago: a vaga do dia inteira se a pessoa não jogou nenhuma partida (quem já jogou não tem nada a devolver, e não há aviso). A aba "Saíram da fila" da mesa lista quem saiu, com o valor.
8. No fim, "Encerrar a live", em "Ajustes da live". Com gente na party, a mesa pergunta se a partida terminou: "Partida terminou, encerrar" conta a partida; "Encerrar sem contar" devolve quem estava na party para a frente da fila. A vaga do dia de quem jogou termina; a de quem não jogou nenhuma partida continua na fila para a próxima live. Se esquecer, o cron encerra a live 12 horas depois de aberta.

## Decisões técnicas

Cada uma com o porquê em uma linha.

1. **A fila mora na reserva da vaga (`store_bookings`), não numa tabela nova.** A vaga já é uma reserva de live com trava de lotação, retenção enquanto a pessoa paga, confirmação pelo webhook e devolução no reembolso; a fila só acrescenta o estado da vez.
2. **Um gatilho no banco põe na fila toda reserva de party confirmada** (`store_bookings_fila`). Qualquer caminho que confirma o pagamento (webhook, conciliação da página, cron) entra na fila igual, e cancelamento ou reembolso tira.
3. **A live fica no ar quando o Pedro abre no painel** (`status = 'ao_vivo'`), não pelo horário marcado. Live diária depende de agenda e saúde; o site nunca mostra "ao vivo" sem o Pedro estar transmitindo. O cron encerra a live esquecida aberta depois de 12 horas.
4. **Vagas abertas contam a fila, não o total da live.** `party_seats` é o tamanho máximo da fila em partidas; cada partida jogada devolve uma vaga. O Pedro não precisa mexer no número durante a live, e o que sobra para a próxima live fica limitado. Desde a decisão 24, a vaga do dia conta um lugar até jogar a primeira partida.
5. **Quem não jogou na live continua na fila, na mesma posição, para a próxima.** A fila da live atual inclui as entradas de lives anteriores que não terminaram; a reserva de uma live futura só entra quando aquela live chega.
6. **A compra na fila não pede nada digitado.** Nome público e e-mail vêm do login com Discord, o ID do Dota sai da Steam vinculada, e o WhatsApp deixa de ser obrigatório no pedido (o Pedro convida pela Steam).
7. **A vaga fica segurada 10 minutos enquanto o Pix não cai** (a agenda segura 35). Numa live, Pix abandonado não pode travar vaga por meia hora; quem paga depois entra na fila do mesmo jeito, porque dinheiro recebido nunca fica sem vaga.
8. **Posição em tempo real por consulta curta (3 s com a pessoa na fila, 8 s sem), não por canal do Realtime.** O celular derruba conexão aberta quando a aba vai para o fundo, então a consulta volta sozinha ao reabrir; a leitura é uma consulta pequena e os overlays usam o mesmo endereço.
9. **Leitura pública pelo servidor, com service role, e nome pela identidade pública** (`getIdentityMap`). Nenhuma função nova fica aberta ao visitante, e o JSON público não carrega id de usuário, e-mail nem WhatsApp.
10. **Operação da fila por funções do banco com trava na linha da live** (`party_fila_*`), só para o service role. Dois toques seguidos em "Chamar o próximo" não chamam duas pessoas para o mesmo lugar.
11. **Live e reserva de teste ficam separadas** (`store_live_sessions.is_test`): o `pnpm loja:e2e` abre uma live de teste que o site de produção nunca mostra. Só existe uma live de teste no ar por vez, então os roteiros esperam a vez numa trava cooperativa (`acquireTestLock` em `scripts/loja/e2e-comum.mjs`) em vez de fechar a live de outra execução.
12. **Uma vaga por pessoa na party** (migration 176): quem comprou duas vezes ocupa um lugar só, e a segunda compra espera a primeira terminar. Antes, "Completar a party" chamava as duas e "Partida terminou" descontava duas partidas de quem jogou uma.
13. **"Partida terminou" com valor esperado** (`store_live_sessions.match_count`): o painel manda quantas partidas já tinham terminado; o segundo toque, ou a requisição repetida, não desconta de novo. Não existe "Jogou" por linha, para a mesma partida não ser contada por dois botões.
14. **Freio de abuso por pessoa, não por IP**, na compra, na saída e na consulta da vez: na operadora de celular muita gente sai pelo mesmo IP (CGNAT), e o limite por IP congelaria a fila de quem está na live. O freio por IP fica largo. Um Pix pendente por pessoa: tocar de novo devolve o mesmo Pix.
15. **A compra antiga em `/loja/vaga-na-party` leva sempre para `/party`**, que vende para a live no ar, para a próxima marcada ou na fila aberta, com login e Steam. Antes, a página vendia sem login, e a vaga entrava na fila sem ID do Dota nem aviso de vez para quem comprou.
16. **A vaga vende sempre, com ou sem live** (migration 177, pedido do Pedro em 19/11/2026: "não precisa de ter live marcada... as vendas podem acontecer sempre"). Sem live no ar nem marcada, a compra entra na fila aberta: uma linha fixa de `store_live_sessions` com `status = 'fila'` em cada ambiente, com a data no passado de propósito, para a fila de qualquer live incluir quem comprou fora. A fila aberta conta todo mundo que espera, a live que o Pedro abre herda o tamanho dela, e o tamanho é um número só (mudar na live muda a fila aberta também). Antes, a página só vendia com live no ar ou marcada, e quem via um vídeo ou o VOD não tinha como garantir o lugar.
17. **Os lugares livres da party mostram só o que está à venda de verdade** (`partySeatsView` em `model.ts`): o lugar livre de quem está com a vez aparece como "próximo", e os lugares à venda não passam das vagas abertas da fila. É a mesma conta dos overlays da live; antes, a página oferecia lugar que já era da fila.
18. **A fila anda pelo revezamento, para todos** (migration 192, regra do Pedro para o Battlepass em 19/11/2026: "precisa respeitar a fila e se tiver mais jogadores querendo jogar precisa ir revesando pela hora da ultima participação"). A ordem é a última vez de cada pessoa na party do PPA (`party_participacoes`): quem nunca jogou vai primeiro, e o empate se decide pela hora em que entrou na fila. "Não apareceu" grava a vez como gasta. O mesmo critério está em `party_fila_chamar` e em `orderEntries`. Para quem nunca jogou, a ordem continua a do pagamento.
19. **O assinante do Battlepass entra na fila sem pagar** (`party_fila_entrar_battlepass`): uma entrada de pé por pessoa, com a Steam vinculada; desde a decisão 24, a entrada segue no revezamento até o fim da live, e na live seguinte ele entra de novo. A entrada não tem pedido (`store_bookings.source = 'battlepass'`, `order_id` nulo) e não ocupa a lotação que limita a venda da vaga paga. O dono de toda entrada fica em `store_bookings.user_id`, preenchido por gatilho a partir do pedido.
20. **"Partida terminou" registra a partida pelo ID da OpenDota**: a mesa acha sozinha a partida da party (decisão 23) ou aceita o ID ou o link colado, o site busca a partida, acha o time do PPA (contas 1123609219, 201687094 e a smurf 1667196039, ou quem da party estava nela) e grava a participação de quem estava na party com a hora em que a partida acabou; quem a OpenDota mostra no time do PPA com a Steam vinculada fica "conferido", inclusive quem jogou fora da fila. Sem o ID, a vez conta com a hora do toque. Spec do Battlepass: [../battlepass/spec.md](../battlepass/spec.md).
21. **O Pedro gerencia a fila sem pagamento** (migration 178, pedido dele em 19/11/2026: "preciso poder gerenciar os usuários na fila sem a necessidade de pagamento e também adicionar ou remover saldo de partidas"). A cortesia (`party_fila_adicionar_cortesia`, `source = 'cortesia'`, sem pedido) entra no fim da fila, exige Steam vinculada, fica uma por pessoa (dar de novo soma partidas) e, como o Battlepass, não ocupa a lotação da venda. `party_fila_ajustar_partidas` soma ou tira partidas de qualquer entrada que ainda espera ou está na party, sem passar de 20 nem deixar menos de 1 partida por jogar. As duas funções são só do service role, chamadas pelo painel depois de conferir que é admin.
22. **Trocar jogador da party sem falta** (migration 179, pedido do Pedro em 19/11/2026: "vou ficar substituindo os jogadores o tempo todo"). "Tirar da party" (`party_fila_tirar_da_party`) devolve a pessoa para a fila no mesmo lugar, sem falta, sem gastar a vez do revezamento e sem mexer nas partidas; "Pôr na party agora", no menu de cada pessoa da fila, chama aquela pessoa com lugar livre, fora da ordem. "Não apareceu" fica para quem faltou: conta a vez e manda para o fim.
23. **Mesa de operação refeita** (pedido do Pedro em 23/11/2026: "Eu ainda não estou gostando dessa gestão da fila. Pode refazer para mim aí de uma maneira muito mais eficiente"). A tela cabe na janela sem rolar a página (a party e o histórico à esquerda, a fila à direita, rolando por dentro) e cresce 1,33x na tela de 1440 de altura (`v2Page`), com a superfície de metal do kit v2. Um passo por vez, com o único botão verde no topo da party (abrir a live, completar a party, partida terminou), calculado em `src/lib/loja/fila/mesa.ts`. "Partida terminou" acha a partida antes de contar (`previewPartida`, que não grava nada) e mostra quem a OpenDota conferiu e se a partida é de antes da live; "Trocar" põe quem espera no lugar de quem sai (`trocarJogador`: tira da party sem falta e chama; se a chamada falhar, quem saiu volta). As ações raras ficam no menu de cada pessoa, com segundo toque nas que não têm volta, e o resultado aparece num aviso com "Desfazer" quando dá para voltar. Os avisos são do sonner, e não os do site, porque os do site tocam som, que vazaria para a live. Letra de 14 px para cima, pela regra do Pedro de 25/05/2026 (nada de fonte pequena no sistema). `/party/mesa-previa` (só em desenvolvimento, 404 em produção) mostra a mesa com dados de exemplo e sem banco, e `scripts/loja/capturas-mesa-previa.mjs` fotografa todas as cenas e estados em 1920x1080 e 3440x1440.
24. **A vaga vale o dia, no revezamento** (migration 194). A ideia do Pedro, em 23/11/2026: "R$ 25 pela vaga... a pessoa pode jogar comigo até o quanto ela quiser, naquele dia", com quem compra tomando a vaga de quem já está quando não sobra lugar. O agente recomendou o revezamento no lugar de tomar a vaga de quem já pagou, e o Pedro escolheu "Vaga do dia". R$ 25 valem a live inteira: no fim de cada partida (`party_fila_revezar`, chamada por `party_fila_partida_terminou`), quem tem a vaga do dia cede o lugar se alguém espera e fica na party se ninguém espera. Fica primeiro quem jogou menos partidas com a vaga, e o empate vai para quem entrou antes na fila. Quem cede volta pelo revezamento da decisão 18, atrás de quem nunca jogou. No fim da live, a vaga que jogou termina (`concluido`), e a que não jogou nenhuma partida passa para a próxima live. A lotação conta a vaga do dia só até a primeira partida, então a venda reabre enquanto a live anda. É uma vaga por compra e uma de pé por pessoa (a compra confere antes, em `hasActiveDayPass`). Quem sai sozinho recebe a vaga inteira se não jogou nenhuma partida, e nada se jogou; sem nada a devolver, o Discord não avisa. O modo mora no produto (`store_products.party_mode`) e em cada reserva (`store_bookings.modo`): a cortesia e as vagas compradas antes seguem por partida, com mais e menos no painel. O Battlepass entra no mesmo revezamento e não precisa entrar de novo a cada partida. O JSON público ganhou `offer` (preço e modo da vaga à venda, `null` fora de venda) e `dayPass` em cada pessoa, para os overlays trocarem o texto sozinhos no dia em que o site publicar. As regras de detalhe (quem fica primeiro, a lotação, o reembolso e a vaga que passa para a próxima live) são do agente, dentro da escolha do Pedro.

## Limite conhecido

- Abrir uma live mais de 3 horas antes de uma live marcada cria uma live nova; enquanto ela estiver no ar, as reservas feitas para a marcada ficam fora da fila (não se perdem: voltam quando a marcada chega, ou passam para a live seguinte). Com uma live por dia, o caso não acontece.
- Quem comprou fora da live não recebe aviso quando a live começa: a página só toca o som de partida encontrada se estiver aberta. Chamado e fora da página, a pessoa volta para o fim da fila sem perder a vaga ("Não apareceu").

## Estados da vez

| Estado | Quando |
|---|---|
| `aguardando` | pagamento confirmado (ou entrada do Battlepass); posição pelo revezamento: a última vez na party do PPA, quem nunca jogou primeiro, empate pela hora em que entrou (`queued_at`). A vaga do dia volta para cá depois de cada partida quando alguém espera o lugar |
| `na_party` | o Pedro chamou; a pessoa recebe o aviso e o convite pela Steam |
| `concluido` | jogou todas as partidas compradas, ou a vaga do dia que jogou terminou com a live |
| `removido` | o Pedro tirou da fila, ou o pedido foi cancelado ou reembolsado |

"Não apareceu" devolve a pessoa ao fim da fila (`queued_at` novo, `no_shows` + 1), sem perder a vaga. Encerrar a live devolve quem estava na party para a fila, na ordem do revezamento: quem não chegou a jogar fica na frente, e quem jogou a partida que acabou volta atrás de quem nunca jogou.

Toda saída guarda o motivo em `queue_exit` (migration 175): `saiu` (a própria pessoa, só enquanto espera), `tirado` (o Pedro) ou `cancelado` (pedido cancelado ou reembolsado).

## Rotas

| Rota | Acesso |
|---|---|
| `/party` (EN `/party`, ES `/grupo`) | pública com a flag `loja` ligada; comprar exige login e Steam vinculada |
| `/api/party/fila` | pública, JSON sem dado pessoal, CORS aberto para os overlays |
| `/admin/loja/fila` | admin |
| `/fila` e `/qr` | atalhos com origem para o painel da loja: `/fila` no chat da live (`utm_medium=chat`), `/qr` no QR da tela (`utm_medium=qr`); lista em `src/lib/loja/tracked-links.ts` |

## Página do produto na loja

`/loja/vaga-na-party` leva sempre para `/party` (decisão técnica 15). Muda o plano v3, que mantinha a reserva antiga: a fila já vende para a próxima live marcada, e a página antiga vendia sem login nem Steam.

## Barra inferior e aba Loja

Com a flag `fila_competitiva` desligada (e a `loja` ligada), o botão verde da barra inferior vira "JOGAR COM O PEDRO" e leva a `/party`. A aba Loja ganha o ponto vermelho de ao vivo enquanto a live estiver no ar.

## Banco (migration 174)

- `store_live_sessions`: estados `ao_vivo` e `encerrada`, `on_air_at`, `off_air_at`, `seats_per_match` (até 4, a party do Dota tem 5 com o Pedro), `youtube_video_id`, `is_test`; uma live no ar por vez.
- `store_bookings`: `queue_state`, `queued_at`, `matches_played`, `called_at`, `no_shows`, `finished_at`.
- `store_orders.buyer_whatsapp` passa a aceitar nulo.
- Funções (só service role): `store_reservar_fila`, `party_fila_abrir_live`, `party_fila_encerrar_live`, `party_fila_chamar`, `party_fila_jogou`, `party_fila_partida_terminou`, `party_fila_ausente`, `party_fila_remover`.

## Banco (migration 194, vaga do dia)

- `store_products.party_mode` (`partidas` ou `dia`) diz como a vaga vende; a vaga na party passa a `dia`, uma por compra, com a unidade "por dia". `store_bookings.modo` guarda o modo de cada reserva: a cortesia e as vagas antigas ficam `partidas`, e o Battlepass passa a `dia`. A reserva do dia não tem teto de partidas (`matches_played` passa de `seats`).
- `party_fila_revezar` (nova) faz o revezamento no fim de `party_fila_partida_terminou`. `party_fila_jogou` mantém a vaga do dia na party, `party_fila_encerrar_live` termina a vaga do dia que jogou, `party_fila_ocupacao` conta a vaga do dia até a primeira partida, `store_reservar_fila` grava o modo do produto e recusa mais de uma vaga do dia por compra, `party_fila_entrar_battlepass` nasce no dia e `party_fila_ajustar_partidas` só mexe na vaga por partida.
- No JSON público, `offer` (`{ priceCents, mode }` ou `null`) e `dayPass` em cada pessoa da party e da fila; com `dayPass`, `played` são as partidas de hoje e `matches` vem 1.

## Banco (migration 177, fila aberta)

- `store_live_sessions.status` aceita `fila`, uma linha por ambiente (`store_live_sessions_uma_fila`), criada pela migration com 20 partidas e 4 lugares. Não apague nem encerre essa linha: sem ela, a página volta a vender só com live.
- `party_fila_live_atual` cai na fila aberta sem live no ar nem marcada. `party_fila_ocupacao` conta todo mundo que espera quando a live é a fila aberta, e a reserva ainda sem pagamento da fila aberta ocupa vaga na live. `store_reservar_fila` aceita a fila aberta. `party_fila_abrir_live` nunca adota a fila aberta e herda o tamanho dela.
- No JSON público, a fila aberta vem com `live.status = "fila"` e `live.startsAt = null`.

## Testes

- `scripts/seguranca/fila-da-party.sql`: regras do banco das migrations 174 a 179 e 194 (vermelho antes de cada uma, verde depois; os casos AG a AL são a vaga do dia), e `scripts/seguranca/battlepass.sql` (caso Q: o assinante segue no revezamento); `funcoes-abertas.sql` segue vazio.
- Vitest: estimativa de partidas até a vez (com a vaga do dia, que cede o lugar a cada partida), ordem da fila, JSON público sem dado pessoal e com `offer` e `dayPass`, botão da barra inferior, e as regras da mesa (`mesa.test.ts`: o próximo passo, o grupo de cada um na fila e a frase do topo da party).
- `pnpm loja:e2e`: compra da vaga do dia fora da live, na fila aberta, até a posição, a live que abre com quem comprou fora, a chamada e o aviso na tela em tempo real, a vaga do dia que segue na party sem ninguém esperando e termina no fim da live (`e2e-fila.mjs`); a mesa de operação (`e2e-fila-cortesia.mjs`: cortesia, mais e menos partidas pelo menu, pôr na party e tirar, completar a party, trocar quem está nela e contar a partida sem o ID); e as saídas com seis compradores (`e2e-fila-saidas.mjs`): disputa pela última vaga, não apareceu, saiu da fila, reembolso, partida terminou tocado duas vezes, o revezamento depois de cada partida, a lotação que libera depois da primeira partida, a live encerrada e a vaga que não jogou passando para a live seguinte. `FILA_VIDEO=<pasta>` grava a simulação em vídeo.

## Teste de 14 dias

Critério proposto pelo agente no plano v3 e registrado em 19/11/2026, quando o Pedro delegou as decisões da frente ("liberdade total"); o número não foi escolhido por ele, e ele pode mudar.

- **Começa** na primeira live real aberta no painel ou na primeira vaga vendida fora da live, o que vier antes (desde a decisão 16, a venda não espera a live), e **termina 14 dias depois**.
- **Passa** com 15 vagas vendidas ou mais. **Falha** com menos de 5. Entre 5 e 14, ajustar a oferta e a chamada da live antes de decidir.
- **Vaga** é a vaga paga: a soma de `quantity` dos pedidos pagos da vaga na party, sem teste (uma por vaga do dia; as compras de antes da decisão 24 contam as partidas).

```sql
with inicio as (
  select least(
    (select min(on_air_at) from public.store_live_sessions where not is_test and on_air_at is not null),
    (select min(o.paid_at) from public.store_orders o join public.store_products p on p.id = o.product_id
      where p.slug = 'vaga-na-party' and o.status = 'pago' and not o.is_test and o.paid_at >= '2026-11-19')
  ) as t
)
select coalesce(sum(o.quantity), 0) as vagas
  from public.store_orders o
  join public.store_products p on p.id = o.product_id, inicio
 where p.slug = 'vaga-na-party' and o.status = 'pago' and not o.is_test
   and o.paid_at >= inicio.t and o.paid_at < inicio.t + interval '14 days';
```
