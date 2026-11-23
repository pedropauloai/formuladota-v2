# Limpeza das ofertas antigas: planos, pagamentos, XP, níveis e cosméticos

Plano da limpeza das ideias de oferta que sobraram de maio a julho de 2026, com o inventário que o justifica. As decisões de produto da seção 7 são do PPA e ficam registradas aqui quando ele escolher. Os números de linha valem para o commit citado abaixo e podem andar com o código.

Inventário de 23/11/2026, sobre a `main` no commit `519de62` (PR 185). O banco de produção estava pausado, por isso o que depende dele está marcado **NÃO CONFIRMADO** e entra na conferência da seção 6.

## Andamento

- 23/11/2026, branch `claude/pontas-soltas`: parte da Etapa 1 (a `/planos` sem o lobby elite, sem o selo "no seu perfil" e com a doutrina só com o quiz ligado; CLAUDE.md e índice dos documentos com a oferta atual) e da Etapa 2 (barra de XP do `/progresso` com a conta do anel e teste, Shards fora da tela, selo de permissões só com o quiz ligado, `/compendium` levando para a `/planos`, ranking vazio e coleção sem promessa, análises de coaching só para quem tem alguma, página de PRO sem venda com o Ranked com PRO desligado).

Os caminhos citados são relativos à raiz do repositório. "pt.json" é `messages/pt.json`. Migrations são citadas pelo número (ex.: `190:300` = `supabase/migrations/190_battlepass.sql`, linha 300).

## Como ler

Termos usados:

- **Flag**: interruptor no painel do admin que liga ou desliga uma parte do site sem publicar código novo.
- **Migration**: arquivo que muda a estrutura ou os dados do banco.
- **Regra do banco**: a regra que o próprio banco aplica para decidir quem pode ler ou gravar cada coisa (no Supabase se chama RLS). Vale mesmo que a tela esteja errada.
- **Webhook**: o aviso automático que o Mercado Pago (ou o Stripe) manda ao site quando um pagamento muda.
- **Vivo**: o jogador vê e usa. **Escondido**: existe, mas uma flag desligada tira da tela. **Morto**: existe no código ou no banco, mas nada leva até ele.

Estado das flags considerado aqui (pelo que os documentos registram; o valor real está no banco, NÃO CONFIRMADO):

| Flag | Estado | Fonte |
|---|---|---|
| `loja` | ligada desde 07/11 | `docs/loja/catalogo.md:16` |
| `fila_competitiva` (busca e salas) | desligada, bot da Steam fora do ar | `docs/loja/plano-v3.md:10` |
| `ranked_com_pro` | desligada, "nenhuma compra" | `docs/loja/plano-v3.md:34` |
| `doctrine_quiz` | desligada ("com o quiz desligado (e /doutrina fora do ar)") | `169:1-3` |
| `enquete_liga` | nasceu ligada | `180:37-39` |

## Resumo

1. A oferta de hoje (loja, fila da party e Battlepass de R$ 120) está inteira e coerente no próprio fluxo de compra. O problema está em volta dela: o site ainda mostra ou guarda pedaços de cinco ofertas antigas (os pacotes de mentoria do PRD, a adesão HUB de R$ 47, o Ranked com PRO com fichas, os planos Plus e Premium e o Compendium).
2. A própria página do Battlepass promete três coisas que não existem hoje: o selo no perfil, o lobby elite e "a doutrina e o quiz" como benefício grátis (seção 2.1).
3. O `/compendium` continua no menu de quem está logado, com uma trilha paga chamada "Passe", coroa e missões de XP. Nada disso funciona, e o nome briga com o Battlepass de verdade.
4. O XP está praticamente congelado: as fontes vivas dependem do quiz (desligado) e de partidas nas salas (pausadas). Nenhuma das cinco ações que importam agora (comprar vaga, jogar na party, assinar, assistir à live, indicar) dá XP.
5. Convivem dez indicadores de progresso ou status, e cinco deles aparecem juntos no mini-perfil e no cartão que abre ao passar o mouse. Dois mostram o mesmo número com nomes diferentes, e a barra de XP do `/progresso` mostra uma porcentagem diferente da do avatar para a mesma pessoa.
6. Existem 36 cosméticos. Só o fundo do perfil é visto por outros jogadores; anel e moldura aparecem só para o dono, e o selo não aparece em lugar nenhum. Dois fundos "exclusivos de plano" (Aegis e Godlike) não têm como ser liberados.
7. O painel principal do admin calcula a receita das assinaturas com o preço antigo (cada Battlepass vale R$ 27,90 lá) e não soma a loja.
8. "Jogar uma partida com o PPA" tem quatro preços no banco: R$ 10 (pacote antigo), R$ 25 (vaga), R$ 49 (duo) e R$ 120 por mês. O R$ 10 ainda pode aparecer numa página pública de PRO, com o botão de compra quebrado.
9. Recomendação de XP: um nível só, por temporada, que é a própria trilha do Battlepass (grátis para todos, trilha extra para o assinante), alimentado por partidas na party, compras, mensalidade paga, presença na live e indicação.
10. A limpeza começa por texto e por coisas que só se escondem (risco zero), e deixa por último o que mexe em dado de produção e em assinante.

---

## 1. Inventário

### A. O que vende ou cobra

**A1. Battlepass FORMULADOTA, R$ 120 por mês (oferta atual)**
- Onde o jogador vê: `/planos` e o link curto `/battlepass` (`next.config.ts:105`); ícone de coroa "Planos" na barra superior, só para quem está logado e só em tela com 640 px ou mais (`src/components/client-shell/top-bar.tsx:218-223`); o menu do celular não tem esse ícone (`src/components/client-shell/mobile-nav.tsx`, links nas linhas 68-110); convite embaixo da compra da vaga em `/party` (`src/components/loja/fila/buy-box.tsx:186-195`); botão "Entrar na fila" sem pagar para quem assina (pt.json:4557-4564).
- Onde mora: preço, prazos e garantia em `src/lib/battlepass/config.ts:4-17` (12000 centavos, 30 dias, 7 dias de garantia, à venda desde 19/11); página `src/app/planos/page.tsx`, ações `src/app/planos/actions.ts`; banco: tier `battlepass` e provedor `pix` em `subscriptions` (`190:8-14`), livro `subscription_payments` (`190:26-66`), `party_participacoes` (`190:70-100`), funções de ativação, cobrança e garantia (`190:104-276`); painel `/admin/battlepass`.
- Estado: vivo. 9 de 9 critérios da definição de pronto (`docs/definicao-de-pronto.md:64-78`), sem a prova da primeira cobrança real no cartão (`docs/definicao-de-pronto.md:83`).
- Depende dele: a entrada sem pagar na fila da party (`docs/loja/fila-da-party.md:49`, migration 192), o selo na fila e no JSON dos overlays, a regra de criar sala (D1), o lobby elite (D4).

**A2. Loja e fila da party (vaga a R$ 25 e mais seis serviços)**
- Onde o jogador vê: aba "Loja" na barra superior, visível também para visitante (`src/components/client-shell/top-bar-tabs.ts:21, 39`), `/loja`, `/loja/[slug]`, `/party`, seção "Party do PPA" no menu Jogar (`src/components/client-shell/play-menu.tsx:899-915`).
- Onde mora: `store_products`, `store_product_variants`, `store_orders` (`158`), preços no `160:181-186`; fila em `store_bookings` e `store_live_sessions` (migrations 174 a 179 e 192); `src/lib/loja/`.
- Estado: vivo. Em 19/11 eram 119 visitas e nenhuma venda (`docs/loja/plano-v3.md:7`).
- Depende dela: o Battlepass (a entrada do assinante vive na mesma fila), a cortesia do PPA (`docs/loja/fila-da-party.md:51`).

