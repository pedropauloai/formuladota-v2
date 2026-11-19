# Loja v3: vender na live

Plano de 19/11/2026. Manda sobre `spec.md`, `catalogo.md` e `agenda.md` quando divergir.

## Ponto de partida (números de 19/11/2026)

- Loja no ar desde 07/11: 119 visitas e nenhuma venda. 100 diretas, 15 do Instagram (`/ig`), 2 do YouTube e 2 do Discord. O link curto `/live`, feito para a live, não trouxe nenhuma visita.
- Lives diárias desde 27/10, a partir das 13h. Em outubro: média de 23 pessoas assistindo ao mesmo tempo, pico de 45, de 978 a 2,3 mil views por live. Canal com cerca de 14,3 mil inscritos.
- Na página, a vaga na party só aparece na segunda tela do computador e na terceira do celular. A primeira dobra não tem botão de compra, preço nem nada que se mexa.
- O maior botão do site, o verde "JOGAR DOTA", leva para a busca de partida, que está pausada (flag `fila_competitiva` desligada: o bot da Steam está fora do ar desde 14/07, quando acabou o teste grátis do Railway).
- Leitura: a vontade de jogar com o Pedro nasce na live, e a compra mora numa página que ninguém da live abre.

## Decisões

- O Pedro (19/11): foco na loja; o carro-chefe é a vaga na party (jogar com ele); a página precisa chamar atenção e ser mais fácil; os componentes antigos precisam de uma versão 2.0; mais destaque para a loja na barra superior; recompensas para quem assiste.
- Proposta do agente, aceita pelo Pedro com "pode fazer" (19/11): a vaga se compra **na hora, durante a live**, e a pessoa entra na fila daquela live. A reserva para uma live marcada, que já existe, continua como está.
- Mudado pelo Pedro no mesmo dia (19/11): "não precisa de ter live marcada... as vendas podem acontecer sempre". A vaga vende com ou sem live; fora da live, a compra entra na fila aberta e a pessoa joga na próxima live, na ordem do pagamento (decisão 16 de [fila-da-party.md](fila-da-party.md), migration 177).
- O Pedro (19/11): **design e fila primeiro**, em paralelo; a nota de patch fica por último.
- Preço da vaga: R$ 25 por partida, como no catálogo (decisão do Pedro em 07/11). Mudança de preço é dele.
- A barra superior (PR 155) é a referência de acerto ("era o que eu sempre quis"): não refazer; o resto sobe para o nível dela.

## Frentes, na ordem

### 1. Fila da party ao vivo (agora)

A página que acompanha a live e vende a vaga em dois toques.

- Página nova (rota sugerida `/party`, com slug traduzido nos três idiomas): a live na tela quando estiver no ar (ou a próxima live marcada), quem está na party agora, a fila com os próximos e as vagas abertas.
- Compra pelo Pix da loja (o mesmo fluxo de pedido, webhook e confirmação, já testado no `pnpm loja:e2e`), pensada primeiro para o celular. Exige login com Discord e Steam vinculada, porque o Pedro convida pela Steam.
- Depois de pagar, a pessoa vê a própria posição andar em tempo real e é avisada quando chega a vez (aviso no site, com som do jogo).
- Painel do Pedro para operar a fila durante a live: chamar o próximo, marcar quem jogou, pular quem não apareceu.
- Endpoint público e leve da fila (sem dado pessoal além do nome público) para os overlays da live lerem.
- Enquanto `fila_competitiva` estiver desligada, o botão verde vira "JOGAR COM O PEDRO" e leva à fila da party. A aba Loja ganha o sinal de ao vivo quando a live estiver no ar.
- Base técnica: pedido da loja e sessões de live (`store_orders`, `store_live_sessions`). O "Ranked com PRO" antigo (fichas de R$ 10, flag `ranked_com_pro` desligada, nenhuma compra) sai de cena; aposentar o código fica para depois do teste.
- Teste de 14 dias a partir do primeiro dia no ar, com live todo dia. Critério proposto pelo agente, a confirmar com o Pedro: **passa com 15 vagas vendidas ou mais; falha com menos de 5**. Entre 5 e 14, ajustar oferta e chamada antes de decidir.

### 2. Design 2.0 (agora, em paralelo)

No método que deu certo na barra superior, nesta ordem:

