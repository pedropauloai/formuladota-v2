# Definição de pronto (DoD)

Cada critério se responde com sim ou não por quem não leu o código: um comando que passa ou falha, um comportamento observável em produção, ou uma decisão escrita com data. Presença de arquivo ou de palavra não conta.

## Loja (frente aberta em 06/11/2026)

Escopo: a loja do site em `https://www.formuladota.com.br/loja`, com catálogo escolhido pelo Pedro, checkout do Mercado Pago (Pix na página e cartão pelo Checkout Pro), pedido gravado no banco, aviso ao Pedro a cada venda e medição de visita e venda por origem. Spec técnica: [docs/loja/spec.md](loja/spec.md).

Denominador fechado: **13 critérios**.

| # | Critério | Como se prova | Estado |
|---|---|---|---|
| 1 | O Pedro escolheu o catálogo e os preços entre as versões apresentadas | decisão escrita em `docs/loja/catalogo.md`, com data e a frase dele | sim, 07/11/2026 ("Versão B"); o curso de Tinker espera a data de entrega |
| 2 | Os tipos do TypeScript fecham | `pnpm typecheck` sai com 0 | sim, 06/11/2026 (CI do PR 147) |
| 3 | O lint não acusa erro | `pnpm lint` sai com 0 | sim, 06/11/2026 (CI do PR 147) |
| 4 | Os testes passam, inclusive os da loja (assinatura do webhook, estado do pagamento, valor pago, origem da visita, aviso de venda) | `pnpm test` sai com 0 | sim, 06/11/2026 (CI do PR 147) |
| 5 | O build de produção fecha | `pnpm build` sai com 0 | sim, 06/11/2026 (CI do PR 147) |
| 6 | Uma compra de teste passa ponta a ponta no localhost: o Pix é gerado na página do pedido, e um pagamento aprovado no sandbox vira pedido `pago` no banco com aviso ao Pedro entregue no Discord | `pnpm loja:e2e` sai com 0 (o roteiro confere cada ponto e falha alto em qualquer um). O Pix de teste da API de Payments não se aprova sozinho no sandbox, então a aprovação é provada com cartão de teste na mesma referência do pedido, o mesmo objeto `payment` que o Checkout Pro gera | sim no localhost, 07/11/2026 (16 de 16 verificações, com pedido de 2 unidades cobrando o dobro) |
| 7 | O webhook aceita notificação com assinatura certa e recusa a errada | `pnpm loja:e2e` envia as duas ao servidor local e confere 200 e 401 | sim no localhost, 06/11/2026 |
| 8 | O cartão abre o Checkout Pro do Mercado Pago com o valor do pedido | `pnpm loja:e2e` cria a preferência no sandbox e confere que o navegador chega à página do Checkout Pro | sim no localhost, 06/11/2026 |
| 9 | O site no domínio novo mostra a loja com todos os produtos ativos do catálogo | `bash scripts/loja/verificar-producao.sh` sai com 0 (requisição HTTP ao endereço real) | sim, 07/11/2026 (flag ligada: 20 de 20, com os 7 produtos, o checkout de cada um e a credencial ao vivo do Pedro) |
| 10 | Em produção, o checkout de um produto gera o Pix com a credencial real (sem pagar) | `bash scripts/loja/verificar-producao.sh` confere a página do produto; a geração do Pix fica registrada com captura de tela em `docs/loja/provas/` | não |
| 11 | O webhook de produção do Mercado Pago aponta para o domínio novo e responde 200 | histórico de notificações da aplicação FormulaDota sem falha depois da troca, ou simulação do painel com 200 | não |
| 12 | Uma visita com `?utm_source=instagram` aparece no banco e o painel `/admin/loja` mostra visitas, pedidos e receita por origem | `pnpm loja:e2e` confere a linha em `site_visits`; o painel é conferido em captura | não: a visita no banco passou no localhost e no domínio real (06/11/2026, a de verificação foi apagada depois); a tela do painel pede o login Discord do Pedro e fica para a primeira vez que ele abrir |
| 13 | O overlay por assinatura com dicas durante a partida está registrado no backlog, sem construir | entrada datada em `.planning/BACKLOG.md` | sim, 06/11/2026 |

### O que o percentual não significa

- 13 de 13 não quer dizer que houve venda real nem que o tráfego está chegando: prova que a loja funciona e mede, não que vende.
- Não cobre cartão real com desafio do banco (3DS): o sandbox do Checkout Pro não pede o desafio, e o primeiro cartão real é a prova.
- Não cobre o e-mail ao comprador enquanto o domínio `formuladota.com.br` não estiver verificado no Resend: até lá o aviso de venda chega ao Pedro pelo Discord e pelo e-mail da conta do Resend.
- O checkpoint de 27/11/2026 (receita do canal somando todas as fontes) usa o painel do critério 12, mas a decisão de manter ou mudar o canal é do Pedro e fica fora deste DoD.

## Agenda da loja (frente aberta em 18/11/2026)