**A3. Plus e Premium (no último texto do site, "Godlike" a R$ 27,90 e "Beyond Godlike" a R$ 97,90; antes, "Aegis" e "Godlike")**
- Um detalhe que corrige a lista de ideias antigas: no último texto que o site teve, o Plus de R$ 27,90 se chamava "FORMULADOTA GODLIKE" e o Premium de R$ 97,90 "FORMULADOTA BEYOND GODLIKE" (pt.json:1169-1170), e a spec do Battlepass usa esses nomes (`docs/battlepass/spec.md:16`). "Aegis R$ 27,90 / Godlike R$ 97,90" é o nome mais antigo, de 01/07 (`docs/foundations/COMPENDIUM.md:15`).
- Onde o jogador vê: em lugar nenhum da navegação (a `/planos` virou o Battlepass, `docs/battlepass/spec.md:16`). Sobras: o e-mail "Adesão à Comunidade FormulaDota ativada", que diz "Sua adesão ao FORMULADOTA HUB foi autorizada via Pix Automático" (`src/lib/resend.ts:128-137`), ainda sai pelo ramo antigo do webhook se um preapproval (assinatura recorrente do Mercado Pago) antigo mudar de estado (`src/app/api/webhooks/mercadopago/route.ts:173-232`, `239` em diante); nomes e benefícios dos dois planos no bloco `billing` (pt.json:1169-1182), textos órfãos, sem uso no código.
- Onde mora: `src/lib/subscriptions/tiers.ts` (preços nas linhas 30-43, benefícios 51-65; nenhum arquivo do `src` importa esses valores); a regra do banco ainda aceita `plus` e `premium` (`190:8-10`); `has_subscription_tier` mantém a hierarquia (`190:330-343`); o lobby elite aceita `premium` (`190:295`); as visões do painel do admin têm os preços antigos escritos à mão (`123:96`, `123:127`); o Stripe (A4).
- Estado: morto na tela, vivo no banco e no webhook. "Nenhum assinante pago em 19/11/2026" (`docs/battlepass/spec.md:65`). Linhas antigas no banco: NÃO CONFIRMADO.
- Depende dele: o painel principal do admin (2.3), a regra de criar sala (D1), o lobby elite (D4).

**A4. Stripe (LATAM e Europa)**
- Onde o jogador vê: nada.
- O que ficou na `main`: o commit `929ccb8` (04/07) está na main e trouxe o webhook `src/app/api/webhooks/stripe/route.ts` (262 linhas, cinco eventos, cabeçalho nas linhas 1-17), a biblioteca `src/lib/stripe/client.ts`, o script `scripts/stripe-setup.ts`, as variáveis em `src/lib/env.ts:44-50` e `.env.example:55-69`, e os pacotes `stripe` e `@stripe/stripe-js` (`package.json:30, 51`). A tela que criava a cobrança (`src/app/actions/subscription.ts`) foi apagada no PR 180 (commit `6056d30`). Os commits do branch `feat/pagamento-stripe-primario` (`df8818a`, checkout embutido `5f23118`) não estão na main.
- Estado: morto. Nada cria cobrança; o endpoint de webhook existe e responde. Se há chave e endpoint configurados no painel do Stripe: NÃO CONFIRMADO.
- Depende dele: as colunas `stripe_*` e o provedor `stripe` (`122:17-28`); o mapa de preço só conhece plus e premium (`src/lib/stripe/client.ts:35-46`).

**A5. Ranked com PRO e fichas (R$ 15, depois R$ 10)**
- Onde o jogador vê, com a flag desligada: na navegação, nada (a aba "Subir MMR" some, `top-bar-tabs.ts:38`; a seção do menu Jogar some, `play-menu.tsx:921-927`; o card "Boost de MMR · Brasil: compre fichas" some, `src/components/client-shell/right-sidebar.tsx:68-77`). Sobram caminhos que caem em `/ranked-com-pro` e voltam para `/dashboard` (`src/app/ranked-com-pro/page.tsx:51-53`): depois de criar, sair ou cancelar sala (`src/app/criar-lobby/actions.ts:175`; `src/app/lobbies/[id]/actions.ts:201, 262, 277`), ao aceitar convite de sala (`src/components/client-shell/lobby-invite-listener.tsx:77`), o atalho `/rankedpt` (`next.config.ts:98`) e a aba "Pro" de quem é PRO (`top-bar.tsx:113`, que leva a `src/app/pro/page.tsx:11`).
- Onde mora: rotas `/ranked-com-pro`, `/pacotes` (`src/app/pacotes/page.tsx:113-114`), `/checkout/[packageId]` (`src/app/checkout/[packageId]/page.tsx:28-29`), `/pro/*`, `/admin/fichas` (`src/app/admin/fichas/page.tsx:21`), `/admin/pros`; banco: `packages`, `purchases`, `ficha_ledger` (`025`), `credit_ficha_purchase` (`086`), `coach_queue_entries` (`023:29-45`), `revenue_splits` e `pro_promotions` (`031`), o gatilho de calibração por ficha (`011:237`). O webhook do Mercado Pago trata como compra de ficha todo Pix aprovado que não for da loja nem do Battlepass (`route.ts:127-163`).
- Estado: escondido por flag. "Aposentar o código fica para depois do teste" da fila (`docs/loja/plano-v3.md:34`).
- Risco guardado: religar a flag no painel (`src/app/admin/dashboard/feature-flags-panel.tsx:25-27`) devolve à tela os pacotes com preço errado (A6) e um "Boost de MMR" que não é o boost vendido na loja (pt.json:256-258 contra `docs/loja/catalogo.md:13`).

**A6. Pacotes da loja original de mentoria (PRD de abril)**
- O que há no banco: "Avulsa" ("uma partida ranked com Pedro"), "Pacote 5", "Pacote 10" e "Mentoria mensal" a R$ 100 (`003:5-34`), mais "Ficha avulsa" (`023:182-186`). A migration 041 pôs R$ 10 em todo pacote do tipo avulso (`041:9`): o Pacote 5 e o Pacote 10 passaram a custar R$ 10 cada, por 5 e 10 partidas. Se continuam ativos: NÃO CONFIRMADO.
- Onde o jogador vê: `/pacotes` (escondido) e `/coaches/[slug]`, que é pública e não tem flag (`src/lib/supabase/middleware.ts:42`). Ela mostra "SUBIR DE MMR com {nome}" com o preço do primeiro pacote avulso do PRO (`src/app/coaches/[slug]/page.tsx:222, 431-447`; pt.json:2114), e o botão aponta para `/checkout?package=...`, endereço que não existe (a rota é `/checkout/[packageId]`). A página só abre para PRO com promoção ativa (`page.tsx:152-162`), e o botão só aparece se o PRO tiver pacote avulso próprio. Os pacotes de R$ 10 estão ligados ao coach do PPA (`006:23-26`), que provavelmente não tem promoção (comentário em `src/app/pro/layout.tsx:29-31`). O mais provável é que hoje a página do PPA dê "não encontrado" e o botão não apareça para ninguém, mas basta uma promoção ativa para ele voltar: NÃO CONFIRMADO.
- Estado: escondido e meio morto, com dado vivo.

