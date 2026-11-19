# Battlepass FORMULADOTA

Mensalidade de R$ 120 do site. Frente aberta em 19/11/2026. Manda sobre `src/lib/plans.ts`, `src/lib/subscriptions/tiers.ts` e `docs/foundations/COMPENDIUM.md` quando divergir.

## A oferta (decidida pelo Pedro em 19/11/2026)

Pedido dele, com as palavras dele: "quero muito trabalhar um sistema de mensalidade na plataforma no valor de 120 reais. essa mensalidade da beneficios para jogar em pt comigo e tambem participar dos lobbys".

Respostas dele às opções que o agente levou (uma pergunta só, com recomendação):

| Ponto | Decisão do Pedro | Frase dele |
|---|---|---|
| Party | o assinante joga sempre que quiser, respeitando a fila; com mais gente querendo jogar, a ordem é o revezamento pela hora da última participação | "o assinante vai poder jogar sempre que quiser. é uma vantagem mt forte pra garantir a mensalidade e recorrencia. porém ele precisa respeitar a fila e se tiver mais jogadores querendo jogar precisa ir revesando pela hora da ultima participação" |
| Registro da partida | o Pedro registra o ID da partida (OpenDota) no site, e o site grava a data e a hora de quem jogou, pela Steam vinculada | "precisamos de um sistema aonde eu registre o ID da partida pelo opendota no site e registra a data e hora dos jogadores" |
| Lobbies | as salas do site, no sistema de buscar partida; voltam quando a enquete de 50 interessados for respondida (o bot da Steam volta no Railway por US$ 5 por mês) | "é as salas do site no sistema de buscar partida. vou pagar os 5 dolares em breve, mas essas salas só irão voltar quando o questionario/enquete de 50 interessados for respondido" |
| Planos de hoje | plano único: a `/planos` fica com o Gratuito e o Battlepass; Godlike (R$ 27,90) e Beyond Godlike (R$ 97,90) saem | escolheu "Plano único (Recomendado)" |
| Nome | Battlepass FORMULADOTA | "Battlepass FORMULADOTA" |
| Idiomas | só o público em português por agora | "nao me importo com os outros idiomas agora. estou trabalhando somente para o publico em portugues" |
| Preço | R$ 120 por mês | decisão dele, anterior à pergunta |

Conflito registrado, sem reabrir: a memória do projeto (`project_freemium_lowticket`) punha o topo em R$ 97,90 e a cultura (sala, grupo, doutrina) de graça. O preço de R$ 120 é decisão nova do Pedro. Entrar em sala grátis continua grátis: o Battlepass não fecha nada que hoje é livre.

## O que o assinante leva

1. **Party com o PPA sempre que quiser**, sem pagar a vaga. Ele entra na fila da `/party` com um toque e, depois de jogar, entra de novo. Uma entrada por vez.
2. **Salas do site**, quando voltarem: criar sala e o lobby elite (que continua pedindo Imortal da Valve e Místico nível 30). Hoje as salas estão pausadas pela flag `fila_competitiva`; voltam quando a enquete chegar a 50 interessados.
3. **Selo Battlepass** ao lado do nome na fila da party e no perfil.
4. **Garantia de 7 dias**: desistiu em até 7 dias do primeiro pagamento, o dinheiro volta inteiro.

Sem promessa de resultado (MMR, vitória): o que se vende é jogar com o PPA, não o resultado da partida.

## Revezamento da fila da party

Regra única para todos, quem pagou a vaga avulsa (R$ 25) e quem tem o Battlepass:

- A ordem da fila é a hora da **última vez na party do PPA**: quem jogou há mais tempo joga primeiro, e quem nunca jogou vai na frente de todos. Empate: quem entrou antes na fila.
- "Não apareceu" conta como vez gasta: a pessoa vai para o fim do revezamento, como se tivesse jogado naquela hora.
- A party continua com até 4 lugares por partida, e o painel do Pedro continua chamando o próximo da fila.
- O assinante não ocupa lugar na lotação que limita a venda da vaga avulsa: a lotação existe para ninguém pagar por partida que não cabe na live, e o assinante não paga por partida.

A última vez na party vem de duas fontes, e vale a mais recente:

1. **Partida registrada pelo Pedro.** No painel da fila, "Partida terminou" pede o ID da partida (o painel sugere a última partida do PPA na OpenDota). O site busca a partida na OpenDota, confere quem do time do PPA tem a Steam vinculada e grava a participação de cada um com a data e a hora em que a partida terminou (`party_participacoes`). Quem estava na party e não aparece na partida (perfil do Dota privado, por exemplo) também fica registrado, com a marca "não conferido".
2. **"Não apareceu"** no painel, que grava a hora da chamada perdida.

Decisões técnicas do agente (19/11/2026), cada uma com o porquê:

- **A regra vale para todos**, e não só entre assinantes: o Pedro descreveu o revezamento pela última participação de quem quer jogar; para quem nunca jogou, a ordem é a mesma de hoje (hora do pagamento), e nenhuma venda real existia antes da mudança.
- **Participação de quem joga com o PPA fora da fila também conta**: se a Steam vinculada aparece no time do PPA numa partida registrada, a pessoa jogou com ele, e o revezamento é sobre isso.
- **A OpenDota confirma, mas não decide sozinha**: perfil privado do Dota esconde o jogador na partida, então quem o Pedro chamou para a party fica registrado mesmo sem a confirmação.