Escopo: o comprador escolhe o horário (ou a live) na própria compra, sem WhatsApp, e o Pedro controla a agenda no painel. Spec: [docs/loja/agenda.md](loja/agenda.md). Denominador fechado: **5 critérios**.

| # | Critério | Como se prova | Estado |
|---|---|---|---|
| A1 | Produto com horário segura o horário na compra e confirma no pagamento | `pnpm loja:e2e` confere reserva, duração, confirmação e a página do pedido | sim no localhost, 18/11/2026 (21 de 21) |
| A2 | Dois compradores nunca ficam com horários sobrepostos | duas chamadas de `store_reservar_agenda` no mesmo intervalo: a segunda volta nula | sim, 18/11/2026 (banco de produção, reservas de teste canceladas depois) |
| A3 | Os horários oferecidos respeitam disponibilidade, ocupação, antecedência de 12 h e janela de 21 dias | `pnpm test` (`src/lib/loja/agenda.test.ts`) | sim, 18/11/2026 |
| A4 | O comprador baixa o horário para a agenda do celular | `pnpm loja:e2e` baixa o `.ics` da página do pedido | sim no localhost, 18/11/2026 |
| A5 | O Pedro marca live, ajusta disponibilidade e vê os horários vendidos no painel | captura de `/admin/loja/agenda` logado como admin | não: o painel pede o login Discord do Pedro |

## Fila da party ao vivo (frente aberta em 19/11/2026)

Spec: [loja/fila-da-party.md](loja/fila-da-party.md). Critérios do [plano v3](loja/plano-v3.md), seção "Como cada frente prova que terminou".

| # | Critério | Como se prova | Estado |
|---|---|---|---|
| F1 | As regras do banco seguram a fila: lotação, pagamento entra na fila, chamar, jogou, não apareceu, encerrar, uma live no ar, e nem logado nem visitante operam a fila | `scripts/seguranca/fila-da-party.sql` com todos os itens "=ok" (vermelho antes da migration 174), e `funcoes-abertas.sql` vazio | sim, 19/11/2026 (18 de 18, banco de produção, nada gravado) |
| F2 | A compra da vaga pela fila vai até a posição: Pix na página com um toque, pagamento aprovado, posição na tela | `pnpm loja:e2e` (parte da fila) | sim no localhost, 19/11/2026 (23 de 23) |
| F3 | A chamada do Pedro chega na tela de quem comprou em tempo real, com o aviso "Chegou a sua vez" | `pnpm loja:e2e` mede o tempo entre a chamada e o aviso (limite de 15 s) | sim no localhost, 19/11/2026 (cerca de 3 s) |
| F4 | O endpoint dos overlays não leva dado pessoal além do nome público | `pnpm loja:e2e` procura id de usuário, e-mail e WhatsApp no JSON | sim no localhost, 19/11/2026 |
| F5 | O site no ar tem a página da fila nos dois slugs, o JSON dos overlays e os atalhos da live (`/fila` no chat, `/qr` na tela) | `pnpm cf:verificar` termina com `falhas: 0` | sim, 19/11/2026 (versão `95602e95` da Cloudflare, 16 de 16) |
| F6 | O Pedro fez uma compra real de teste pela fila | pedido pago com `is_test = false` no painel `/admin/loja` | não |
| F7 | Vários compradores ao mesmo tempo e todas as saídas: disputa pela última vaga sem passar da lotação, não apareceu, saiu da fila (com aviso ao Pedro), reembolso, partida contada uma vez, live encerrada com gente na party e fila passando de uma live para a outra | `pnpm loja:e2e` (parte das saídas, `e2e-fila-saidas.mjs`) | sim no localhost, 19/11/2026 (33 de 33) |
| F8 | Os achados da revisão independente de 19/11/2026 estão corrigidos: uma vaga por pessoa na party, posição de quem passou de live, partida contada uma vez, compra antiga sem login fora da fila, cartão que não trava, vaga confirmada no webhook repetido, um Pix pendente por pessoa | `scripts/seguranca/fila-da-party.sql` (S, T) e `pnpm loja:e2e` | sim, 19/11/2026 |
| F9 | A vaga vende fora da live (pedido do Pedro, 19/11/2026): sem live no ar nem marcada, a compra entra na fila aberta, com tamanho próprio, e quem comprou fora é chamado quando o Pedro abre a live | `scripts/seguranca/fila-da-party.sql` (U a Z2, vermelho antes da migration 177) e `pnpm loja:e2e` (parte da fila: compra sem live, posição, JSON com `status: "fila"`, live que herda o tamanho, chamada na tela) e o JSON de produção | sim, 19/11/2026: banco 34 de 34 (nada gravado), e2e da fila 31 de 31 no localhost, e em produção `/api/party/fila` com `status: "fila"` e 20 vagas abertas (versão `95602e95`) |
| F10 | A party da página mostra os mesmos lugares livres que os overlays: o lugar de quem está com a vez não aparece como vaga, e as vagas mostradas não passam das vagas abertas da fila | vitest de `partySeatsView` (4 casos; a mutação que volta à regra antiga deixa os testes vermelhos) | sim, 19/11/2026 |
