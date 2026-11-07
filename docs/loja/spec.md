# Loja do FORMULADOTA: spec técnica

Aberta em 06/11/2026. DoD da frente: [docs/definicao-de-pronto.md](../definicao-de-pronto.md). Catálogo e preço são decisão do Pedro e moram em [catalogo.md](catalogo.md); esta spec cobre só a máquina.

## O que a loja faz

Quem chega do Instagram, do TikTok ou do YouTube abre `/loja`, escolhe um produto, preenche o contato, paga com Pix na própria página ou com cartão no Mercado Pago, e vê o pedido confirmado. O Pedro recebe o aviso da venda com o contato do comprador e combina a entrega fora do site. O painel `/admin/loja` mostra visitas, pedidos e receita por origem.

## Decisões técnicas

Cada uma com o porquê em uma linha.

1. **Pix na página pela API de Payments (`POST /v1/payments`), cartão pelo Checkout Pro (`POST /checkout/preferences`).** A aplicação FormulaDota do Mercado Pago só tem permissão nessas duas APIs: a sondagem de 06/11/2026 com a credencial de produção devolveu 403 de política na API de Orders e 400 de validação em Payments e Preferences. O Pix na página já rodou em produção (fichas) e é o meio que o brasileiro usa; o Checkout Pro cuida de parcelamento, desafio do banco (3DS), antifraude e saldo da conta Mercado Pago sem o número do cartão passar pelo site.
2. **Serviço se compra sem login; produto que vive dentro do site pede login.** Quem chega do Instagram compra no navegador do celular, e o serviço (mentoria, boost, jogar junto) se combina fora do site. Videoaula e assinatura dependem de conta, então pedem o login Discord que o app já tem.
3. **Tabelas próprias: `store_products`, `store_product_variants`, `store_orders`.** As fichas (`packages` e `purchases`) carregam crédito em ledger, RLS de doutrina e Steam vinculado; a loja vende serviço com formulário próprio e não pode herdar essas travas.
4. **Duas vias de confirmação que convergem na mesma transição idempotente** (`pendente` para `pago` num UPDATE condicional): o webhook `payment` e a conciliação da página do pedido, que consulta o Mercado Pago. O webhook pode atrasar ou falhar, e no localhost ele não chega.
5. **Aviso ao Pedro pelo Discord (webhook de canal privado, com menção) e por e-mail (Resend), depois da resposta, com `after()`.** O `after()` do Next vira `waitUntil` no Worker pelo OpenNext, então o aviso não atrasa o 200 nem morre com a requisição. O Discord não depende do DNS do domínio novo; o e-mail é a segunda via.
6. **Medição própria de visita por origem.** O build de produção não tem PostHog nem GA configurados (06/11/2026), e o checkpoint de 27/11 precisa de visita, pedido e receita por origem numa consulta só. Um beacon grava a visita em `site_visits` uma vez por sessão e a rota devolve o cookie `fd_origem` (último toque com UTM, 30 dias), que o pedido copia.
7. **Flag `loja` autoritativa.** Desligada, `/loja` some para todos, inclusive admin (regra da casa para feature flag).
8. **O valor vem sempre do banco, nunca do navegador.** O webhook confere moeda BRL e valor pago maior ou igual ao do pedido; abaixo disso o pedido vai para `em_revisao` e o Pedro é avisado.
9. **O e2e roda o fluxo real contra o sandbox.** Cria o pedido pela mesma ação do botão, paga no sandbox com cartão de teste pela API (o mesmo objeto `payment` que o Checkout Pro gera, com a mesma `external_reference`), envia ao servidor local a notificação assinada e confere banco e Discord. O Pix do sandbox da API de Payments não se aprova sozinho, então a criação do Pix (QR) e a confirmação são provadas em passos separados.

## Modelo de dados (migration `158_loja.sql`)

- `store_products`: `slug` único, `kind` (`servico` ou `digital`), `title`, `summary`, `description_md`, `delivery_md` (o que acontece depois do pagamento), `form_fields` (lista do que o checkout pede além de nome, e-mail e WhatsApp: `discord`, `dota_id`, `mmr_atual`, `mmr_alvo`, `observacoes`), `requires_login`, `active`, `display_order`.
- `store_product_variants`: opção com preço do produto (`label`, `price_cents`, `active`, `display_order`). Todo produto tem ao menos uma.
- `store_orders`: retrato do que foi vendido (`product_title`, `variant_label`, `amount_cents`), contato do comprador, respostas do formulário (`details`), `payment_method` (`pix` ou `cartao`), `status` (`pendente`, `pago`, `em_revisao`, `expirado`, `cancelado`, `reembolsado`), IDs do Mercado Pago, dados do Pix, origem (`utm_*`, `referrer_host`, `landing_path`), `is_test`, `paid_at`, `notified_at`, `fulfilled_at`.
- `site_visits`: uma linha por sessão de navegador, com caminho, `utm_*`, domínio de origem e país (cabeçalho da Cloudflare). Sem IP, sem e-mail, sem nada que identifique a pessoa.
- RLS ligada em todas. Catálogo ativo tem leitura pública; pedido e visita só pelo service role, e o comprador logado lê os próprios pedidos.