**A7. Adesão à Comunidade de R$ 47 (modelo HUB de maio)**
- Textos `billing.subscription*`, "HUB Mensal", "Adira agora R$ 47/mês" e "R$ 47,00/mês" (pt.json:1088-1132, com o preço nas linhas 1098 e 1110), sem uso; e-mails de adesão, renovação e encerramento (`src/lib/resend.ts:113-240`) ainda disparam pelo ramo antigo do webhook.
- Estado: morto na tela, vivo no e-mail.

### B. O que dá XP, nível ou status

**B1. Nível da conta, de 1 a 30, e barra de XP**
- Onde o jogador vê: número e anel de XP no avatar do mini-perfil (`src/components/client-shell/shell.tsx:588`; `mini-profile-panel.tsx:292-301`), página `/progresso` e aba Progresso do perfil (`src/components/profile/tab-progresso.tsx`), nível nas listas e no feed de partidas (`101`).
- Onde mora: `user_levels`, `level_thresholds`, `xp_events` (`021:6-75`); `award_xp` (`043:8-61`, fechada ao usuário em `083:14-15`); `grant_doctrine_question_xp` (`043:72-130`); a curva copiada no site em `src/lib/levels.ts:168-190`.
- Estado: vivo na tela, quase sem combustível (seção 3.1).
- Depende dele: as faixas (B2), os cosméticos (C1), entrar em sala quando o quiz estiver ligado (`169:9-14`) e o lobby elite (`190:301-304`).

**B2. Faixas Novato, Aprendiz, Piloto, Ás, Lendário e Místico (no código, a "medalha HONOR")**
- Onde o jogador vê: medalha ao lado do nome no mini-perfil, no cartão que abre ao passar o mouse, no perfil e no `/progresso` (`tab-progresso.tsx:112-113`; `src/lib/dota/rank-badges.ts:103`).
- Onde mora: `TIER_CONFIG` e `getGatedTierForLevel` (`src/lib/levels.ts:46-163`). Lendário exige medalha Valve Divina e Místico exige Imortal (`levels.ts:150-163`).
- Estado: vivo.

**B3. Conquistas (12)**
- Onde o jogador vê: aba Conquistas do perfil (`src/components/profile/tab-conquistas.tsx`).
- Onde mora: `badges` e `user_badges` (`014:62-75`), gatilhos na tabela do MMR da temporada e no aceite da doutrina (`016:5-60`, `016:62-82`); cada conquista dá 100 XP (`021:190-200`). As de MMR (3000, 5000, 7000) disparam já no vínculo da Steam, porque a semente da temporada vem da medalha Valve (`src/lib/queries/seed-season-mmr.ts:88-106`; `016:41-52`). "Maré Boa" e "Em Brasa" (sequência de vitórias) não têm gatilho.
- Estado: vivo, mas 8 das 12 dependem de partida nas salas (e 2 dessas nem têm gatilho).

**B4. Shards (moeda)**
- Onde o jogador vê: `/progresso`, uma caixa "Shards" com saldo e total, coluna na tabela de níveis e "+N shards" no histórico (`tab-progresso.tsx:110, 186-196, 253, 290, 344-348`).
- Onde mora: `user_levels.current_shards` e `level_thresholds.shards_reward` (`021:11-12, 25-55`); a cada nível novo, `award_xp` soma (`043:43, 53-54`). Nasceu como "moeda spendable em store/recursos" (`021:4`).
- Estado: vivo na tela, sem lugar nenhum para gastar.

**B5. Compendium (o passe da temporada antigo)**
- Onde o jogador vê: ícone "Compendium" na barra superior (`top-bar.tsx:222`) e `/compendium`, só para logado.
- O que mostra: "Nível do passe", que é o nível da conta com outro nome (`src/app/compendium/page.tsx:14, 37`; pt.json:157); trilha "Grátis" e trilha "Passe" com coroa (`src/components/compendium/compendium-view.tsx:97-109`; `src/lib/compendium.ts:18-25`); "Missões da semana" com +60, +40, +90 e +30 XP (`src/lib/compendium.ts:35-40`); e a temporada, com o nome "Temporada 1 Genesis" de reserva quando não há temporada ativa (`compendium/page.tsx:38`).
- Estado: vivo na tela, sem motor ("Fase 2 (motor de XP) ainda não existe", `compendium/page.tsx:14`; `src/lib/compendium.ts:2-3`). A trilha "Passe" não dá nada e nenhuma missão credita XP.

**B6. Doutrina e quiz dos 4 Pilares (nível 6 = doutrinado)**
- Onde o jogador vê: `/doutrina` manda para a home com a flag desligada (`src/app/doutrina/page.tsx:24-25`).
- Onde mora: `profiles.doctrine_quiz_progress` e `doctrine_accepted_at`; 22 XP por pergunta nova, 130 perguntas (`043:71-80`).
- Estado: escondido.

**B7. Permissões de partida (5 acertos = 1 permissão)**
- Onde o jogador vê: um selo com escudo e número no mini-perfil, sempre, com a explicação "5 acertos no quiz da doutrina = 1 permissão. Acumulam, cada partida de qualquer modalidade gasta 1" (`mini-profile-panel.tsx:325, 331-346`; pt.json:277).
- Onde mora: `available_match_permissions` (`044:11-18`), `match_permissions_consumed` (`043:135-136`), o quiz em janela no menu Jogar (`play-menu.tsx:323-345, 738`).
- Estado: o mecanismo está desligado (fila e sala abertas com o quiz desligado, `130:30-40` e `169:4-16`), mas o selo segue na tela, sem olhar a flag (`shell.tsx:173`).

**B8. Rank FORMULADOTA da temporada (MMR da liga)**
- Onde o jogador vê: medalha da temporada no mini-perfil, no cartão do mouse, no `/ranking` e no guia `/mmr`.
- Onde mora: `player_season_mmr`, `seasons`, `rotate_seasons` (cron diário em `091:76`), `src/lib/mmr.ts`.
- Estado: sem partidas desde que o bot caiu (`docs/loja/plano-v3.md:10`). A virada só ativa a próxima temporada se o admin tiver criado a linha dela (`091:58-65`; `src/app/admin/temporadas/actions.ts:34`). Qual temporada está ativa: NÃO CONFIRMADO.

**B9. Honra (pontuação de conduta)**
- Onde o jogador vê: conduta (aprovada, suspensa, banida), elogios e avisos no perfil, e o Mural. A pontuação numérica aparece no admin, no painel do PRO e na página pública do PRO, com as 8 faixas antigas (`src/app/coaches/[slug]/page.tsx:33-36, 203, 216`).
- Onde mora: `honor_ledger`, `get_honor_score`, `get_honor_tier`.
- Estado: vivo e discreto. O nome confunde: o código chama a faixa de nível de "HONOR" (`levels.ts:1-4`), e a spec do ranking chama a conduta de "Honra" (`docs/foundations/RANKING_SYSTEM.md:21`).

### C. O que libera cosmético

**C1. Coleção e catálogo**
- Onde o jogador vê: ícone "Coleção" (`top-bar.tsx:221`), `/colecao` (só logado), o seletor de fundo do perfil.
- Onde mora: `cosmetics`, `user_cosmetics`, `user_equipped` (`080:15-85`), `equip_cosmetic` com a trava de mérito no banco (`081:40-93`), `src/lib/cosmetics.ts`, `src/actions/cosmetics.ts`, `src/lib/queries/cosmetics.ts`. 36 itens (`080:159-188`; `082:12-57`; `151:6-13`).
- Estado: vivo. Detalhe na seção 4.

