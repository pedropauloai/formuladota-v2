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
| F11 | O Pedro põe alguém na fila sem pagamento (cortesia) e soma ou tira partidas de quem está na fila, pelo painel (pedido dele, 19/11/2026) | `scripts/seguranca/fila-da-party.sql` (AA a AE e as travas contra usuário comum, vermelho antes da migration 178) e `pnpm loja:e2e` (parte da cortesia, `e2e-fila-cortesia.mjs`) | sim, 19/11/2026: banco 41 de 41 em produção, e2e da cortesia 7 de 7 no localhost |

## Battlepass FORMULADOTA (frente aberta em 19/11/2026)

Escopo: a mensalidade de R$ 120, com party com o PPA sempre que quiser pelo revezamento, salas do site quando voltarem, selo e garantia de 7 dias. Spec: [battlepass/spec.md](battlepass/spec.md). Denominador fechado: **9 critérios**.

| # | Critério | Como se prova | Estado |
|---|---|---|---|
| B1 | O Pedro aprovou a oferta (party, salas, planos, nome) | decisão escrita em `docs/battlepass/spec.md`, com as frases dele | sim, 19/11/2026 |
| B2 | Tipos, lint, testes e build fecham | `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` saem com 0 (job `verificar` do CI) | sim no localhost, 19/11/2026 (258 testes) |
| B3 | As regras do banco seguram o Battlepass: ninguém grava assinatura ou pagamento pelo navegador, cada um lê só os seus, as funções de escrita ficam fechadas a visitante e logado, e o lobby elite aceita o Battlepass | `scripts/seguranca/battlepass.sql` com todos os itens "=ok", e `funcoes-abertas.sql` vazio | sim, 19/11/2026 (28 de 28, banco de produção, nada gravado; a mutação que devolve a brecha deixa vermelho) |
| B4 | A assinatura no cartão abre no sandbox: cria a assinatura de R$ 120 no Mercado Pago, o navegador chega ao checkout, a volta espera a primeira cobrança sem liberar o acesso, e a assinatura abandonada é cancelada no Mercado Pago. A cobrança aprovada entra no livro uma vez só (regra pura testada com o formato da API) | `pnpm battlepass:e2e` e `pnpm test` (`charge.test.ts`) saem com 0 | sim no localhost, 19/11/2026 (`pnpm battlepass:e2e` 33 de 33) |
| B5 | O Pix de 30 dias passa ponta a ponta no sandbox: gera o Pix na página, o pagamento aprovado ativa por 30 dias, um segundo pagamento soma mais 30, e o pedido de reembolso na garantia encerra o acesso e avisa o Pedro no Discord | `pnpm battlepass:e2e` sai com 0 | sim no localhost, 19/11/2026 (33 de 33) |
| B6 | O assinante entra na fila da party sem pagar, e a fila segue o revezamento pela última vez na party (quem nunca jogou na frente, "não apareceu" vai para o fim) | `pnpm battlepass:e2e` e `pnpm test` (ordem da fila) | sim no localhost, 19/11/2026 (33 de 33; `loja:e2e` loja 21, fila 31, saídas 33 com o revezamento) |
| B7 | O registro da partida pelo ID grava data e hora de quem jogou, com a conferência da OpenDota | `pnpm battlepass:e2e` registra uma partida pública real do PPA | sim no localhost, 19/11/2026 (partida real do PPA pela "Última do PPA") |
| B8 | O site no ar mostra o Battlepass na `/planos` e o link `/battlepass` leva até ela | `pnpm cf:verificar` termina com `falhas: 0` | sim, 19/11/2026 (versão `de2f2372` da Cloudflare, `falhas: 0`) |
| B9 | Em produção, a compra abre o checkout do Mercado Pago com R$ 120 e o nome Battlepass FORMULADOTA (sem pagar) | `node scripts/battlepass/verificar-producao.mjs` cria a assinatura pendente com a credencial real, confere valor e nome, e cancela | sim, 19/11/2026 (10 de 10 no domínio real; assinatura de verificação cancelada e jogador de teste apagado) |

### O que o percentual não significa

