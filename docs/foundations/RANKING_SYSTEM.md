# Sistema de Nivelamento FormulaDota — Spec de Fundação

> Fonte da verdade do design de progressão/ranking. Decidido com Pedro em 2026-07-01.
> Substitui a confusão anterior (medalha Valve + MMR com pele Valve + "honra" que na
> verdade media atividade). Implementação = migrations 089+ e libs correlatas.

## Princípio central

O jogador tinha **três coisas com cara de rank** competindo, duas usando a mesma pele
Herald→Immortal. A cultura FormulaDota é o produto; a metodologia (validada pelo Pedro,
Immortal/Top 0.5%) leva **qualquer** jogador ao Imortal se seguida. O nivelamento reflete
isso: **4 eixos, cada um medindo UMA coisa**, sem redundância de significado.

## Os 4 eixos

| Eixo | Mede | Movimento | Visual |
|------|------|-----------|--------|
| **1. Medalha Valve** | Skill oficial (MMR "legado") | Puxado da API (STRATZ/OpenDota) | Medalha oficial Dota (Herald→Immortal) |
| **2. Rank FormulaDota** | Desempenho in-house, por temporada | Elo+desempenho, reset+calibração por season | **Mesma escala Valve (8 tiers + estrelas)**, pele/moldura FormulaDota |
| **3. Nível (1→30)** | Lealdade/comprometimento (atividade + doutrina) | **Só sobe**, nunca reseta | Número de conta + barra de XP (escada Novato→Místico) |
| **4. Honra** | Conduta/cidadania | Sobe (bom) / desce (ruim); gate de acesso | Selo de reputação próprio + Mural da Vergonha |

### Eixo 1 — Medalha Valve = "MMR legado"
- Puxada da API, read-only. É o **retrato de onde o jogador veio** na Valve.
- Papéis: (a) **semente** da calibração no eixo 2; (b) referência histórica exibida.
- Não recalculamos. Como o oficial **nunca reseta o sistema** (MMR inflacionário, topo
  travado ~17k só pra pros), a medalha Valve vira um número fossilizado — é por isso que
  o eixo 2 (com reset sazonal) é o rank que passa a importar.

### Eixo 2 — Rank FormulaDota (o rank que IMPORTA)
- **Reusa as 8 medalhas Valve (Herald→Immortal + estrelas)** — jogada GamersClub: escala
  densa e familiar, revestida de significado próprio. NÃO reduzir pra 6 (achata Dota).
- Pele/moldura visual FormulaDota pra distinguir do ícone oficial da Valve.
- **Sazonal**: reseta e recalibra a cada temporada (o serviço que a Valve não dá).
- Motor: Elo K=25 + modulador de desempenho (±10, percentis OpenDota por herói —
  justo entre funções). Ver `src/lib/mmr.ts` (já existe).
- **Modelo de desempenho v3 — PESOS POR FUNÇÃO (2026-07-04, `PERF_PROFILES`):** o v2
  usava um perfil ÚNICO que punia suporte (5/10 do peso em hero_damage/tower/gpm, onde
  suporte tem percentil estruturalmente baixo) e tinha um componente FANTASMA
  (`stuns_per_min`, benchmark que não existe na OpenDota). O v3 detecta a **função por
  net worth** (os 2 menores de cada time = suporte) e avalia cada jogador no perfil da
  SUA função: **teamfight domina nos dois**; CORE pondera dano/torre/farm; SUPPORT
  pondera stun/cura/visão (wards) e **não** usa torre nem gpm. `stuns` e `wards` vêm do
  replay parseado, normalizados (`normalizeStuns` 4s/min = teto; `normalizeWards`
  0,6/min = teto); ausentes saem da média. Testes em `src/lib/mmr.test.ts`.
- **MVP por temporada (2026-07-04, migration 128):** `player_season_mmr.mvps` conta as
  partidas em que o jogador teve o maior perfScore (`match_details.mvp_user_id`).
  Exibido no hover, no /ranking (coluna) e no perfil.
- **Recompute cronológico (2026-07-04, `scripts/recompute-season-mmr.ts`):** reaplica
  todas as partidas da season em ordem, do seed limpo da medalha, com o modelo v3 por
  função. Idempotente (o seed é o âncora). Rodado uma vez pra corrigir os deltas do v2.