### Catálogo da versão B (migration `160_loja_catalogo.sql`, 07/11/2026)

Decisão e preços em [catalogo.md](catalogo.md). Colunas novas em `store_products`:

- `mode` (`live`, `gravado`, `fora_da_live`, `agendado`, `digital`): a seção da vitrine e a etiqueta do card.
- `art`: arte oficial da Valve (`item:<nome>`, `hero:<nome>` ou `medalhas`), por hotlink do CDN.
- `price_unit` (`por partida`, `a cada 100 MMR`) e `max_quantity`: produto por partida vende até 5 num pedido; `store_orders.quantity` guarda quantas.
- `monthly_capacity`: vagas do mês (mentoria 8, acompanhamento 3), contadas em `src/lib/loja/capacity.ts` (mês de São Paulo; pago e em conferência ocupam; pendente segura 30 minutos).
- `mmr_tiers`: faixas do boost; o preço sai ponto a ponto em `src/lib/loja/pricing.ts`, a mesma conta no formulário e no servidor.
- `is_test`: o produto do teste de ponta a ponta nunca aparece com a credencial de produção.

A prova da primeira dobra (medalha, posição no ranking e números de Tinker do Pedro) lê o cache de carreira do perfil dele; o cron de cada minuto renova o cache quando passa de 6 horas (`src/lib/loja/owner-proof.ts`). Para ver a vitrine no `next dev` com a flag desligada, `LOJA_PREVIA_LOCAL=1`: o build de produção ignora.

## Fluxos

**Compra com Pix.** `/loja/[slug]` envia a ação `criarPedido`: valida com Zod contra os campos do produto, lê preço do banco, grava `pendente` com a origem do cookie, cria o Pix (`external_reference = loja-<id>`, `notification_url` só quando o site é https) e leva a `/loja/pedido/[id]`, que mostra QR e copia e cola e consulta o status a cada 4 segundos.

**Compra com cartão.** A mesma ação cria a preferência (cartão, saldo e linha de crédito; boleto e lotérica fora), grava o ID e devolve o link do Checkout Pro. A volta do Mercado Pago cai em `/loja/pedido/[id]`.

**Confirmação.** O webhook valida a assinatura (`x-signature`), busca o pagamento no Mercado Pago e, se a `external_reference` começa com `loja-`, entrega para a loja; o resto segue o fluxo antigo das fichas sem mudança. A página do pedido concilia pelo `GET /v1/payments/search?external_reference=...`, no máximo uma consulta a cada 3 segundos por pedido. Quem vencer a transição dispara o aviso; o outro vira no-op.

**Aviso de venda.** Mensagem no canal privado de vendas do Discord, com menção ao Pedro, produto, opção, valor, meio, contato (link direto para o WhatsApp do comprador), respostas do formulário e origem. Venda de teste sai marcada `[TESTE]`. O e-mail vai para `STORE_NOTIFY_EMAIL`.

## Rotas

| Rota | Acesso |
|---|---|
| `/loja`, `/loja/[slug]` | pública (com a flag `loja` ligada) |
| `/loja/pedido/[id]` | pública; o UUID do pedido é a chave, e a página mostra só produto, valor, status e o Pix |
| `/api/visita` | pública, com limite por IP; grava a visita e devolve o cookie de origem |
| `/api/webhooks/mercadopago` | Mercado Pago, com assinatura |
| `/admin/loja` | admin |

## Variáveis de ambiente novas

| Nome | Tipo | Para quê |
|---|---|---|
| `SALES_DISCORD_WEBHOOK_URL` | segredo | webhook do canal privado de vendas |
| `PEDRO_DISCORD_USER_ID` | público | menção que faz o celular do Pedro tocar |
| `STORE_NOTIFY_EMAIL` | segredo | e-mail que recebe o aviso de venda |

## Segurança

- Assinatura do webhook obrigatória (HMAC do Mercado Pago); estado sempre lido do Mercado Pago com o Access Token, nunca do corpo da notificação.
- Pedido e visita só com service role; a página do pedido não mostra e-mail, WhatsApp nem respostas do formulário.
- O payload guardado do Mercado Pago passa por limpeza (sem `ticket_url`, `caller_id` nem token).
- Limite por IP em `/api/visita` e na criação de pedido.
- Senha de conta de cliente nunca entra no site: o formulário não tem campo de senha, e a combinação do serviço acontece fora dele.

## Testes

- Unitários (Vitest): transição de status do pagamento, conferência de valor, roteamento por `external_reference`, leitura de UTM e de domínio de origem, montagem do aviso de venda, validação do formulário por produto, preço do boost por faixa, quantidade, vagas do mês e medalha por MMR.
- `pnpm loja:e2e`: o roteiro dos critérios 6, 7, 8 e 12 do DoD.
- `scripts/loja/verificar-producao.sh`: requisição HTTP ao domínio real, critérios 9 e 10.

## Fora do escopo desta frente

- Overlay por assinatura com dicas durante a partida: backlog (`.planning/BACKLOG.md`).
- Edição de preço pelo painel: hoje o preço muda por migration; o painel de edição fica como proposta.
- E-mail ao comprador com remetente do domínio novo: depende de verificar `formuladota.com.br` no Resend.
