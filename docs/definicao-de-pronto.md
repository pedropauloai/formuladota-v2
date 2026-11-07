# Definição de pronto (DoD)

Cada critério se responde com sim ou não por quem não leu o código: um comando que passa ou falha, um comportamento observável em produção, ou uma decisão escrita com data. Presença de arquivo ou de palavra não conta.

## Loja (frente aberta em 06/11/2026)

Escopo: a loja do site em `https://www.formuladota.com.br/loja`, com catálogo escolhido pelo Pedro, checkout do Mercado Pago (Pix na página e cartão pelo Checkout Pro), pedido gravado no banco, aviso ao Pedro a cada venda e medição de visita e venda por origem. Spec técnica: [docs/loja/spec.md](loja/spec.md).

Denominador fechado: **13 critérios**.

| # | Critério | Como se prova | Estado |
|---|---|---|---|
| 1 | O Pedro escolheu o catálogo e os preços entre as versões apresentadas | decisão escrita em `docs/loja/catalogo.md`, com data e a frase dele | não |
| 2 | Os tipos do TypeScript fecham | `pnpm typecheck` sai com 0 | não |
| 3 | O lint não acusa erro | `pnpm lint` sai com 0 | não |
| 4 | Os testes passam, inclusive os da loja (assinatura do webhook, estado do pagamento, valor pago, origem da visita, aviso de venda) | `pnpm test` sai com 0 | não |
| 5 | O build de produção fecha | `pnpm build` sai com 0 | não |
| 6 | Uma compra de teste com Pix passa ponta a ponta no localhost: pagamento aprovado no sandbox, pedido `pago` no banco e aviso ao Pedro entregue | `pnpm loja:e2e` sai com 0 (o roteiro confere os três pontos e falha alto em qualquer um) | não |
| 7 | O webhook aceita notificação com assinatura certa e recusa a errada | `pnpm loja:e2e` envia as duas ao servidor local e confere 200 e 401 | não |
| 8 | O cartão abre o Checkout Pro do Mercado Pago com o valor do pedido | `pnpm loja:e2e` cria a preferência no sandbox e confere que o link responde 200 | não |
| 9 | O site no domínio novo mostra a loja com todos os produtos ativos do catálogo | `bash scripts/loja/verificar-producao.sh` sai com 0 (requisição HTTP ao endereço real) | não |
| 10 | Em produção, o checkout de um produto gera o Pix com a credencial real (sem pagar) | `bash scripts/loja/verificar-producao.sh` confere a página do produto; a geração do Pix fica registrada com captura de tela em `docs/loja/provas/` | não |
| 11 | O webhook de produção do Mercado Pago aponta para o domínio novo e responde 200 | histórico de notificações da aplicação FormulaDota sem falha depois da troca, ou simulação do painel com 200 | não |
| 12 | Uma visita com `?utm_source=instagram` aparece no banco e o painel `/admin/loja` mostra visitas, pedidos e receita por origem | `pnpm loja:e2e` confere a linha em `site_visits`; o painel é conferido em captura | não |
| 13 | O overlay por assinatura com dicas durante a partida está registrado no backlog, sem construir | entrada datada em `.planning/BACKLOG.md` | não |

### O que o percentual não significa

- 13 de 13 não quer dizer que houve venda real nem que o tráfego está chegando: prova que a loja funciona e mede, não que vende.
- Não cobre cartão real com desafio do banco (3DS): o sandbox do Checkout Pro não pede o desafio, e o primeiro cartão real é a prova.
- Não cobre o e-mail ao comprador enquanto o domínio `formuladota.com.br` não estiver verificado no Resend: até lá o aviso de venda chega ao Pedro pelo Discord e pelo e-mail da conta do Resend.
- O checkpoint de 27/11/2026 (receita do canal somando todas as fontes) usa o painel do critério 12, mas a decisão de manter ou mudar o canal é do Pedro e fica fora deste DoD.