- 9 de 9 não quer dizer que houve assinante: prova que a compra funciona e que os benefícios valem, não que vende.
- Não cobre a primeira cobrança de cartão de verdade: o sandbox só autoriza a assinatura com uma conta de comprador de teste do Mercado Pago, e criar essa conta pede o sim do Pedro. A primeira assinatura real (ou a compra de teste dele, devolvida pela garantia) é a prova, e o painel `/admin/battlepass` mostra a cobrança entrando.
- As salas do site seguem pausadas até a enquete chegar a 50 interessados: o critério B3 prova a regra do lobby elite, não a sala funcionando.

## Comunicação, fase 1: sala de voz com tela (frente aberta em 23/11/2026)

Escopo: salas de voz com compartilhamento de tela em `/sala/[id]`, pelo Cloudflare Realtime: a sala pública da live (palco, chat e plateia), a mentoria e a party, o servidor com canais de texto e de voz (R16) e o destaque de quem fala com as configurações de voz (R17), atrás da flag `sala_voz`. Spec: [comunicacao/spec.md](comunicacao/spec.md). Denominador fechado: **14 critérios**.

| # | Critério | Como se prova | Estado |
|---|---|---|---|
| C1 | A spec está na main, com as escolhas de produto do PPA anotadas | PR mesclado; seção 15 da spec com a decisão e a data de cada escolha | em parte: spec mesclada (PRs 194 e 199); as decisões 4, 5, 7, 9, 10 e 11 esperam o PPA |
| C2 | O app do Realtime e a chave do TURN existem, e os segredos estão no Worker e nos `.env` sem terem aparecido em tela (o PPA copia, o script grava) | `wrangler secret list` mostra os nomes; `pnpm sala:realtime` cria uma sessão, gera e revoga uma credencial de TURN e sai com 0, sem imprimir segredo | sim (24/11/2026: os quatro `REALTIME_*` no Worker e nos `.env`, gravados pelo script com a cópia do PPA; `pnpm sala:realtime` 6 de 6) |
| C3 | O PPA aprovou a migration da sala | a frase dele, com data, no PR da migration | sim (24/11/2026, "Sim, aplicar", no PR 195) |
| C4 | A migration está aplicada em produção e registrada | consulta a `supabase_migrations.schema_migrations` mostra a versão por data | sim (versão `20261124145150`, 24/11/2026) |
| C5 | As regras do banco seguram a sala: visitante e quem está fora não leem, ninguém escreve pela API, a marcação de idade vale só para a própria pessoa, as funções do batimento não abrem para o navegador | `scripts/seguranca/sala-voz.sql` com todos os itens "=ok" (vermelho com a trava revertida) e `funcoes-abertas.sql` vazio | sim (24/11/2026: 50 de 50 no banco de produção, 42 de 50 com as travas revertidas) |
| C6 | Tipos, lint, testes e build fecham, inclusive permissão, palco, camada da tela, custo, atraso e leitura do SDP, e as travas resistem à mutação | verificação `verificar` do GitHub verde no PR da prova de conceito e `pnpm sala:mutacao` com todas as mutações vermelhas | sim (24/11/2026: `verificar` verde no PR 202, commit `33dfd39`; mutação 42 de 42) |
| C7 | Mentoria: duas pessoas se ouvem e a tela chega em 1080p; mutar, expulsar, bloquear e denunciar funcionam. Sala pública: o ouvinte não fala, o chamado fala, a plateia recebe a camada alta e não compartilha a tela, o chat chega e o apagado some, o banido não volta, os lugares contam. Portões: sem a marcação de 18 anos, de fora, convite e tela acima do teto. Navegação (R15): ir para `/party` e `/meta` e voltar sem cair da sala, com o áudio chegando, e recarregar volta sozinho | `pnpm sala:e2e` sai com 0 | sim (24/11/2026: 55 de 55 nas rodadas seguidas depois da reconexão automática, saindo com 0) |
| C8 | Com a flag desligada a sala some para todos, inclusive o admin | `pnpm sala:e2e` (parte da flag) | sim (24/11/2026: tira quem está dentro e dá 404 na sala e no painel até para o admin; o teste local liga a linha `sala_voz_e2e`, e `flag-chave.test.ts` prova que produção lê só a `sala_voz`) |
| C9 | A prova de conceito está no ar, atrás da flag | deploy pela cópia do WSL e `pnpm cf:verificar` com `falhas: 0` | sim (24/11/2026: PRs 202, 213 e 214 publicados pela cópia do WSL com `falhas: 0`; flag ligada e `pnpm sala:producao` 6 de 6 no domínio real) |
| C10 | Mentoria real de 1 hora: tela em 1080p em pelo menos 90% do tempo de tela, perda de pacote abaixo de 2%, voz picotada abaixo de 2% sem reclamação, atraso estimado p95 abaixo de 500 ms, consumo dentro do orçamento | consulta da seção 13 da spec, com o resultado e o número do painel da Cloudflare na nota compartilhada | não |
| C11 | Primeira live com a sala pública: atraso estimado p95 abaixo de 500 ms para a plateia, perda abaixo de 2% e consumo dentro do orçamento | consulta da seção 13 da spec na sala pública, na nota compartilhada | não |
| C12 | Worktree limpo e branches da frente apagados | `git status` vazio e `git ls-remote --heads origin` sem os branches mesclados | sim (24/11/2026: os branches dos PRs 202, 213, 214 e 215 apagados no GitHub e na máquina; `git ls-remote` sem branch da sala) |
| C13 | Servidor com canais (R16): a árvore lista os canais de texto e de voz com quem está em cada um e o limite ("2/2"); um clique no canal de voz entra; canal cheio não deixa entrar (só o dono); no canal de texto a mensagem chega ao outro, fica guardada e o dono apaga, sem mídia nenhuma; na voz livre quem entra fala e um ouve o outro; ensurdecer muta o microfone e religar devolve; a coluna do chat se esconde e volta; trocar de canal não derruba a voz e chega a quem olha a árvore em menos de 1 s, sem a pessoa em dois canais (`e2e-tempo-real.mjs`); o admin cria, renomeia, sobe, muda o limite e o modo, e apaga | `pnpm sala:e2e` (partes dos canais e do palco) sai com 0 e as migrations 198 a 201 registradas | sim (24/11/2026: e2e 86 de 86 saindo com 0, mutação 54 de 54; PR 215 no ar com `falhas: 0`; `pnpm sala:producao` 8 de 8 no domínio real, entrando pelo canal de texto e com um clique no canal de voz; tempo real no PR 220: a entrada chega a quem olha a árvore em 35 ms e a troca 222 ms depois de a pessoa entrar, sem ela em dois canais, e em produção os avisos de entrada e de saída chegam pelo Realtime) |

