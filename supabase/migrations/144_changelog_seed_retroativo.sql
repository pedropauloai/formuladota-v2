-- 144_changelog_seed_retroativo.sql — Semeadura RETROATIVA das novidades (Pedro 2026-07-05).
--
-- Curadoria manual a partir do histórico de commits. REGRAS aplicadas:
--   • Só o que é visível/relevante pro JOGADOR (features, melhorias, justiça).
--   • NADA de segurança, RLS, auditoria interna, refactor ou jargão de dev.
--   • Voz didática (o que mudou e por quê), no espírito das notas de patch do Dota.
--   • Vários commits do mesmo tema/data agrupados em UMA entrada.
--
-- Idempotente: apaga só as entradas com este marcador antes de reinserir, então
-- rodar de novo não duplica. (Marcador = título; a curadoria é fixa.)

delete from public.changelog_entries where created_at < now() and title in (
  'Placar ao vivo: heróis e patrimônio em tempo real',
  'Partidas mais justas: função vem do matchmaking',
  'Seu perfil agora tem um link com o seu nome',
  'FORMULADOTA agora fala espanhol (e abriu LATAM e Europa)',
  'Placar mais completo: MVP, presença e favorito x zebra',
  'Matchmaking por habilidade',
  'Partidas: feed ao vivo e histórico completo',
  'Entenda seu MMR: a nova página /mmr',
  'Leaderboard dos Imortais',
  'Identidade de verdade: nick oficial e redes sociais',
  'Temporadas competitivas e o Mural',
  'Compendium e coleção de cosméticos',
  'Amigos, grupos e chat no estilo Dota 2',
  'Placar pós-jogo completo, com 10 abas de análise',
  'As partidas nascem sozinhas',
  'FORMULADOTA em dois idiomas'
);