1. Referências reais (lojas e páginas de venda de jogos, plataformas competitivas, páginas de streamer) para o Pedro reagir com gosto e não gosto.
2. Direção travada com amostras e por escrito. O Pedro escolhe vendo: 2 ou 3 versões genuinamente diferentes atrás de um seletor.
3. Sistema de componentes 2.0 em código (tokens, componentes, movimento) com página de catálogo, seguindo a hierarquia do CLAUDE.md (estrutura do cliente do Dota, pele da marca).
4. Vitrine: a página da fila da party, polida com rodadas de crítica. Depois a loja e a home herdam o padrão.

Regra de página de venda: produto funcionando na primeira dobra (a própria live e a fila andando), cor com função e movimento que explica algo; nunca página só de texto.

### 3. Overlays e roteiro da live (depois que a fila tiver o endpoint)

No repositório `formuladota-lives` (pasta `overlays/`, fontes de navegador do OBS):

- Fila da party no canto: quem joga agora, quem vem a seguir, vagas abertas e QR code para a fila (com a origem `live` na URL, para a visita contar no painel).
- Alerta de compra: "Fulano garantiu a vaga na próxima partida", com som do jogo.
- Cena de intervalo, entre as partidas: vitrine animada, fila e QR code. Animação em HTML, não GIF; o texto fica parado e só os elementos se mexem.
- Mensagem fixada no chat e comando `!loja`.
- Roteiro de 30 segundos por intervalo, um serviço por vez: gancho na partida que acabou, oferta com preço numa frase, ação com o QR code e a vaga que existe de verdade, agradecimento pelo nome a quem comprar. Vaga na party em todo intervalo com vaga aberta; mentoria, acompanhamento e boost uma vez por live cada.

### 4. Recompensas (depois do teste da fila)

- Primeiro as garantidas: moeda de volta em cada compra e por indicar amigo, que vira desconto na próxima vaga; desconto ou prioridade na fila para membro do YouTube.
- Sem sorteio para vender: a lei de promoção comercial exige autorização do governo.
- Pontos por participação ficam para depois: o YouTube informa quem escreveu no chat, não quem assistiu.

### 5. Notas de patch automáticas (por último)

- Fonte oficial: `https://www.dota2.com/datafeed/patchnoteslist` e `https://www.dota2.com/datafeed/patchnotes?version=<versão>&language=<idioma>` (`brazilian`, `english` e o espanhol que o cliente usa). O 7.42 saiu em 18/11/2026 e já está no feed em português.
- Uma página por patch com os retratos dos heróis (catálogos em `src/data/`), guardada no Supabase pelo cron do site, como `dota_meta_cache`; novidade e post no Discord automáticos quando sai patch novo.
- Atualizar os catálogos (`pnpm gen:heroes`, `gen:items`, `gen:abilities`) e o minimapa para o 7.42.

## Como as sessões paralelas convivem

- **Arquivos.** A fila é dona das rotas e da lógica dela, das migrations e da barra inferior e do sinal de ao vivo na aba Loja. O design é dono dos tokens, dos componentes 2.0 e da página de catálogo. O design só aplica o visual novo na página da fila depois que a fila estiver mesclada na `main`. Nenhuma das duas refaz a barra superior.
- **Migrations.** Fila: 174 a 179. Senha da sala (tarefa à parte): 173. Notas de patch: 180 em diante. Nunca `supabase db push`: SQL pela Management API e registro em `supabase_migrations.schema_migrations` com versão por data.
- **Textos.** `messages/{pt,en,es}.json` é mexido pelas duas: rebase na `main` antes de mesclar, mantendo as chaves das duas.
- **Deploy.** A cópia do WSL `/root/formuladota-v2-loja` é única: publicar só a `main` atual e com trava (`flock /root/deploy-loja.lock`), porque a outra sessão publica da mesma cópia.
- **Recados.** Cada sessão deixa na pasta de notas compartilhada o que mesclou e o que mudou de combinado.

## Como cada frente prova que terminou

- Fila: `pnpm loja:e2e` cobrindo a compra da vaga até a posição na fila, teste da fila em tempo real, `pnpm cf:verificar` sem falha, e uma compra real de teste feita pelo Pedro.
- Design: página de catálogo no ar com todos os componentes 2.0; a vitrine aprovada pelo Pedro vendo; passada visual em 1920x1080, 390x844 e 3440x1440.
- Overlays: as três peças abrindo no OBS do Pedro com a fila real.
- Recompensas e notas de patch: critério escrito quando a frente começar.

## Fora de agora

- Bots no Railway: desligados; religar no plano Hobby (US$ 5 por mês) quando houver gente pedindo partida.
- Senha da sala legível pela API: tarefa à parte, antes de religar as salas.
- Gemini 4 Hydrogen: o método pesa mais que o modelo; teste lado a lado só se o Pedro quiser.