### D. O que bloqueia acesso

- **D1. Criar sala**: exige assinatura ativa de qualquer tipo (plus, premium ou battlepass), sem exceção para admin (`046:6-19`), e antes disso a flag `fila_competitiva` (`src/app/criar-lobby/actions.ts:44-47`). A mensagem de erro diz "Ative sua mensalidade pra hospedar", sem link para a `/planos` (`criar-lobby/actions.ts:67-71`).
- **D2. Entrar em sala**: livre com o quiz desligado; com ele ligado, nível 6 ou permissão (`169:4-16`).
- **D3. Busca competitiva**: livre com o quiz desligado (`130:30-40`), mais a flag `fila_competitiva`.
- **D4. Lobby elite**: só existem a coluna `lobbies.tier` (`044:6-8`) e a função `can_join_elite` (`190:280-306`). Nenhuma tela cria sala elite (a criação não grava o tier, `criar-lobby/actions.ts:54-64`) e a regra de entrar em sala não olha o tier desde a 046 (`046:21-34`; `169:4-16`). A função não é chamada por nada: a 164 a fechou como "legado sem chamador" (`164:38-62`), e o teste do Battlepass prova a função sozinha (`scripts/seguranca/battlepass.sql:150-156`).
- **D5. Ranked com PRO, pacotes, checkout, fichas e PROs no admin**: flag `ranked_com_pro` (A5; menu do admin em `src/app/admin/layout.tsx:58, 60`).
- **D6. `/doutrina`**: flag `doctrine_quiz` (B6).

---

## 2. Conflitos com a oferta de agora

### 2.1 Promete o que não existe

Do mais grave para o menos grave:

1. **`/planos`, selo do Battlepass**: "Aparece ao lado do seu nick na fila da party e no seu perfil" (pt.json:112; `src/components/battlepass/battlepass-includes.tsx:124`). No perfil não existe: a própria spec adia o selo no perfil e a moldura na coleção (`docs/battlepass/spec.md:27, 113`), e nenhum arquivo de `src/components/profile` lê o Battlepass.
2. **`/planos`, lobby elite**: "Criar sala e entrar no lobby elite, que continua pedindo a medalha Imortal no Dota e o nível 30" (pt.json:108; `battlepass-includes.tsx:112`). A página avisa que as salas estão pausadas, mas o lobby elite não existe em tela nenhuma (D4). Pior: a regra confere `profiles.mmr_atual >= 6000` (`190:300-304`), número que o próprio código diz que não mede a medalha Valve (`src/lib/levels.ts:128-134`) e que um Imortal recebe como 5620 na semente (`src/lib/mmr.ts:438-441`; `seed-season-mmr.ts:104-106`). Mesmo com as salas de volta, um Imortal recém-chegado seria barrado.
3. **`/planos`, "O que continua grátis: a doutrina e o quiz dos 4 Pilares"** (pt.json:133; `battlepass-more.tsx:16`): `/doutrina` manda para a home enquanto a flag estiver desligada (`doutrina/page.tsx:24-25`).
4. **`/compendium`**: trilha "Passe" com coroa, missões que "alimentam o XP do passe" e "o motor de XP chega em breve" (pt.json:157-162). Nada disso funciona. E os itens da trilha "Passe" (Moldura Fórmula, Brasa da Fórmula, Moldura Dourada, Névoa Mística) são, no banco, de mérito e grátis, em níveis diferentes dos que a trilha mostra (compare `src/lib/compendium.ts:19-24` com `080:172-181`). O "Efeito de nome" do nível 18 não existe no catálogo (`compendium.ts:22`; nenhum item do tipo `name_effect`).
5. **`/colecao`**: "Mais chegam com o Compendium a cada temporada" (pt.json:6). O último item novo é de 06/07 (`151`).
6. **Mini-perfil**: o selo de permissões explica um mecanismo desligado (B7).
7. **`/progresso`**: Shards sem uso (B4) e barra de XP errada (seção 3.3).
8. **Ranking vazio**: "Seja um dos primeiros, ative sua mensalidade e crie um lobby" (pt.json:579; `src/app/ranking/page.tsx:295-300, 573-578`), com as salas pausadas. Se o ranking está vazio hoje: NÃO CONFIRMADO.
9. **Perfil, aba Conduta**: "Análises de coaching... aparecem aqui após uma sessão coachada com um PRO" (pt.json:681; `src/components/profile/tab-conduta.tsx:102-110`). É o mundo do Ranked com PRO, desligado.
10. **Novidades públicas**: a nota de 01/07 anuncia o "passe da temporada (/compendium)" e a de 04/07 diz que cada região tem "seus preços e sua assinatura" (`144:102-103`, `144:53-56`). As notas criadas depois pela skill `/novidade` só estão no banco: NÃO CONFIRMADO.
11. **Cosmético que não aparece**: equipar um "Selo" não muda nada visível; o slot é lido (`src/lib/queries/cosmetics.ts:100`) e não é desenhado em lugar nenhum. Anel e moldura só aparecem para o próprio dono, no mini-perfil (`shell.tsx:175-177`; `mini-profile-panel.tsx:206-207`).

Os itens 1 a 3 estão numa página de venda. Benefício anunciado que não existe é o que o art. 37 do Código de Defesa do Consumidor trata como publicidade enganosa; a correção é de texto e custa minutos (Etapa 1).

### 2.2 Vende ou sustenta um plano que deixou de ser a oferta

- `/coaches/[slug]`, pública e sem flag: "SUBIR DE MMR com {nome}" com o preço de R$ 10 do pacote antigo e botão para endereço inexistente (A6).
- Dois fundos de perfil "Exclusivo de plano", "Relíquia Aegis" e "Panteão Godlike" (`082:53-56`): ninguém consegue liberar, porque nenhum código concede posse (`grant_cosmetic` é só do servidor, `081:12-13`, e nada no `src` a chama).
- O webhook do Mercado Pago segue tratando assinatura antiga e mandando o e-mail da "adesão ao FORMULADOTA HUB via Pix Automático" (A3, A7).
- O webhook do Stripe segue na main (A4).
- `src/lib/subscriptions/tiers.ts:1-15` se apresenta como a regra dos planos Plus e Premium, e `docs/foundations/INTERNATIONAL.md:4` diz que ele é o "código canônico".
- A flag `ranked_com_pro`: um clique no painel devolve as fichas, com preços errados (A5).

### 2.3 Contradiz o Battlepass de R$ 120

- **Dois "passes" com coroa.** O Compendium chama de "Passe" uma trilha paga que não existe, ao lado do "Battlepass FORMULADOTA" que existe. Quem assina o Battlepass e abre o Compendium não ganha nada lá (a página não lê assinatura, `compendium/page.tsx:15-37`).
- **O painel principal do admin mede a receita com o preço antigo.** "MRR assinaturas" conta cada assinante do Battlepass como R$ 27,90 (o "senão" de `case s.tier when 'premium' then 97.90 else 27.90`, `123:127` e `123:96`), mostra só "Plus N · Premium N" (`src/app/admin/dashboard/page.tsx:335-338`), inclui assinatura de teste (a visão de `123:118-137` não filtra) e a receita mensal não soma a loja (`123:60-112` só lê fichas e assinaturas). O número certo está em `/admin/battlepass` e `/admin/loja`; o do painel principal está errado para a oferta de hoje.
- **Os documentos que todo agente lê primeiro ainda descrevem o modelo antigo como vigente**: `CLAUDE.md:19` ("ficha de vaga = R$ 10 fixo") e `CLAUDE.md:20` (gates com "assinatura" e lobby elite); `docs/foundations/index.md:11, 28-30` (INTERNATIONAL com Plus e Premium, COMPENDIUM com Gratuito, Aegis e Godlike); `docs/foundations/RANKING_SYSTEM.md:98` ("casa com a mensalidade (Aegis/Godlike)"); a memória do projeto (`MEMORY.md:31` diz "47,90 = teto" e "nunca sugerir premium"; `MEMORY.md:38` cita Aegis e Godlike). A spec do Battlepass diz que manda sobre `src/lib/plans.ts` (`docs/battlepass/spec.md:3`), arquivo que não existe.