| C14 | Quem fala e configurações de voz (R17): o anel verde acende para quem escuta na árvore, no palco e no painel do canto, fica aceso sem piscar enquanto a pessoa fala sem parar (no mínimo 95% de 10 s) e não acende com estalo de tecla, apaga quando a pessoa muta e volta quando desmuta; a engrenagem da barra e a do painel abrem as configurações; trocar o microfone no meio da ligação mantém a mesma faixa no SFU, o áudio segue e o anel acende com o microfone novo; o teste mostra o nível; a saída escolhida vale para as vozes; a escolha fica guardada e vale depois de recarregar; na página recarregada fora da sala, as configurações funcionam (o microfone vale no site inteiro desde o PR 218) | `pnpm sala:e2e` (parte da fala, `e2e-fala.mjs`) sai com 0, o Vitest de `nivel-voz` passa e `pnpm sala:mutacao` sai com as travas novas vermelhas | sim (24/11/2026: e2e da fala 15 de 15 e o completo 114 de 114, mutação 74 de 74, PR 222) |

### O que o percentual não significa

- 14 de 14 não prova que a sala pública aguenta mais gente do que a primeira live teve: a escala passa pelos testes e por uma consulta por batimento, e o resto se mede live a live.
- O anel e a troca de aparelhos são provados com os aparelhos falsos do Chrome: microfone USB e fone Bluetooth de verdade só se conferem na mão (a troca usa a mesma chamada do navegador, e o aparelho que some volta ao padrão).
- O atraso medido é uma estimativa pela `getStats` (rede mais buffer), sem o tempo de captura e de tela; a meta tem folga por isso.
- Não prova conformidade jurídica com o ECA Digital: os controles estão ligados aos artigos na spec, e a regulamentação da ANPD pode pedir mais (verificação de idade mais forte, por exemplo).
- Não prova que ninguém mente a idade: a maioridade é marcada pela pessoa (decisão do PPA de 23/11/2026), com conta identificada, denúncia e banimento.
- Não cobre compartilhar tela pelo Firefox, pelo Safari ou pelo celular, que não capturam o áudio do jogo.
