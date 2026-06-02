# PROGRESSION REDESIGN — Spec autoritativo (Pedro, 2026-06-02)

> **Fonte da verdade** pra revisão coordenada de TODOS os docs fundacionais.
> Decisão explícita de Pedro Paulo em 2026-06-02. Onde este spec conflitar com docs antigos,
> **este spec prevalece** e os docs são revisados (revisão consciente de cânone, autorizada).
> Os agentes que atualizam cada doc devem ler ESTE arquivo como referência única.

---

## 1. A grande mudança: HONOR = nível da conta (0–30), fundido com XP

Antes (cânone antigo): HONOR era uma pontuação de conduta separada (0–2100+) com **8 tiers**, e XP/níveis (`user_levels`, migration 021) era um sistema gamificado **separado**.

**Agora (decisão Pedro):** os dois sistemas **fundem-se num só eixo**. O **nível da conta (0–30) É o HONOR**. XP é o combustível que sobe o nível. As medalhas ficam nos **marcos de nível 6, 12, 18, 25, 30** — reduzindo de 8 tiers pra **5 medalhas** (Novato = estado pré-medalha). A escolha dos marcos espelha o ritmo de "ultimate do herói"/DotaPlus, não as 8 medalhas da Valve.

Isto é uma **revisão consciente** do princípio antigo "HONOR é só conduta". Agora o eixo HONOR/Nível combina **conhecimento (entrada)** + **conduta (sustentação)** — ver §3.

Os **dois eixos** da filosofia (Pilar 3) permanecem:
- **SKILL** — externo, MMR Valve oficial (sincronizado via OpenDota), NÃO calculado internamente.
- **HONOR / NÍVEL (0–30)** — interno, este sistema. É o que muda aqui.

---

## 2. As 6 bandas e os nomes (5 medalhas + Novato)

| Marco (nível) | Banda | Medalha / Título | Significado |
|---|---|---|---|
| 0–5 | base | **Novato** (sem medalha) | Ainda não provou conhecimento. Calibrando. |
| **6** | 6–11 | **Aprendiz** | Completou a verificação de doutrina+metodologia. **Doutrinado.** Gate do serviço freemium. |
| **12** | 12–17 | **Piloto** | Está aplicando o método nas partidas (metáfora "Fórmula do Dota de Corrida"). |
| **18** | 18–24 | **Ás** | Domínio da pista — piloto virou ás. |
| **25** | 25–29 | **Lendário** | Referência cultural consolidada (guardião da cultura). |
| **30** | 30 | **Místico** | Topo do ladder. Percepção expandida, compreende o jogo além do jogo. |

**Regras de nomenclatura:**
- O **antigo tier 8 "Imortal da Fórmula" é APOSENTADO como tier**. O topo do ladder é **Místico (nível 30)**.
- **PRO é um PAPEL, não um nível.** Chegar a Místico (30) torna o jogador *elegível* a PRO — a promoção em si exige o processo de `PRO_PROMOTION.md` (entrevista cultural, endosso, contrato). NÃO promover automaticamente por nível.
- A "Liga Imortal" mantém o nome como marca, mas seu **gate de elegibilidade re-aponta** do antigo "tier 8 Imortal da Fórmula" para **Místico (nível 30) sustentado** (ver §6).

---

## 3. Como se sobe de nível (a salvaguarda de integridade)

**Níveis 0 → 6 = CONHECIMENTO (verificação gamificada da doutrina + metodologia).**
- O usuário ganha XP a cada **informação verificada** (questões/checkpoints de conduta e metodologia).
- **Math do balanceamento:** `XP_por_questão = (XP cumulativo necessário pra atingir o nível 6) ÷ (total de questões de conduta + metodologia)`. Ou seja: **completar 100% da verificação = chegar exatamente ao nível 6.** Valores numéricos exatos dependem da curva de `level_thresholds` (migration 021) + contagem final de questões → calibração.
- Atingir o nível 6 = **Aprendiz = doutrinado** = libera o serviço freemium (§5).

**Níveis 6 → 30 = CONDUTA VIVIDA + JOGO (não mais quiz).**
- Daqui pra cima, XP vem de comportamento real nas partidas — os eventos que já existiam no HONOR_SYSTEM viram eventos de XP: partida completada sem abandono, commendations de companheiros (comunicação/atitude/mentor), "derrota com honra", presença de temporada, temporada sem strikes, etc.
- **Strikes SUBTRAEM XP e podem REGREDIR o nível.** Um Lendário tóxico pode cair pra Piloto. Conduta nunca para de importar — o nível é avaliação contínua, não troféu permanente. (Banimento/anti-padrões: ver tabela de severidade que já existe em HONOR_SYSTEM, agora aplicada como perda de XP.)
- **Por que essa divisão protege a integridade:** um jogador tóxico pode gabaritar o quiz e chegar ao nível 6 numa tarde — mas **trava ali**, porque de 6 pra cima só sobe quem vive a doutrina. Conhecer ≠ viver. O quiz te deixa entrar; só a conduta te faz Místico.

---

## 4. Serviços (independentes, coexistem)

- **Fichas / PT-com-PRO** (MVP atual) = serviço SEPARADO, não relacionado a este sistema de lobbies. Coexiste sem conflito. Pricing descentralizado por PRO já documentado em PRICING_MODEL/REVENUE_MODEL — intocado.
- **Lobbies in-house** (este sistema) = criação **AUTOMATIZADA** de partida (bot Steam monta o lobby sozinho, sem Pedro online). Isto corrige a falha #1 da Liga V1 documentada em PRODUCT_CORE ("Single Point of Failure: Pedro" → "Jogar Agora sem Pedro conectado").