insert into public.changelog_entries (published_at, title, category, body_md, published) values
(
  '2026-07-05 18:00:00-03', 'Placar ao vivo: heróis e patrimônio em tempo real', 'novidade',
  'Enquanto a partida rola, o placar agora mostra os **10 heróis** escolhidos, o **patrimônio** (net worth) e o **KDA** de cada jogador — atualizando sozinho.

Antes você via só os nomes esperando o jogo acabar. Agora dá pra acompanhar a partida acontecendo, ao vivo.', true
),
(
  '2026-07-05 12:00:00-03', 'Partidas mais justas: função vem do matchmaking', 'balanceamento',
  'A **função** de cada jogador (carry, suporte, offlane...) agora vem da vaga que você pegou no matchmaking — não mais de quem juntou mais ouro.

- Antes: um Slardar de offlane podia aparecer como "mid" só por ter farmado bem.
- Agora: a posição mostrada é a que você realmente jogou.

Também afinamos a **nota de desempenho** pra parar de punir heróis que naturalmente não têm stun nem cura. Cada função é avaliada pelo que importa nela.', true
),
(
  '2026-07-04 20:00:00-03', 'Seu perfil agora tem um link com o seu nome', 'melhoria',
  'O endereço do seu perfil deixou de ser um código enorme e virou algo simples como **/perfil/seunome**.

Mais fácil de compartilhar, de lembrar e de mandar pros amigos.', true
),
(
  '2026-07-04 16:00:00-03', 'FORMULADOTA agora fala espanhol (e abriu LATAM e Europa)', 'novidade',
  'Além de **português** e **inglês**, o app agora está em **espanhol**.

E abrimos **regiões de jogo** — Brasil, LATAM e Europa — cada uma com sua fila, seus preços e sua assinatura. As filas de regiões diferentes nunca se misturam.', true
),
(
  '2026-07-03 19:00:00-03', 'Placar mais completo: MVP, presença e favorito x zebra', 'novidade',
  'O placar pós-jogo ganhou reforços:

- **Destaque de MVP** — quem mais brilhou na partida.
- **Mapa de presença** — um mapa de calor de onde cada jogador andou (estilo STRATZ).
- **Favorito x zebra** — a explicação de quem entrou como favorito e o que mudou no MMR.', true
),
(
  '2026-07-03 15:00:00-03', 'Matchmaking por habilidade', 'melhoria',
  'A fila passou a respeitar o **nível de habilidade** dos jogadores. A busca começa apertada (gente do seu nível) e vai **abrindo aos poucos** até formar uma partida equilibrada.

Grupos entram juntos respeitando o mesmo critério.', true
),
(
  '2026-07-02 21:00:00-03', 'Partidas: feed ao vivo e histórico completo', 'novidade',
  'Uma aba nova no topo — **Partidas** — mostra o que está rolando **agora** e todo o **histórico**, com avatar, nível e medalha de cada jogador.

Dá pra buscar qualquer partida pelo **ID** direto no topo do feed.', true
),
(
  '2026-07-02 17:00:00-03', 'Entenda seu MMR: a nova página /mmr', 'novidade',
  'Criamos uma página que explica, **sem jargão**, como o MMR do FORMULADOTA funciona: a escala ancorada na oficial do Dota, o quanto o seu desempenho pesa em cada partida e por que aqui não existe "teto" travando a sua evolução.', true
),
(
  '2026-07-02 13:00:00-03', 'Leaderboard dos Imortais', 'novidade',
  'O ranking ganhou um **top de Imortais**, com a medalha oficial de leaderboard e o número na placa.

Os melhores da comunidade, à vista de todos — do jeito que tem que ser.', true
),
(
  '2026-07-02 10:00:00-03', 'Identidade de verdade: nick oficial e redes sociais', 'novidade',
  'Você pode registrar seu **nick oficial** (uso único) e vincular suas **redes sociais** ao perfil.

Faz parte do princípio anti-anonimato do FORMULADOTA: aqui todo mundo tem nome, rosto e reputação — sem smurf, sem se esconder.', true
),
(
  '2026-07-01 20:00:00-03', 'Temporadas competitivas e o Mural', 'novidade',
  'Chegou o ciclo de **temporadas**, com virada e reset suave a cada ciclo, além da **imortalização** das suas conquistas no perfil.

E o **Mural** — o registro público de conduta da comunidade. Aqui, reputação pesa.', true
),
(
  '2026-07-01 16:00:00-03', 'Compendium e coleção de cosméticos', 'novidade',
  'Fundação do **passe da temporada** (/compendium) e da sua **coleção** (/colecao): anéis, molduras e efeitos equipáveis pra deixar o seu avatar com a sua cara.', true
),
(
  '2026-06-30 20:00:00-03', 'Amigos, grupos e chat no estilo Dota 2', 'novidade',
  'Sistema social completo e fiel ao cliente do Dota 2:

- **Mensagens diretas** entre amigos.
- **Chat de grupo**.
- **Party** pra entrar na fila junto, no mesmo time.

Tudo em tempo real, com notificações.', true
),
(
  '2026-06-29 18:00:00-03', 'Placar pós-jogo completo, com 10 abas de análise', 'novidade',
  'Cada partida ganhou um placar detalhado no estilo **OpenDota/STRATZ**: visão geral, performance, gráficos, builds, combate, mapa de visão, teamfights, objetivos, draft e benchmarks.

Análise de nível profissional pra revisar o seu jogo.', true
),
(
  '2026-06-27 18:00:00-03', 'As partidas nascem sozinhas', 'novidade',
  'O sistema de partidas ficou de pé. Do "buscar" ao jogo, tudo automático:

- A fila **forma o time**.
- O bot **cria a sala** no Dota, **convida os 10** e lança a partida.

Você só precisa aceitar e jogar.', true
),
(
  '2026-06-18 12:00:00-03', 'FORMULADOTA em dois idiomas', 'novidade',
  'O app nasceu **bilíngue**: português e inglês, com a URL e todo o conteúdo traduzidos. O primeiro passo pra levar o FORMULADOTA pro mundo.', true
);
