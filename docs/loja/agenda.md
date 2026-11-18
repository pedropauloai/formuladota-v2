# Agenda da loja

Pedido do Pedro em 18/11/2026: "eu gostaria de ter uma forma ali da pessoa fazer o agendamento dela direto ali, não quero que vai para o meu WhatsApp... O meu próprio site tem que ter um sistema de gerenciamento aí da cobrança e dos horários da agenda."

## Como funciona

| Produto | Na compra | Depois |
|---|---|---|
| Mentoria 1:1 | escolhe dia e horário (90 min) e informa os IDs das duas partidas | remarca até 24 h antes |
| Acompanhamento 30 dias | escolhe a primeira mentoria (90 min) | marca as outras três na página do pedido; remarca até 24 h antes |
| Jogar junto | escolhe dia, horário e partidas (60 min por partida) | remarca até 24 h antes |
| Vaga na party da live | escolhe a live e quantas partidas | o Pedro convida pelo ID do Dota na hora |
| Seu replay ao vivo | escolhe a live e informa o ID da partida | o replay entra na frente da fila |
| Análise gravada, boost | sem horário | a entrega (link e recado) aparece na página do pedido |

- **Horários livres** saem da disponibilidade semanal do Pedro, menos agendamentos, lives marcadas e bloqueios. Os horários começam de 30 em 30 minutos, com 12 horas de antecedência mínima e até 21 dias à frente, sempre no horário de Brasília. A regra fica em `src/lib/loja/agenda.ts`, com testes.
- **Pagamento:** a reserva segura o horário por 35 minutos. Em produto com horário, o Pix e o cartão vencem em 30 minutos (o mínimo do Mercado Pago para o Pix), então ninguém paga um horário que já voltou para a agenda. Com o pagamento aprovado, a reserva vira horário confirmado; pedido vencido, cancelado ou reembolsado devolve o horário.
- **Horário duplicado:** é impossível no banco. Uma restrição de exclusão (`store_bookings_agenda_sem_sobreposicao`) recusa dois horários sobrepostos, inclusive com duas compras no mesmo segundo. A vaga na live usa trava na linha da live (`store_reservar_live`).
- **Avisos ao Pedro:** saem no canal de vendas do Discord. O aviso de venda já traz o horário, e sessão marcada depois da compra ou remarcação geram um aviso de agenda.
- **Para o comprador:**
  - a página do pedido mostra o horário;
  - o botão "Adicionar à agenda" baixa um arquivo `.ics`, que o celular e o Google Agenda abrem;
  - para as sessões, há um atalho para o Discord do FORMULADOTA;
  - o e-mail ao comprador espera o domínio verificado no Resend.

## Painel

`/admin/loja/agenda` reúne:
- os próximos horários vendidos, com o contato do comprador e os botões concluir e cancelar;
- as lives (marcar com vagas na party e replays, ou cancelar quando não há vaga vendida);
- a disponibilidade semanal, os bloqueios e a entrega dos produtos sem horário.

A disponibilidade inicial é de 19h às 22h todos os dias, a que o Pedro tinha registrada no vault. Ele ajusta pelo painel.

## Banco

- **Migration 162:**
  - tabelas `store_availability`, `store_blocked_periods`, `store_live_sessions` e `store_bookings`;
  - funções `store_reservar_agenda`, `store_reservar_live` e `store_remarcar_agenda`, só para o service role;
  - colunas de agenda em `store_products` e de entrega em `store_orders`.
- **Migration 163:** os textos de "como funciona" sem WhatsApp e o campo `match_ids` da mentoria.

## Fora desta versão

- E-mail ao comprador: depende do domínio `formuladota.com.br` verificado no Resend.
- Lembrete antes da sessão.
- Live recorrente: hoje se marca uma a uma.
- Troca de live pelo próprio comprador.
- Agenda do Pedro assinada no Google Agenda.