- **Placar/UI:** o ícone da POSIÇÃO específica (1-5, rank de net worth no time) aparece
  em todas as abas de estatística; a aba MMR ordena por posição; a coluna "Lutas %" (ex
  "CA") é participação em teamfight. O monograma "FD" nas medalhas foi removido.
- **Um ladder só** pra toda a comunidade (não separa "povão" de "elite"). Lobby elite
  permanece **gate de ACESSO**, não sistema de rating paralelo.

### Eixo 3 — Nível (1→30) = lealdade
- **Só sobe, nunca desce, nunca reseta.** É o motor de retenção/veterania.
- XP: +50 por partida concluída, doutrina, badges, torneios, login. Curva atual em
  `src/lib/levels.ts` (72.050 XP pro 30 → status de veterano de longo prazo).
- **Sem gate de skill nos níveis** (Herald dedicado chega a Místico por comprometimento).
  A "prova de skill" mora no eixo 2 (rank), não aqui — desacopla skill de lealdade.
- Marcos culturais: nível 6 = **Doutrinado** (quiz da doutrina completo).

### Eixo 4 — Honra = conduta
- **Medidor de reputação próprio** (número), separado do Nível. Todo mundo começa num
  valor NEUTRO ("X").
- Sobe: conduta limpa ao longo do tempo + elogios de outros jogadores (estilo commend).
- Desce: advertências/quebras de regra (amarradas aos 14 princípios + anti-padrões).
- **Abaixo do limiar de acesso = suspenso/banido** (a ideia do Pedro aplicada AQUI, não
  no Nível). Recupera com o tempo (conduta limpa) — EXCETO banimento (permanente).
- **Mural da Vergonha**: lista pública de suspensos/banidos com o princípio/anti-padrão
  violado, data e duração. Factual e sóbrio (coerente com o anti-anonimato). É o
  contraponto do leaderboard: accountability nos dois extremos.

## Místico = Imortal (a promessa da metodologia)

O topo do Nível (**Místico, nível 30**) exige Imortal — porque, pela metodologia validada,
1400 partidas seguindo o método **produzem** um jogador capaz de Imortal. É a promessa
feita símbolo. **Ajuste anti-falha técnica:** aceita Imortal via **QUALQUER** um dos dois:
- **Rank FormulaDota Imortal** (in-house) — o método provado no ambiente justo; OU
- **Medalha Valve Imortal** — o método transferido pro mundo real (objetivo final).

Motivo: a medalha Valve é um proxy **defasado** (jogador in-house pouco ranqueia oficial,
calibração Valve velha, smurf não vinculado). Não podemos barrar quem o método já formou
por um número de API atrasado. Dois caminhos ao topo — ambos provam que a cultura funciona.

## Temporadas

- **O problema que resolvemos:** o Dota oficial **NÃO tem reset de sistema** (cada jogador
  só pode resetar o próprio MMR, com espera de 1 ano). Sem reset, o MMR é **inflacionário**
  → o topo é um teto **travado** (top1 ~17k, impossível pra um novato). O FormulaDota reseta
  o ladder inteiro a cada temporada → **o topo reabre de 2 em 2 meses** e volta a ser
  alcançável pela metodologia. É o oposto do teto fechado da Valve.
- **Duração: 2 meses (8 semanas)** na fase inicial (regulável pra 3 quando a base amadurecer).
  Curto = mais resets (re-engajamento), mais campeões/histórias, leaderboard atingível,
  iteração rápida. Casa com a mensalidade (Aegis/Godlike) e o Compendium.
- **Calendário:** S1 = 01/ago/2026 → 30/set/2026; S2 = 01/out → 30/nov; e assim por diante
  (sempre dia 1º — âncora limpa, alinhada à cobrança).
- **Pré-temporada (beta):** o período ATUAL (até 31/jul) não conta. As partidas de teste
  (ex.: `8876797662`) ficam marcadas como beta e NÃO entram no ranking. A temporada ativa
  hoje no banco é remarcada como beta. S1 abre limpa, todo mundo do zero na calibração.

### Reset (soft reset, não wipe)
- Fim da temporada: MMR **decai -30%** com piso (`applySeasonDecay`, já existe), medalha
  volta pra **"Descalibrado"**.