### 2.4 A mesma coisa com dois preços (ou o mesmo nome com dois preços)

| O quê | Preço da oferta de hoje | O que sobrou | Onde sobrou |
|---|---|---|---|
| Jogar uma partida com o PPA | R$ 25 na party (`160:183`), R$ 49 em duo (`160:185`), R$ 120 por mês sem cota (`config.ts:6`) | R$ 10 ("Avulsa", "Ficha avulsa") | `packages` (`003:7-13`; `023:182-186`; `041:9`) e `/coaches/[slug]` |
| Mentoria | R$ 247 (1:1) e R$ 897 (30 dias) (`160:181-182`) | R$ 100 "Mentoria mensal" | `003:28-33`, `/pacotes` (escondido) |
| Plano mensal do topo | R$ 120 | R$ 97,90 | `123:96, 127`; `tiers.ts:33`; `COMPENDIUM.md:15` |
| Nome "Godlike" | não existe mais | R$ 97,90 num lugar (`COMPENDIUM.md:15`), R$ 27,90 no outro (pt.json:1169) | documentos e textos órfãos |
| Pacote 5 e Pacote 10 | não existem mais | R$ 10 cada, por 5 e 10 partidas | `041:9` (ativos? NÃO CONFIRMADO) |
| Nome "Boost de MMR" | boost da loja, R$ 99 ou R$ 149 a cada 100 MMR (`catalogo.md:13`) | "compre fichas, jogue PT ranked com um PRO" | pt.json:256-258, card que volta com a flag |
| "Aegis" | "recompensa de mérito, nunca vendida" (`catalogo.md:24`) | nome de plano pago e fundo "exclusivo de plano" | `COMPENDIUM.md:15`; `082:53-54` |

### 2.5 Gates que dependem de assinatura antiga

- **Criar sala aceita qualquer tipo de assinatura** (`046:12-18`). Hoje é a regra certa para o Battlepass, mas também vale para um Plus antigo e não tem a folga de 3 dias do cartão que o resto do Battlepass usa (`190:116-118`). Dormente, com as salas pausadas.
- **Lobby elite**: aceita `premium` e `battlepass` (`190:295`) e confere o MMR errado (2.1, item 2).
- **`has_subscription_tier`**: Battlepass vale como Premium e como Plus, e admin vale como Battlepass (`190:315-343`). Não tem chamador hoje (`164:38-62`), mas qualquer função nova que o use herda a hierarquia antiga.
- **Quem tiver Plus ou Premium e for assinar o Battlepass**: o site cancela a assinatura recorrente antiga no Mercado Pago sem avisar a pessoa nem o PPA (`src/lib/battlepass/card.ts:40-56, 61-64`; `src/lib/battlepass/pix.ts:46-47`, com o comentário "ou plano antigo"). O período já pago continua contando até a data, pela regra do "cancelado com data futura" (`046:12-18`), mas a cobrança some sem conversa. Se houver alguém pagando, é risco de cliente e de dinheiro.
- **A trava de "uma assinatura por pessoa"**: o código considera que ela cobre `pending`, `authorized` e `paused` (`src/lib/battlepass/server.ts:49-50`), mas a migration que a criou cobre `pending`, `authorized` e `cancelled` (`008:46-48`). O teste de ponta a ponta passou trocando cartão abandonado por Pix (`scripts/battlepass/e2e.mjs:234-239`; `docs/definicao-de-pronto.md:73`), o que sugere que o banco de produção difere do arquivo: NÃO CONFIRMADO, conferir antes de mexer em assinatura antiga.
- O teto de nível 5 para quem não assinava (`021:116-120`) já saiu (`043:5-7, 35-39`). Sem pendência.

### 2.6 Pontas soltas da própria oferta nova

- No celular e para visitante, o Battlepass não aparece na navegação: o ícone é só para logado e some abaixo de 640 px (`top-bar.tsx:218-223`), e o menu do celular não tem (`mobile-nav.tsx`). A `/loja` não mostra o Battlepass. O plano v3 diz que a compra nasce na live e no celular (`docs/loja/plano-v3.md:11, 29`).
- O maior botão da home para quem está logado leva ao guia do MMR (`src/components/client-shell/hub-center.tsx:126-127`), de um sistema pausado.
- O rótulo do ícone é "Planos", no plural, para um plano só (pt.json:265).

---

## 3. XP e níveis

### 3.1 De onde vem o XP hoje

| Ação | XP | Onde | Funciona hoje? |
|---|---|---|---|
| Acertar uma pergunta nova do quiz | 22 (as 130 levam ao nível 6) | `043:72-130`; `src/app/doutrina/actions.ts:185-197` | Não, quiz desligado |
| Partida concluída numa sala do site | 50 por jogador | `021:157-173` | Não, busca e salas pausadas |
| Ganhar uma conquista | 100 cada | `021:190-200`; `016` | Quase nunca; as de MMR caem no vínculo da Steam |
| Time inscrito em torneio | 300 para cada membro, a cada inscrição | `021:202-216` | Só com torneio aberto. Repetível: o capitão sai e inscreve de novo (`019:77-90`) e o gatilho não confere repetição |
| Aceitar a doutrina (bônus antigo) | 500 | removido em `043:63-66` | Não |
| Login diário, vitória em torneio | só o rótulo existe | `src/lib/levels.ts:198-200` | Não existem no banco |
| Jogar na party do PPA, comprar na loja, pagar o Battlepass, assistir à live, indicar amigo | 0 | nenhum gatilho em `party_participacoes`, `store_orders` ou `subscription_payments` | Não |

A escada pede 2.750 XP no nível 6, 10.450 no 12, 22.950 no 18, 46.850 no 25 e 72.050 no 30 (`levels.ts:168-173`). Conta direta dessas constantes: a 50 XP por partida, o nível 12 pede cerca de 150 partidas depois do quiz inteiro, e o 30 cerca de 1.400 partidas (é a ideia de `RANKING_SYSTEM.md:79-80`). Na prática, com o quiz e as salas parados, o nível está congelado para quase todo mundo. Distribuição real: NÃO CONFIRMADO (seção 6).

### 3.2 Quantos sistemas de nível convivem

Dez indicadores de progresso ou status. Cinco deles (nível, faixa, medalha Valve, medalha da temporada e permissões) aparecem juntos no mini-perfil e no cartão do mouse (`mini-profile-panel.tsx:185-232`), e o próprio código chama a faixa de nível de "medalha de HONRA" (`src/components/ui/medal-pair.tsx:40-45`):