---

## 5. As duas faixas de lobby + o modelo freemium

| Lobby | Gate | Medalhas | Modelo |
|---|---|---|---|
| **Livre** | **Nível 6** (Aprendiz / doutrinado) | Todas | **FREEMIUM** — gratuito. Prova de doutrina é a única exigência. |
| **Elite** | **Nível 6 (doutrinado) + medalha Imortal Valve** | Só Imortal Valve | Premium (monetização TBD — fora do escopo deste spec). |

**Reconciliação com "a restrição é o produto" (PRODUCT_CORE §2):** PRESERVADA. O lobby livre NÃO é "aberto a qualquer um" no sentido de sem-gate — ele exige **nível 6 (doutrina verificada)**. A restrição continua sendo o produto; ela só deixou de ser pagamento/medalha e virou **prova de conhecimento da cultura**. O lobby é gratuito, não irrestrito.

**Reconciliação com o ego (Pilar 14 / LIGA_IMORTAL):** o lobby elite exige medalha Imortal Valve **E** doutrina (nível 6). A medalha é **necessária mas não suficiente** — "99,9% dos Imortais não vivem o método ainda", então mesmo eles precisam se doutrinar (nível 6). A medalha sozinha nunca dá acesso. Isso dissolve a crítica de "lobby de ego".

**Nível ≠ acesso ao lobby elite.** O ladder 0–30 vale pra TODOS (massa Cruzado-Arconte-Lenda inclusa). Um Místico Arconte alcança o topo do ladder por conduta, mas **não** entra no lobby elite (falta a medalha Valve). São dois gates distintos. Não confundir.

---

## 6. Cascata — o que cada doc precisa mudar

- **HONOR_SYSTEM.md** — REESCRITA. 8 tiers → ladder 0–30 (5 medalhas + Novato). HONOR = nível da conta, fundido com XP. Conduta-pura → conhecimento(0–6) + conduta(6–30). Atualizar tabela de tiers, algoritmo (eventos viram XP), reset de temporada, componente visual (HonorRankMedal → 6 bandas/cores/nomes novos), critério especial (Imortal da Fórmula → Místico). Preservar a filosofia dos 2 eixos e a tabela de 15 anti-padrões/severidade (vira perda de XP).
- **LIGA_IMORTAL.md** — re-apontar gate "tier 8 Imortal da Fórmula" → **Místico (nível 30) sustentado**. Manter nome "Liga Imortal" como marca. Ajustar anti-padrão "Admitir Imortal Valve sem ser Imortal da Fórmula" pra refletir novo topo.
- **PRO_PROMOTION.md** — re-apontar elegibilidade (tier 8) → **Místico (nível 30)**. Reforçar: PRO = papel conquistado por processo, não nível automático.
- **PRODUCT_CORE.md** — atualizar refs aos 8 tiers; adicionar modelo freemium (lobby livre nível 6 / elite Imortal+doutrina); reconciliar "a restrição é o produto" (restrição = nível 6); refletir "app" (HUB aposentado); criação automatizada de lobby. Missão "formar 200 Imortais" permanece. Preservar voz Mestre+Guardião.
- **CALIBRATION.md** — mapear calibração (visitante→calibrando→ranqueado) pros níveis iniciais (0–6). Atualizar refs de tier.
- **PHILOSOPHY.md / UX_PRINCIPLES.md / MULTIPLICATION_MODEL.md / METHODOLOGY.md / REVENUE_MODEL.md / PRICING_MODEL.md / DESIGN_LANGUAGE.md** — varrer e corrigir QUALQUER referência a "8 tiers", "Imortal da Fórmula (tier 8)", ou gate antigo. Preservar tudo o mais.
- **MATCH_CREATION.md** (NOVO) — sistema de criação de partidas: criação automatizada (bot), duas faixas de lobby + gates (§5), independência das fichas, e o "porquê" (correção do SPOF Pedro). Cross-link PHILOSOPHY/LIGA_IMORTAL/PRODUCT_CORE/HONOR_SYSTEM.
- **PROGRESSION_PUBLIC.md** (NOVO) — explicação **voltada ao usuário** de toda a estrutura E do *porquê* das decisões, escrita pra ser compreendida **durante o próprio processo de doutrina** (auto-entendimento do sistema). Voz Mestre+Guardião, PT-BR, sem emoji. Deve cobrir: os 2 eixos, o ladder 0–30 e as 5 medalhas, como se sobe (conhecimento→6, conduta→30), por que conduta pode regredir, o freemium (nível 6), o lobby elite (Imortal+doutrina), e por que a medalha Valve sozinha não basta. Este conteúdo alimentará uma página pública integrada ao onboarding (código vem depois).

---

## 7. O que NÃO muda (não tocar)

- Os 14 princípios + 15 anti-padrões da doutrina (conteúdo).
- SKILL = MMR Valve externo (não calcular interno — decisão lockada 2026-05-24).
- Sistema de fichas / pricing descentralizado / revenue split PRO 85/10/5.
- Marca FORMULADOTA, voz Mestre+Guardião, regras de UI (sem emoji, etc.).
- A missão: formar 200 jogadores Imortais de forma legítima.