- Re-calibração parte perto de onde parou (história acelera o retorno) — fresco sem ser cruel.

### Calibração (posicionamento)
- Início da season: **Descalibrado** (sem medalha visível) até ~**7 placements**.
- **Semente:** veterano = MMR pós-decay da season anterior; novo/1ª vez = medalha Valve.
- **Semeadura NO VÍNCULO Steam (2026-07-04, migrations 126/127 + `src/lib/queries/seed-season-mmr.ts`):**
  a semente `seedMmrFromRankTier` existia mas nunca era chamada no vínculo — 42/81
  usuários ficavam sem linha em `player_season_mmr` e a medalha FORMULADOTA saía como
  placeholder (Arauto). Agora o callback do Steam busca o `career` (OpenDota) e semeia a
  season ativa; os existentes foram backfillados. O **card de aceitar partida** também
  voltou a carregar `rank_tier`/`leaderboard_rank`/`level`/`season_mmr` nas assignments da
  proposta (a migration 112 os tinha dropado ao reescrever `try_form_match`).
- **K alto (~50)** durante placements → converge rápido pro nível real; cai pra **K=25**
  (estável) após calibrar. (Incerteza alta no início → converge → estabiliza.)
- Migra a calibração de GLOBAL (hoje em `profiles`, atrelada a fichas de PT) pra
  **por-temporada** (em `player_season_mmr`).

### Prestígio (o norte: "fui Imortal no FormulaDota S2")
1. **Leaderboard é a glória**: cruzar pra Imortal dá **posição numerada** (Top 1, 2...).
   "Sou Imortal" é bom; "fui Top 10 da S3" é o flex. Reseta por season.
2. **Escassez atingível**: Top100 oficial exige ser pro; o Top100 FormulaDota é difícil
   **mas alcançável pela metodologia**. É o que o não-pro nunca terá na Valve.
3. **Imortalização permanente**: conquistas gravadas no perfil pra sempre (mural por
   season: "S1: Imortal · S2: Top 25 · S3: Lendário"). O prestígio ACUMULA.
4. **Decaimento no topo**: Imortal/leaderboard decai por inatividade (mantém a corrida
   viva; prestígio atual, não só histórico).

## MMR no histórico de partidas (pedido original do Pedro)
- `match_players.mmr_change` (novo) guarda o delta por jogador por partida.
- `applyMatchMmr` passa o delta; o placar (`/partida/historico/[id]`) mostra `+26`/`-22`.
- Aplicado no **finalize de matchmaking** (`finalize-match.ts`), só quando há season ativa
  NÃO-beta (durante beta, `applyMatchMmr` já pula por não haver season contável).

## Impacto no schema (migrations)
- `seasons`: add `beta boolean default false`, `season_number int` (display). Remarcar a
  season atual como beta; criar S1 (01/ago).
- `player_season_mmr`: add `placements_played int default 0`, `calibrated boolean default false`,
  `peak_mmr int`, `leaderboard_rank int`.
- `match_players`: add `mmr_change int`.
- `apply_match_mmr` (RPC): aceitar delta por jogador e gravar em `match_players.mmr_change`;
  liberar caminho de sistema (service role) além de admin/coach.
- Nova `season_achievements` (permanente): user_id, season_id, medalha final, leaderboard_rank,
  título — feed do mural de conquistas do perfil.
- Honra: `profiles.honra_score int` (ou tabela `honor_ledger` já existe — avaliar reuso) +
  limiares de suspensão/ban. Mural = view sobre `user_warnings`/`behavior_status`.

## Ordem de implementação (gate: S1 pronta e testada até 01/ago)
1. Migrations de fundação (schema acima) — aditivo, seguro.
2. Motor de MMR: delta + calibração (K alto) + semente Valve + gate beta + gravar delta.
3. Display: MMR no placar; pele FormulaDota nas medalhas do rank.
4. Leaderboard sazonal + imortalização no perfil.
5. Honra (medidor) + Mural da Vergonha.
6. Ciclo de season: soft reset + calibração + decaimento (cron) + virada S1.

Cada etapa = PR próprio, testado, com o beta protegendo o ranking real até 01/ago.