A integração com a fila (entrada sem pedido, ordem e registro da partida) mexe nos arquivos da sessão "Fila da party ao vivo" e foi combinada com ela antes de entrar.

## Cobrança

| Forma | Como funciona | Por quê (decisão técnica do agente) |
|---|---|---|
| Cartão, renovação automática | assinatura do Mercado Pago (API de assinaturas, `preapproval`), R$ 120 por mês, autorizada pelo comprador no checkout do Mercado Pago | é a mensalidade de verdade; a aplicação FormulaDota tem permissão nessa API (leitura 200 em produção em 19/11/2026, e uma assinatura de teste já foi criada por ela em 04/07) |
| Pix, 30 dias | um Pix de R$ 120 (API de Payments, a mesma da loja) libera 30 dias, sem renovação automática; pagar de novo soma 30 dias a partir do fim do período | o Pix Automático não aparece na documentação da API de assinaturas, e muita gente do público não tem cartão de crédito |

- **Taxa** (página oficial de assinaturas do Mercado Pago, lida em 19/11/2026): 4,49% no crédito com o dinheiro na hora, 3,99% para receber em 30 dias. Com 4,49%, sobram R$ 114,61 por mês por assinante.
- **Ativação**: o webhook do Mercado Pago ativa; a volta do checkout para a `/planos` e o cron do site conferem o estado direto no Mercado Pago, para a assinatura não depender só do webhook.
- **Cancelamento no cartão**: para a renovação; o acesso fica até o fim do período pago.
- **Garantia de 7 dias**: nos 7 primeiros dias depois do primeiro pagamento, a página troca "Cancelar" por "Cancelar e pedir o dinheiro de volta". O acesso termina na hora, a renovação para, e o canal de vendas do Discord avisa o Pedro de quanto devolver e a quem, como na saída da fila da party. O reembolso é feito no Mercado Pago, e o webhook marca o pagamento como devolvido.
- **Planos antigos**: Godlike e Beyond Godlike saem da página e da compra. Os tiers `plus` e `premium` continuam valendo no banco para quem tiver linha antiga (nenhum assinante pago em 19/11/2026), e o lobby elite aceita `premium` e `battlepass`.

## A conta da meta (19/11/2026)

- Meta do Pedro: R$ 5.000 por mês de receita recorrente, somando todas as frentes (`formuladota-lives/PLANO.md`).
- Com R$ 114,61 líquidos por assinante: a meta inteira pede 44 assinantes; a metade, 22. Com 10 assinantes, entram R$ 1.146 por mês (23% da meta).
- Para comparar: a live tem média de 23 pessoas assistindo ao mesmo tempo (pico de 45, out/2026).
- Capacidade da party: com 20 lives por mês e 4 partidas de party por live, são 320 lugares por mês. Com o revezamento, o assinante não tem cota: com muita gente, cada um joga menos vezes, e a fila mostra a posição de cada um.

## Teste de 30 dias

Critério proposto pelo agente em 19/11/2026 (o Pedro não escolheu o número e pode mudar):

- **Começa** no dia em que o Battlepass entra à venda em produção e **termina 30 dias depois**.
- **Passa** com 5 assinantes pagos ou mais. **Falha** com menos de 2. Entre 2 e 4, ajustar a chamada na live e a página antes de decidir.
- **Assinante pago** é quem teve pelo menos um pagamento confirmado no período, sem teste e sem reembolso:

```sql
select count(distinct p.user_id) as assinantes
  from public.subscription_payments p
 where p.status = 'pago' and not p.is_test
   and p.paid_at >= :inicio and p.paid_at < :inicio + interval '30 days';
```

## Banco

Migrations a partir da 190 (fila: 174 a 179; senha da sala: 173; notas de patch: 180 em diante). Nunca `supabase db push`: SQL pela Management API e registro em `supabase_migrations.schema_migrations` com versão por data.

- `subscriptions`: tier `battlepass` e provedor `pix`.
- `subscription_payments`: cada pagamento do Battlepass (cobrança do cartão e Pix), com valor, estado, período que o pagamento cobre e o ID do pagamento no Mercado Pago. Só o dono lê os seus; ninguém escreve pelo navegador.
- `party_participacoes`: uma linha por pessoa por partida com o PPA (ID da partida, data e hora, se a OpenDota confirmou).
- Funções de escrita só para o service role, com trava e idempotência: confirmar Pix, registrar cobrança do cartão, pedir reembolso, registrar partida.

## Telas

- `/planos`: o Battlepass no kit 2.0 (`src/components/v2`), com o preço, o que leva, como funciona o revezamento, a garantia e as duas formas de pagar; o assinante vê o estado (até quando vale, próxima cobrança, cancelar). `/battlepass` leva para lá (link curto para a live).
- `/party`: com o Battlepass, "Entrar na fila" sem pagamento.
- Painel da fila: "Partida terminou" com o ID da partida.
- `/admin/battlepass`: assinantes, estado, forma de pagamento e pagamentos.

## Como se prova

Critérios em `docs/definicao-de-pronto.md`, seção "Battlepass FORMULADOTA".

## Fora de agora

- Inglês e espanhol: as chaves existem nos três arquivos de texto (a paridade é regra do projeto), com tradução simples; o público do Battlepass é o brasileiro.
- Stripe (LATAM e Europa) para o Battlepass.
- Moldura cosmética do Battlepass na coleção: o selo vem antes.
