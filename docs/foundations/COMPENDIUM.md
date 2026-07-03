# COMPENDIUM — Cosméticos, Passe (Battle Pass) e Freemium

> **Status: EM IDEAÇÃO (spec/draft).** Documento norteador — nada implementado ainda.
> Última revisão: 2026-07-01. Decisões travadas com Pedro nesta data (ver §2).
> Fonte da paixão de referência: o **Compendium do The International** (Dota 2), o pai do battle pass.

## 1. Visão — por que

Recriar, dentro do FORMULADOTA, a **paixão sazonal pelo Compendium** que o jogador de Dota tinha todo ano no TI: uma temporada que vira um *evento* — trilha de recompensas, previsões dos torneios, missões, baús, metas de comunidade e cosméticos que você exibe com orgulho no seu perfil público.

Diferença crítica de contexto: **não temos itens in-game da Valve** (terrenos, wards, couriers). Nossos cosméticos são de **plataforma/identidade** — o perfil público anti-anonimato é a vitrine (ver [[POSITIONING.md]] e a memória `project_identidade_antianonimato`). O que se exibe é *quem você é na Fórmula*: seu ring, sua moldura, seus badges de temporada, seu tema de perfil. **A cultura é o produto** — cosméticos marcam mérito e pertencimento, não são só enfeite pago.

## 2. Decisões travadas (Pedro, 2026-07-01)

1. **Modelo = assinatura mensal, 3 planos:** Gratuito / **Aegis (R$ 27,90/mês)** / **Godlike (R$ 97,90/mês)**. Preços recorrentes travados em 2026-07-01 — Godlike acima do teto de 47,90 anterior foi decisão consciente do Pedro.
2. **Fonte dos cosméticos = híbrido com peso no mérito** — a maioria se conquista (nível, tier, doutrina, temporada); alguns são exclusivos de plano/passe.
3. **Catálogo = o maior possível**, inspirado no Compendium do TI (ver §5 e §6).
4. **Motor de progressão do passe = doutrina + partidas** (não só grind de jogo).

## 3. Como assinatura (contínua) e Compendium (sazonal) se conciliam

O Compendium do TI é intrinsecamente **sazonal** (começa, tem clímax no torneio, acaba). A assinatura é **recorrente**. Conciliamos assim:

- **Assinatura (Gratuito/Aegis/Godlike)** = o *tier de acesso* contínuo. Define **o que** você desbloqueia, a **velocidade** (multiplicador de XP do passe) e **cosméticos exclusivos do plano**.
- **Compendium sazonal** = a *experiência* que se renova a cada **temporada de ranking** (já existe — "Temporada 1 — Genesis"). Contém a trilha temática, missões, previsões, baús e metas de comunidade daquela temporada.
- **A assinatura potencializa o Compendium.** Gratuito participa da trilha (limitada); Aegis/Godlike destravam a trilha completa, multiplicadores e baús exclusivos da temporada.

Isso dá receita recorrente (assinatura) **e** o pico de paixão sazonal (Compendium), sem depender de dois checkouts distintos.

## 4. Matriz de aquisição de cosméticos (o "híbrido com peso no mérito")

| Via | Como se ganha | Exemplo | Alinhamento cultural |
|---|---|---|---|
| **Mérito** | Nível (0–30), tier (Aprendiz→Místico), progresso da doutrina | Ring/moldura por tier; badge "Doutrinado" | Núcleo — mérito visível |
| **Temporada** | Ranking/conquistas da temporada | Badge "Top 10 — Genesis"; moldura sazonal | Sazonalidade, "temporadas que reiniciam" |
| **Passe (trilha)** | XP do passe (doutrina + partidas) | Baús a cada N níveis do passe | Engajamento contínuo |
| **Plano (assinatura)** | Ser Aegis/Godlike | Cosmético exclusivo do plano; multiplicador | Monetização recorrente |
| **Comunidade** | Metas coletivas (stretch goals) | Efeito desbloqueado pra TODOS ao bater meta | "Movimento, não SaaS" |
| **Voto** | Comunidade escolhe o próximo cosmético autoral | "Arcana Vote" da Fórmula | Pertencimento, buzz |