1. Nível de 1 a 30 com anel de XP (B1).
2. Faixa Novato a Místico, a "medalha HONOR" (B2).
3. Medalha Valve (vem da STRATZ e da OpenDota).
4. Medalha FORMULADOTA da temporada, com posição no ranking (B8).
5. Selo de permissões de partida (B7).
6. Conquistas (B3).
7. Shards (B4).
8. Nível do passe no Compendium, que é o número 1 com outro nome (B5).
9. Honra numérica e conduta (B9).
10. Battlepass, com o selo na fila (A1).

Fora da tela, as fichas (A5).

### 3.3 O jogador entende o sistema?

Não. As evidências, todas pela leitura do código:

1. **O mesmo número com dois nomes**: "Nível" no perfil e "Nível do passe" no Compendium (`compendium/page.tsx:37`).
2. **Duas porcentagens diferentes para a mesma pessoa.** Exemplo: quem terminou o quiz tem 2.860 XP, nível 6. O anel do avatar e o Compendium mostram 11% para o nível 7 (`levels.ts:179-190`). O `/progresso` mostra "1.010 / 1.000 XP" e 100%. Causa: o banco guarda o XP do nível contando desde o começo do nível anterior (`043:46-51` e `043:107-112`; `021:137-147`), e a página divide esse número pelo custo do próximo nível (`tab-progresso.tsx:115-120`). A conta certa já existe no código (`levels.ts:179-190`).
3. **Subir de nível sem mudar de faixa, sem aviso**: Lendário e Místico pedem medalha Valve (`levels.ts:150-163`). A spec diz o contrário: "Sem gate de skill nos níveis" e Místico pelo rank FORMULADOTA Imortal ou pela medalha Valve (`RANKING_SYSTEM.md:62-63, 81-84`). E os cosméticos de Lendário e Místico liberam só pelo nível, sem medalha (`src/lib/cosmetics.ts:117-130`; `081:16-25, 81-86`): o perfil pode dizer "Ás" e a coleção liberar a "Aura Mística" e o selo "Místico, alcançou o topo da Fórmula" (`080:166, 187`).
4. **Item bloqueado não diz como liberar**: o cartão mostra só "Bloqueado" (`src/components/cosmetics/cosmetic-card.tsx:157-160`).
5. **O histórico de XP mostra o código cru "doctrine_question"**: a fonte gravada pelo quiz (`043:119`) não tem rótulo (`levels.ts:192-201`), e a tela mostra o código quando falta rótulo (`tab-progresso.tsx:328`).
6. **Selo de permissões e Shards** explicam mecanismos desligados ou sem uso.
7. **"HONOR" para o nível e "Honra" para a conduta** (B9).

### 3.4 Ele premia o que importa agora?

| Ação que importa | Dá XP hoje? | Dado que já existe para premiar |
|---|---|---|
| Comprar vaga ou serviço | Não | `store_orders` guarda quem comprou logado (`158:48`) |
| Jogar na party do PPA | Não | `party_participacoes`, uma linha por partida, com conferência da OpenDota (`190:68-100`; `docs/loja/fila-da-party.md:50`) |
| Assinar o Battlepass | Não | `subscription_payments`, um registro por pagamento (`190:24-51`) |
| Assistir à live | Não | nenhum; o YouTube informa quem escreveu no chat, não quem assistiu (`docs/loja/plano-v3.md:62`). Dá para medir presença por check-in na `/party` com a live no ar (`store_live_sessions.status = 'ao_vivo'`, `docs/loja/fila-da-party.md:33`) |
| Indicar amigo | Não | nenhum; só há links por canal (`src/lib/loja/tracked-links.ts:10-20`). A missão "Convide um amigo" do Compendium é só texto (`compendium.ts:39`) |

### 3.5 Três modelos mais simples

Os pesos de XP abaixo são exemplos para mostrar a ideia, não meta nem dado de uso; se calibram depois.

**Modelo 1, recomendado: a trilha do Battlepass, por temporada**
- O jogador vê um número só: o nível da temporada (as temporadas de 2 meses já existem, `RANKING_SYSTEM.md:96-100`). Ele zera a cada temporada, como o battle pass do Dota, e uma linha de veterania fica no perfil (partidas com o PPA na vida toda).
- XP só do que se confere: partida na party do PPA (o maior peso), compra paga na loja, mês de Battlepass pago, check-in na live (um por live, só com a live no ar) e amigo indicado que pagou a primeira compra. Quiz e partidas de sala voltam a contar quando forem religados.
- Duas trilhas na mesma escada: a grátis para todos e a do Battlepass para quem assina, com cosméticos exclusivos (seção 4.3). O `/compendium` vira a página dessa trilha.
- A favor: liga de vez cosmético, nível e Battlepass, que é o pedido do PPA; premia as cinco ações; usa a palavra que o jogador de Dota já entende. A primeira etapa só usa dado que já existe (party, pedidos e pagamentos).
- Contra: é o que mais constrói (motor de XP novo, check-in e indicação), e cada temporada pede cosmético novo.
- Exemplo de pesos, só para ilustrar: partida na party 100, check-in na live 20, compra 30, mês de Battlepass pago 150, indicação que pagou 100.

**Modelo 2: fidelidade em crédito**
- É a Frente 4 do plano v3 (`docs/loja/plano-v3.md:58-62`): cada compra e cada indicação devolvem crédito, que vira desconto na próxima vaga. O crédito substitui os Shards; o nível fica congelado como selo de veterano.
- A favor: a ligação com receita é direta e a mensagem é a mais simples ("cada compra devolve crédito").
- Contra: tira margem de cada venda, cria um saldo a honrar, e o cosmético fica sem papel. Percentual e validade do crédito são decisão de preço do PPA.

**Modelo 3: marcos sem barra**
- Sai XP, nível, Shards, permissões e Compendium. Ficam selos permanentes calculados do dado real: "jogou com o PPA 1, 10, 50 vezes", "assinante há N meses", "indicou N amigos", "presente em N lives".
- A favor: o mais barato de manter e impossível de confundir.
- Contra: perde o número que sobe toda semana, que é o que traz a pessoa de volta.

**Por que o Modelo 1.** O pedido do PPA é que os cosméticos sigam o nível do Battlepass, e só o Modelo 1 faz isso. Ele também resolve os dois problemas de compreensão de uma vez (um número em vez de dez, e o nome "passe" passa a significar uma coisa só). O Modelo 2 não briga com ele: o crédito pode entrar depois, como decisão de preço. Ordem sugerida: primeiro o nível da temporada com party, compras e mensalidade (dados que já existem); depois check-in da live e indicação.

O que muda nos sistemas de hoje: o XP antigo não se apaga (vira histórico, e quem já tinha nível pode ganhar um selo de veterano); os Shards saem da tela; o selo de permissões só volta com o quiz; a medalha da temporada e a Honra continuam, porque medem outra coisa (desempenho e conduta).

---

## 4. Cosméticos

### 4.1 O que existe de verdade

36 itens em cinco tipos (`080:159-188`; `082:12-57`; `151:6-13`):

