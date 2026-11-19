# Fila da party ao vivo

Frente 1 do [plano v3](plano-v3.md), aberta em 19/11/2026. O plano manda sobre este documento quando divergir.

## O que faz

Quem assiste à live abre `/party`, vê a live, quem está na party do Pedro agora, a fila e as vagas abertas, e garante a vaga com Pix em dois toques: "Garantir minha vaga" e "Copiar código Pix". Depois de pagar, a pessoa vê a própria posição andar e é avisada, com o som de partida encontrada do jogo, quando o Pedro a chama para a party. O Pedro opera a fila em `/admin/loja/fila`, e os overlays da live leem `/api/party/fila`.

## Decisões técnicas

Cada uma com o porquê em uma linha.

1. **A fila mora na reserva da vaga (`store_bookings`), não numa tabela nova.** A vaga já é uma reserva de live com trava de lotação, retenção enquanto a pessoa paga, confirmação pelo webhook e devolução no reembolso; a fila só acrescenta o estado da vez.
2. **Um gatilho no banco põe na fila toda reserva de party confirmada** (`store_bookings_fila`). Qualquer caminho que confirma o pagamento (webhook, conciliação da página, cron) entra na fila igual, e cancelamento ou reembolso tira.
3. **A live fica no ar quando o Pedro abre no painel** (`status = 'ao_vivo'`), não pelo horário marcado. Live diária depende de agenda e saúde; o site nunca mostra "ao vivo" sem o Pedro estar transmitindo. O cron encerra a live esquecida aberta depois de 12 horas.
4. **Vagas abertas contam a fila, não o total da live.** `party_seats` é o tamanho máximo da fila em partidas; cada partida jogada devolve uma vaga. O Pedro não precisa mexer no número durante a live, e o que sobra para a próxima live fica limitado.
5. **Quem não jogou na live continua na fila, na mesma posição, para a próxima.** A fila da live atual inclui as entradas de lives anteriores que não terminaram; a reserva de uma live futura só entra quando aquela live chega.
6. **A compra na fila não pede nada digitado.** Nome público e e-mail vêm do login com Discord, o ID do Dota sai da Steam vinculada, e o WhatsApp deixa de ser obrigatório no pedido (o Pedro convida pela Steam).
7. **Posição em tempo real por consulta curta (3 s com a pessoa na fila, 8 s sem), não por canal do Realtime.** O celular derruba conexão aberta quando a aba vai para o fundo, então a consulta volta sozinha ao reabrir; a leitura é uma consulta pequena e os overlays usam o mesmo endereço.
8. **Leitura pública pelo servidor, com service role, e nome pela identidade pública** (`getIdentityMap`). Nenhuma função nova fica aberta ao visitante, e o JSON público não carrega id de usuário, e-mail nem WhatsApp.
9. **Operação da fila por funções do banco com trava na linha da live** (`party_fila_*`), só para o service role. Dois toques seguidos em "Chamar o próximo" não chamam duas pessoas para o mesmo lugar.
10. **Live e reserva de teste ficam separadas** (`store_live_sessions.is_test`): o `pnpm loja:e2e` abre uma live de teste que o site de produção nunca mostra.

## Estados da vez

| Estado | Quando |
|---|---|
| `aguardando` | pagamento confirmado; posição pela hora do pagamento (`queued_at`) |
| `na_party` | o Pedro chamou; a pessoa recebe o aviso e o convite pela Steam |
| `concluido` | jogou todas as partidas compradas |
| `removido` | o Pedro tirou da fila, ou o pedido foi cancelado ou reembolsado |

"Não apareceu" devolve a pessoa ao fim da fila (`queued_at` novo, `no_shows` + 1), sem perder a vaga. Encerrar a live devolve quem estava na party para a frente da fila.

## Rotas

| Rota | Acesso |
|---|---|
| `/party` (EN `/party`, ES `/grupo`) | pública com a flag `loja` ligada; comprar exige login e Steam vinculada |
| `/api/party/fila` | pública, JSON sem dado pessoal, CORS aberto para os overlays |
| `/admin/loja/fila` | admin |

## Barra inferior e aba Loja

Com a flag `fila_competitiva` desligada (e a `loja` ligada), o botão verde da barra inferior vira "JOGAR COM O PEDRO" e leva a `/party`. A aba Loja ganha o ponto vermelho de ao vivo enquanto a live estiver no ar.

## Banco (migration 174)

- `store_live_sessions`: estados `ao_vivo` e `encerrada`, `on_air_at`, `off_air_at`, `seats_per_match` (até 4, a party do Dota tem 5 com o Pedro), `youtube_video_id`, `is_test`; uma live no ar por vez.
- `store_bookings`: `queue_state`, `queued_at`, `matches_played`, `called_at`, `no_shows`, `finished_at`.
- `store_orders.buyer_whatsapp` passa a aceitar nulo.
- Funções (só service role): `store_reservar_fila`, `party_fila_abrir_live`, `party_fila_encerrar_live`, `party_fila_chamar`, `party_fila_jogou`, `party_fila_partida_terminou`, `party_fila_ausente`, `party_fila_remover`.

## Testes

- `scripts/seguranca/fila-da-party.sql`: regras do banco (vermelho antes da migration, verde depois); `funcoes-abertas.sql` segue vazio.
- Vitest: estimativa de partidas até a vez, ordem da fila, JSON público sem dado pessoal, botão da barra inferior.
- `pnpm loja:e2e`: compra da vaga pela fila até a posição, a chamada e o aviso na tela em tempo real.

## Teste de 14 dias

A partir do primeiro dia no ar, com live todo dia. Critério proposto no plano, a confirmar com o Pedro antes de valer.