**Evitar (risco cultural — só reavaliar depois):** mecânicas de **loteria/gacha paga** (estilo *Rylai's Wheel*) e **apostas com fichas PIX** (*wagers*) — destoam da cultura anti-atalho e mexem em dinheiro real (fichas). Se um dia entrarem, com pontos não-monetários e sem pressão.

## 5. Catálogo de cosméticos (slots equipáveis) — o maior possível

Cada slot aceita **1 item equipado por vez**. Todos são de plataforma (renderizados no perfil/mini-perfil/chat/ranking):

1. **Efeito de avatar ring** — glow/energia ao redor do avatar (já temos base por tier; vira equipável).
2. **Moldura de avatar (frame)** — borda decorativa animada (shader/asset autoral).
3. **Fumaça/energia de fundo** — a fumaça por shader atrás de cards (já temos base; temática).
4. **Badge/flair de perfil** — selo de conquista/temporada no perfil e mini-perfil.
5. **Tema de perfil / banner** — cor/arte de fundo do cabeçalho do perfil (imersão, como "terreno").
6. **Efeito/cor de nome** — tratamento do nome público no ranking/chat/lobby.
7. **Som de notificação** — SFX próprio (acopla com [[SOUND_SYSTEM.md]]).
8. **Reações/sprays de chat** — emblemas/reações no chat de grupo/sala (equivalente a taunts/emoticons).
9. **Cursor/HUD flair da plataforma** — detalhe de UI (avaliar custo/benefício).
10. **Selo animado de "partida encontrada"** — variação do overlay de aceite (usa o shader já existente).

> Regra de qualidade (LEI): **tier-1, shader/asset autoral** — nada de CSS/tsParticles amador. Estrutura Dota 2, pele brand FormulaDota (ver [[DESIGN_LANGUAGE.md]] e memória `feedback_design_hierarquia_dota_brand`; neon liberado). Raridades: Comum → Raro → Épico → Lendário → **Imortal** (autoral, produção cara, reservado a marcos).

## 6. Elementos do Compendium do TI adaptados

| Compendium (TI) | Adaptação FormulaDota |
|---|---|
| **Predictions / Bracket** | Prever resultados dos **torneios FormulaDota** e ranked-com-PRO → XP do passe + badge de acerto |
| **Fantasy Challenge** | Time *fantasy* dos **PROs da Fórmula** |
| **Cavern Crawl** | **Trilha da Corrida** — mapa de missões (posições/heróis + lições de doutrina) que abre caminhos e solta cosméticos |
| **Immortal Treasures / baús** | **Baús da Fórmula** — subir nível do passe abre baús com cosméticos por raridade |
| **Arcana Vote** | **Voto da Temporada** — comunidade escolhe o próximo efeito/tema autoral a produzir |
| **Community Stretch Goals** | **Metas de comunidade** — ex.: X partidas doutrinadas na temporada desbloqueia um cosmético pra todos |
| **Weekly Quests** | **Missões semanais** (doutrina + partidas) = motor de XP do passe |
| **Recompensas de imersão** (terreno, HUD, música) | Temas de perfil, sons, molduras, efeitos, badges — a "imersão" mora no perfil |
| **Crowdfunding do prize pool** | (Ideia forte, avaliar) parte da receita de Aegis/Godlike **abastece a premiação dos torneios FormulaDota** da temporada |

## 7. Modelo de dados (proposta — 3 camadas + passe)

Padrão da indústria (Valorant/Steam/Heroic Labs): catálogo → posse → equipado.

- **`cosmetics`** (catálogo) — fonte de verdade de todo item: `id, slot, name, rarity, source (merito|temporada|passe|plano|comunidade|voto), asset_ref, season_id?`.
- **`user_cosmetics`** (posse) — `user_id, cosmetic_id, acquired_at, acquired_via`. RLS: dono lê o seu; leitura pública do **equipado** (perfil é público).
- **`user_equipped`** (equipado por slot) — `user_id, slot, cosmetic_id`. Um por slot.
- **`battle_pass_seasons`** — `id, name, starts_at, ends_at` (amarra à temporada de ranking existente).
- **`battle_pass_progress`** — `user_id, season_id, xp, level, claimed_levels[]`.
- **`battle_pass_rewards`** — `season_id, level, cosmetic_id, track (free|aegis|godlike)`.
- Missões/predictions/stretch goals: tabelas próprias numa fase posterior.

RLS obrigatória em tudo; concessão de cosmético = função `SECURITY DEFINER` (nunca client escreve posse direto). Migration = **aprovação Pedro**.

## 8. Faseamento sugerido (sem pressa — projeto é side project saudável)

- **Fase 0 (fundação):** `cosmetics` + `user_cosmetics` + `user_equipped` + rota **biblioteca/coleção** pra ver e equipar. Refatorar ring/fumaça (hoje hardcoded por tier) pra serem dirigidos pelo item equipado, com **fallback pro comportamento atual por tier**. → é a task #49.
- **Fase 1 (mérito):** popular catálogo com cosméticos de mérito (rings/molduras por tier, badge doutrinado). Sem pagar nada ainda — valida o loop de equipar.
- **Fase 2 (passe sazonal):** trilha, XP (doutrina+partidas), baús, níveis. Amarra à temporada.
- **Fase 3 (planos):** Aegis/Godlike destravam trilha/multiplicador/exclusivos.
- **Fase 4 (paixão coletiva):** predictions, missões semanais, stretch goals, voto da temporada.

## 9. Decisões ainda abertas (precisam de você)

1. ~~Preço/cadência do Godlike~~ — **RESOLVIDO (2026-07-01): mensal recorrente. Aegis R$ 27,90/mês, Godlike R$ 97,90/mês.**
2. **O que exatamente cada plano libera** (matriz Gratuito × Aegis × Godlike): multiplicador de XP, nº de slots, baús exclusivos, acesso a lobby elite? → detalhar.
3. **Crowdfunding do prize pool** (§6): parte da receita vira premiação dos torneios? (forte culturalmente, mas mexe em fluxo financeiro).
4. **Nomes dos tiers:** "Aegis" e "Godlike" são termos de Dota (Aegis of the Immortal / streak Godlike). Confirmar, ou querer algo mais "doutrina/Fórmula"?

## 10. Referências

- [Battle Pass 2018 (dota2.com)](https://www.dota2.com/international2018/battlepass/) · [TI10 Battle Pass (wiki)](https://dota2.fandom.com/wiki/The_International_10_Battle_Pass) · [Compendium 2015](https://www.dota2.com/international2015/compendium/)
- [What is Dota 2 Battle Pass — features/rewards](https://dota2gamers.gg/what-is-dota-2-battle-pass/) · [Battle Pass design & monetization](https://www.gamemakers.com/p/understanding-battle-pass-game-design)
- Modelagem: [Heroic Labs Inventory](https://heroiclabs.com/docs/hiro/concepts/inventory/) · [Steam Inventory Schema](https://partner.steamgames.com/doc/features/inventory/schema)
- Efeitos tier-1 (stack): [shadcn.io/shaders](https://www.shadcn.io/shaders) · [Aceternity UI shaders/borders](https://ui.aceternity.com/blocks/shaders) · [VFX-JS](https://tympanus.net/codrops/2025/01/20/vfx-js-webgl-effects-made-easy/) · [awesome-webgl](https://github.com/sjfricke/awesome-webgl)