| Como libera | Quantos | Itens |
|---|---|---|
| Grátis para todos | 8 | Anel Clássico, Aura Ferro, Energia da Fila (fumaça), Sem Moldura, Névoa Neutra, Alvorada Radiant, Campo de Batalha, Linha de Frente |
| Nível 6 (Aprendiz) | 4 | Aura Bronze, Moldura Fórmula, Selo Doutrinado, Crepúsculo Dire |
| Nível 12 (Piloto) | 5 | Aura Prata, Brasa da Fórmula, Pulso Esmeralda, Emboscada, Confronto |
| Nível 18 (Ás) | 5 | Aura Ouro, Moldura Dourada, Brasa Dourada, Investida, Domínio |
| Nível 25 (Lendário) | 6 | Aura Lendária, Éter Imortal, Arco Ciano, Aurora, Inferno da Fórmula, Lenda |
| Nível 30 (Místico) | 6 | Aura Mística, Névoa Mística, Moldura Mística, Selo Místico, Arcano, Ascensão Mística |
| "Exclusivo de plano", impossível hoje | 2 | Relíquia Aegis, Panteão Godlike |

Onde cada tipo aparece:

| Tipo | Quem vê | Onde |
|---|---|---|
| Anel e moldura | só o dono | mini-perfil (`shell.tsx:175-176`; `mini-profile-panel.tsx:206-207, 224-225, 299-300, 458-459`). Nas listas, no cartão do mouse, no ranking e na partida, o avatar usa a cor padrão do nível |
| Fumaça | só o dono | card de busca e aceite de partida (`src/components/client-shell/bottom-bar.tsx:76, 92`), pausados |
| Selo | ninguém | lido (`queries/cosmetics.ts:100`), nunca desenhado |
| Fundo do perfil | todos | `/me` e perfil público (`src/app/me/page.tsx:108`; `src/components/profile/profile-view.tsx:101`) |

Três tipos estão no código sem nenhum item: efeito de nome, som e reações (`src/lib/cosmetics.ts:8-17`); a coleção esconde tipo vazio. Com o XP congelado, quem chega hoje consegue os 8 grátis; quem fez o quiz inteiro antes chega a 12. Quantos jogadores estão em cada nível e quais itens estão equipados: NÃO CONFIRMADO.

Um cuidado técnico: a coleção calcula o nível pelo XP total (`queries/cosmetics.ts:153`; `src/actions/cosmetics.ts:101`) e o banco confere pelo nível gravado (`081:71-86`). Hoje os dois batem, mas é a mesma regra escrita em dois lugares.

### 4.2 O que só está prometido

- A trilha "Passe" e as missões do Compendium (`compendium.ts:18-40`).
- "Mais chegam com o Compendium a cada temporada" (pt.json:6).
- O selo do Battlepass no perfil e a moldura do Battlepass na coleção (`docs/battlepass/spec.md:27, 113`; pt.json:112).
- "Cosméticos exclusivos de assinante", "flair de assinante no perfil e no ranking" e "XP em dobro no passe" dos planos antigos (pt.json:1173-1180; `tiers.ts:51-65`), sem uso.
- Baús, previsões, fantasy, voto da comunidade, metas coletivas, som, reações e cursor (`COMPENDIUM.md:43-72`): nada construído.

### 4.3 Desenho recomendado: cosmético preso ao nível do Battlepass

1. **Primeiro, ser visto.** Cosmético só vende se outros veem. Antes de qualquer item novo: mostrar anel, moldura e selo onde as pessoas olham, que é a fila da party e os overlays da live (onde o selo do Battlepass já aparece), o cartão do mouse, o ranking e o perfil público.
2. **Uma escada, duas trilhas.** Os níveis da temporada do Modelo 1 liberam itens na trilha grátis (todos) e na trilha do Battlepass (assinante).
3. **Reaproveitar o catálogo.** Na trilha grátis, os anéis, molduras, fumaças e fundos por faixa, em níveis que dá para alcançar numa temporada. Na trilha do Battlepass, os 6 efeitos de anel (os mais caros de produzir, `151`), os 2 fundos "de plano" renomeados para o Battlepass (`082:53-56`), a moldura animada e a moldura e o selo do Battlepass que a spec já prometeu (`docs/battlepass/spec.md:113`).
4. **Selo é estado, item é conquista.** O selo do Battlepass some quando a assinatura acaba. O item liberado na trilha paga fica para sempre (é o que o battle pass do Dota faz). Esta parte é decisão do PPA.
5. **Nada aleatório, nada avulso por enquanto.** Baú pago ou caixa surpresa bate no "sem sorteio para vender" do plano v3 (`docs/loja/plano-v3.md:61`) e no que o próprio Compendium já evitava (`COMPENDIUM.md:41`). Vender cosmético avulso também fica para depois: hoje o cosmético marca mérito e pertencimento (`COMPENDIUM.md:11`).
6. **Ninguém perde o que já tem.** Antes de mudar a regra de um item, conceder a posse a quem já o equipou ou liberou.
7. **Cartão bloqueado diz o caminho**: "Nível 8 da temporada" ou "Trilha do Battlepass".
8. **Uma regra de nível só**, a mesma na tela e no banco.

---

## 5. Plano de limpeza

Em ordem. As etapas 0 a 3 não mexem em dado de cliente nem em dinheiro (a 3 muda só as visões de leitura do painel). A Etapa 1 pode sair já; a 5 espera o fim do teste da fila, como o plano v3 pede.

| Etapa | O que fazer | Risco | Como prova que terminou |
|---|---|---|---|
| 0 | Rodar a conferência do banco (seção 6) quando ele voltar | Nenhum, só leitura | consultas rodadas e resultado anotado |
| 1 | **Honestidade da `/planos` e dos documentos.** Tirar "e no seu perfil" do selo (ou entregar o selo no perfil); trocar a frase do lobby elite por "criar sala, quando as salas voltarem"; tirar "a doutrina e o quiz" do que continua grátis enquanto a flag estiver desligada. Marcar como superados, no índice (`docs/foundations/index.md:11, 28-30`), COMPENDIUM, INTERNATIONAL (planos), PRICING e REVENUE; corrigir `CLAUDE.md:19-20`; marcar as 7 memórias antigas como superadas, apontando para `docs/battlepass/spec.md` e `docs/loja/plano-v3.md` | Nenhum para dado. Muda texto no meio do teste de 30 dias do Battlepass (à venda desde 19/11, `config.ts:16`): anotar a data | busca pelos três textos em `messages/{pt,en,es}.json` volta vazia; `pnpm cf:verificar` com falhas 0 |
| 2 | **Tirar da tela o que promete mecanismo morto**: selo de permissões só com o quiz ligado; Shards fora do `/progresso`; barra do `/progresso` com a conta certa (`levels.ts:179-190`); ícone e rota `/compendium` redirecionando para `/planos` até a trilha nova existir; texto do ranking vazio; bloco "Análises de coaching"; rótulo do histórico de XP; `/coaches/[slug]` sem botão de compra (ou redirecionando para a `/loja`) | Baixo. Link antigo para `/compendium` resolve com redirecionamento | teste automático da barra com o caso de 2.860 XP dando 11%; capturas em 1920x1080, 390x844 e 3440x1440 |
| 3 | **Painel principal do admin**: receita das assinaturas pelo valor pago (`subscription_payments`), loja somada, sem teste | Baixo, mas é migration (as visões do `123`) | o número do painel principal bate com `/admin/battlepass` e `/admin/loja` |
| 4 | **Assinantes antigos**, só se a Etapa 0 achar alguém: decisão do PPA (seção 7). Antes disso, mudar o código para não cancelar assinatura antiga sem aviso (`card.ts:40-56`; `pix.ts:46-47`) | **Alto**: cobrança recorrente de cliente real | nenhum preapproval antigo autorizado no Mercado Pago, ou cada um com a decisão anotada |
| 5 | **Aposentar o Ranked com PRO e as fichas**, depois do teste da fila (`docs/loja/plano-v3.md:34`): tirar rotas, card, seção do menu e flag do painel; redirecionar `/rankedpt`, `/pacotes`, `/checkout` e `/ranked-com-pro` para `/party`; trocar os redirecionamentos de depois da sala (`criar-lobby/actions.ts:175`; `lobbies/[id]/actions.ts:201, 262, 277`; `lobby-invite-listener.tsx:77`). No banco, só desativar os pacotes, sem apagar. O ramo de ficha do webhook sai só depois de conferir que não há Pix de ficha pendente | Médio: link antigo e ficha paga não usada, se existir | busca por `ranked-com-pro` e `fichaPackage` no `src` acha só os redirecionamentos; `pnpm loja:e2e`, `pnpm battlepass:e2e` e `pnpm cf:verificar` verdes |
| 6 | **Plus, Premium e Stripe**: apagar `tiers.ts`, os textos órfãos de `billing` (pt, en e es juntos, a paridade é regra do projeto), os e-mails da adesão HUB, o webhook e a biblioteca do Stripe, as variáveis e os pacotes. Manter `/assinatura` redirecionando, porque há link de volta antigo do Mercado Pago (`src/app/assinatura/page.tsx:5-7`). No banco, tirar plus e premium da regra só quando a Etapa 0 provar zero linhas, e conferir antes no painel do Stripe se há endpoint configurado | Médio | `pnpm typecheck`, `lint`, `test` e `build` com 0; busca por `STRIPE_` e `tierPlusName` vazia |
| 7 | **Cosméticos** (seção 4.3): mostrar anel, moldura e selo para os outros; levar os 2 fundos "de plano" para o Battlepass; selo e moldura do Battlepass | Médio: quem já equipou não pode perder | teste de equipar e de posse; captura do cartão do mouse com o anel de outro jogador |
| 8 | **Novo modelo de XP**, depois da decisão do PPA, com spec e definição de pronto próprias | Médio | critérios escritos antes de começar |

O que pode quebrar em cada frente:

- **Dado de produção**: pacotes, assinaturas, posse de cosmético e linhas de flag. Nunca apagar tabela com conteúdo; desativar em vez de apagar. Migration em produção segue a regra do projeto, nunca `supabase db push` (`CLAUDE.md`, seção Pagamentos).
- **Assinante ativo**: a cobrança recorrente antiga, se existir, continua até alguém cancelar no Mercado Pago.
- **Link antigo**: `/assinatura`, `/rankedpt`, `/pacotes`, `/checkout`, `/compendium` e `/coaches/...` precisam de redirecionamento, nunca de página quebrada.
- **Gate que quebra**: tirar plus e premium da regra de criar sala derruba quem ainda tiver Plus ativo; mexer no lobby elite só faz sentido quando as salas voltarem.

---

## 6. O que conferir no banco quando ele voltar

Tudo só leitura:

```sql
-- 1. Flags de verdade
select key, enabled, updated_at from feature_flags order by key;

-- 2. Assinaturas por plano, provedor e estado (separando teste)
select tier, provider, status, is_test, count(*), min(created_at), max(next_payment_date)
  from subscriptions group by 1, 2, 3, 4 order by 1, 2, 3;

-- 3. Planos antigos que ainda podem cobrar (conferir cada preapproval no painel do Mercado Pago)
select id, user_id, tier, provider, status, mp_preapproval_id, stripe_subscription_id, next_payment_date
  from subscriptions
 where tier in ('plus', 'premium') and status in ('pending', 'authorized', 'paused', 'cancelled');

-- 4. A trava de uma assinatura por pessoa, como está em produção
select indexdef from pg_indexes where indexname = 'subscriptions_one_active_per_user';

-- 5. Pagamentos do Battlepass
select status, method, is_test, count(*), sum(coalesce(paid_amount_cents, amount_cents))
  from subscription_payments group by 1, 2, 3;

-- 6. Fichas: compras, saldos e fila de PRO
select status, count(*), sum(preco_pago) from purchases group by 1;
select user_id, sum(delta) as saldo from ficha_ledger group by 1 having sum(delta) <> 0;
select status, count(*) from coach_queue_entries group by 1;

-- 7. Pacotes antigos e PROs com página pública
select nome, tipo, qtd_partidas, preco_brl, ativo, coach_id from packages order by display_order;
select pp.user_id, pp.status, c.slug
  from pro_promotions pp left join coaches c on c.profile_id = pp.user_id;

-- 8. Níveis, Shards e de onde veio o XP
select current_level, count(*) from user_levels group by 1 order by 1;
select sum(current_shards) from user_levels;
select source, count(*), sum(xp_amount), max(created_at) from xp_events group by 1 order by 4 desc;

-- 9. Inscrição de torneio repetida (XP em dobro)
select metadata->>'tournament_id' as torneio, user_id, count(*)
  from xp_events where source = 'tournament_register'
 group by 1, 2 having count(*) > 1;
select id, name, status, registration_ends_at from tournaments where status = 'open';

-- 10. Doutrina
select count(*) filter (where doctrine_accepted_at is not null) as doutrinados,
       count(*) filter (where jsonb_array_length(coalesce(doctrine_quiz_progress, '[]'::jsonb)) > 0) as comecaram
  from profiles;

-- 11. Cosméticos equipados e posse concedida
select c.slug, c.requirement->>'kind' as libera, count(e.user_id) as equipados
  from cosmetics c left join user_equipped e on e.cosmetic_id = c.id
 group by 1, 2 order by 3 desc;
select count(*) from user_cosmetics;

-- 12. Temporadas e salas elite
select id, name, season_number, beta, active, started_at, ended_at from seasons order by started_at;
select tier, count(*) from lobbies group by 1;

-- 13. Notas públicas que citam oferta antiga
select published_at, title from changelog_entries
 where published and (title || ' ' || body_md) ~* '(plano|assinatura|godlike|aegis|premium|plus|passe|compendium|ficha)'
 order by 1;

-- 14. Base do novo modelo de XP
select count(*), count(distinct user_id) from party_participacoes where not is_test;
select count(*) filter (where user_id is not null) as logados, count(*) as total
  from store_orders where status = 'pago' and not is_test;
```

Fora do banco: no painel do Mercado Pago, as assinaturas recorrentes antigas que não são do Battlepass; no painel do Stripe, se a conta existe e se há endpoint de webhook apontando para o site.

---

## 7. Decisões que são do PPA

Cada uma com a recomendação:

1. **Modelo de XP**: 1, 2 ou 3. Recomendo o 1 (seção 3.5).
2. **Compra dá XP?** Recomendo que sim, com peso menor que jogar na party, para o nível continuar dizendo "eu jogo e participo", e não só "eu pago".
3. **Item da trilha do Battlepass fica depois de cancelar?** Recomendo que fique; o selo, não.
4. **Crédito de volta (Modelo 2, Frente 4 do plano v3)**: percentual e validade são preço, decisão dele.
5. **Assinantes antigos, se a Etapa 0 achar algum**: recomendo honrar o período pago e convidar para o Battlepass, sem cancelar por conta própria.
6. **Ranked com PRO**: aposentar de vez (recomendado, a party e o Battlepass ocupam o lugar dele) ou manter dormindo atrás da flag.
7. **Lobby elite**: tirar a frase da página agora e decidir a regra quando as salas voltarem.
8. **Destino do `/compendium`**: virar a página da trilha do Battlepass (recomendado) ou sair do site.
