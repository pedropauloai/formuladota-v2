# Pesquisa — Integrações Steam, Bot Lobby Dota 2, Anti-smurf, Sistema próprio

> **Data**: 2026-05-01
> **Triggered by**: Pedro pediu investigação após ver `meta-liga.ggarena.pro` como referência.
> **Objetivo**: documentar tudo o que descobrimos pra fundamentar Vision V2/V3 do PRD sem decidir nada agora.

---

## 1. Análise — meta-liga.ggarena.pro (referência principal)

### 1.1 Stack identificada

| Camada | Tech |
|---|---|
| Frontend | Next.js (App Router, RSC — `?_rsc=...` payloads) |
| UI tokens | Design system custom em CSS vars (`player-1`, `player-2`...`player-11`, `player-surface`, `player-a4` — padrão Radix Themes/Sailwind) |
| Backend API | REST versionada — host separado: `api.ggarena.pro/1/...` |
| Tempo real | WebSocket (`Attempting to connect WebSocket for user: 7...`) |
| Auth | **Steam OpenID 2.0 puro** — realm `http://api.ggarena.pro/`, callback `api.ggarena.pro/1/auth/steam/callback?state=...` |
| Streaming | Twitch via Amazon IVS Player SDK 1.52 (embed na home) |
| CMS leve | **Google Sheets publicado como CSV** (Lista de Picks — admin edita planilha, site lê em runtime) |
| Equipe | 2 devs: [Marcelo Augusto](https://github.com/marceloarc) + [Felipe Reducino](https://github.com/felipereducino) |

### 1.2 Mapa de rotas (descoberto via Playwright logado com a Steam do Pedro)

**Públicas**:
- `/` — login Steam
- `/blog` — preview público (vazio)
- `/lista-de-picks` — redireciona pra autenticada se logado
- `/privacidade`, `/cookies` — políticas

**Autenticadas (`/player-dashboard/...`)**:
| Rota | Função |
|---|---|
| `/player-dashboard` | Home autenticada — notícias + Twitch live embed |
| `/player-dashboard/criar-lobby` | **Lista de lobbies em tempo real** (filtros: liga, modo, senha) + botão "+ Criar Lobby" |
| `/player-dashboard/amigos` | Sistema de amigos |
| `/player-dashboard/ranking` | Ranking por liga (top 3 cards + lista) |
| `/player-dashboard/perfil/{steamid64}` | Perfil público |
| `/player-dashboard/minhas-partidas` | Histórico próprio |
| `/player-dashboard/lista-de-picks` | Draft Board com heróis recomendados por role |
| `/player-dashboard/forum` | Fórum |
| `/player-dashboard/blog` | Blog |

### 1.3 Endpoints API descobertos (`api.ggarena.pro`)

| Método | Rota | Uso |
|---|---|---|
| GET | `/1/auth/steam/callback?state=<csrf>` | Conclui OpenID handshake |
| GET | `/1/user/info` | Identidade do user logado (do cookie de sessão) |
| GET | `/1/friends` | Lista de amigos |
| GET | `/1/friends/requests/{steamid}` | Pedidos pendentes |
| GET | `/1/chat/conversations/{steamid}` | Conversas |
| GET | `/1/matches/players/top/{steamid}` | Top heróis do jogador |
| GET | `/1/matches/player/{steamid}?steam_id=X&page=N&limit=N&search=` | Histórico paginado |

**Padrões observados**:
- Versionamento via prefixo numérico `/1/` (não `/v1/`).
- Endpoints exigem `steam_id` no path/query mesmo já tendo cookie de auth — defesa em profundidade.
- Paginação clássica `page` + `limit`.
- WebSocket separado pra realtime (estado online de amigos, lobbies).

### 1.4 Sistema de Ligas (vertical de produto)

Três ligas paralelas — cada usuário tem desempenho separado por liga:
- **Liga Livre** — open
- **Liga Profissional** — restrita (provavelmente maior nível ou paga)
- **Loucademia** — programa de mentoria/academia (nome próprio, "Lou + Academia")

Modos de jogo expostos: **Ranked All Pick**, **Captains Mode**.

### 1.5 Sistema de Ranking (réplica visual do Dota 2 oficial mas isolado)

- **MMR próprio** — começa em 1000 base, +25/-25 por partida (observado: 1025 pós-vitória, 975 pós-derrota).
- **Rank 1-8** (mesma estrutura do Dota 2: Herald → Immortal).
- **Estrelas 0-5** dentro de cada rank (igual oficial).
- Top dos Imortais (Rank 8) mostra **número de leaderboard** ao invés de estrelas (igual oficial — ex: "#4578", "#1110").
- Cards mostram: avatar, nickname linkado pra perfil, badge de rank, MMR, V/D/Win Rate.

**Implementação inferida**:
- Tabela `players_league` com `(player_id, league_id, mmr, wins, losses, rank, stars)`.
- Trigger atualiza após cada partida marcada como concluída.
- Reset por temporada (não validado mas é prática padrão em ligas).

### 1.6 Permissão de criar lobby

Ao clicar "+ Criar Lobby" como user comum: **"Você não possui autorização para criar lobby"**. Modelo: tier de permissão (provavelmente: pago, admin-aprovado ou role específico). Não é livre pra qualquer logado.

### 1.7 Lista de Picks — hack do Google Sheets

A "Lista de Picks" é alimentada por uma planilha **Google Sheets publicada como CSV**:
```
https://docs.google.com/spreadsheets/d/e/2PACX-...{sheet_id}.../pub?gid=0&single=true&range=F6:J29&output=csv
```

Vantagem: admin (provavelmente Creyson Reborn — a Twitch deles) edita uma planilha e o site reflete sem painel CMS. Conteúdo atual: 5 colunas (HC, MID, OFF, SUP4, SUP5) × 9-11 heróis recomendados cada.

**Aplicabilidade ao formuladota**: Pedro pode fazer a mesma coisa pro "guia da semana" / "build do dia" sem painel admin custom. Iteração rápida.

---

## 2. Steam OAuth — implementação atualizada (2026)

### 2.1 Como funciona

Steam **não tem OAuth 2.0 nativo** — usa **OpenID 2.0** (legado mas mantido pela Valve). Fluxo:

1. App redireciona user pra `https://steamcommunity.com/openid/login` com parâmetros:
   - `openid.ns=http://specs.openid.net/auth/2.0`
   - `openid.mode=checkid_setup`
   - `openid.realm=https://seu-dominio.com/`
   - `openid.return_to=https://seu-dominio.com/auth/steam/callback?state=<csrf>`
   - `openid.identity=http://specs.openid.net/auth/2.0/identifier_select`
   - `openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`
2. User loga no Steam (na própria Steam).
3. Steam redireciona pro `return_to` com `openid.claimed_id=https://steamcommunity.com/openid/id/{steamid64}`.
4. App **DEVE validar** o response devolvendo pra Steam com `openid.mode=check_authentication` (anti-spoofing).
5. Extrai SteamID 64 do `claimed_id`.
6. App opcionalmente chama Steam Web API com `key` privada pra pegar nickname/avatar (`ISteamUser/GetPlayerSummaries/v0002/?key={KEY}&steamids={STEAMID}`).

### 2.2 Bibliotecas (Node.js / Next.js)

| Biblioteca | Uso |
|---|---|
| [`node-steam-openid`](https://www.npmjs.com/package/node-steam-openid) | Wrapper minimalista pro fluxo. Funciona em route handlers. |
| [`passport-steam`](http://www.passportjs.org/packages/passport-steam/) | Padrão Express/Passport — pode ser adaptado pra Next mas é menos idiomático. |
| [`authjs-steam-provider`](https://github.com/goncalojbsousa/authjs-steam-provider) | Provider pro Auth.js v5 (NextAuth) — typed e edge-ready. |
| Custom em Edge Function | Implementação manual em ~80 linhas (validação OpenID via fetch). |

### 2.3 Integração com Supabase Auth (não tem provider Steam nativo)

Três caminhos:

**(a) Tabela paralela** — Supabase Auth segue como Discord-only; criamos `steam_links (user_id, steam_id_64, verified_at)` populada via Server Action que valida OpenID. **Pró**: simples, mantém SSR atual. **Contra**: dois fluxos de auth.

**(b) Steam como auth primário via Supabase Anonymous + JWT custom** — usuário loga Steam → backend valida OpenID → emite JWT custom assinado pelo Supabase service role + chama `supabase.auth.signInAnonymously()` → atualiza profile. **Pró**: unifica auth. **Contra**: complexidade alta, precisa rotacionar JWT secret.

**(c) Auth.js (NextAuth) v5 com adapter Supabase + Steam Provider** — substitui Supabase Auth por Auth.js. **Pró**: ergonômico. **Contra**: refatoração grande; perdemos integração nativa Supabase RLS via JWT (precisa adaptar).

**Recomendação**: começar com **(a) tabela paralela**. Discord é login primário (1-click, anti-fraude social), Steam é "verificação de identidade gamer" complementar. Pode evoluir pra (b) só se Pedro quiser que Steam seja o único método.

### 2.4 Steam Web API key

- Criar em https://steamcommunity.com/dev/apikey
- Pedir um domain — precisa ter um (ex: `formuladota.com`).
- **Nunca expor no client** — só server-side. Vai em `.env` como `STEAM_WEB_API_KEY`.

---

## 3. Discord Connections — anti-smurf via OAuth scope `connections`

### 3.1 Como funciona

Quando o user faz login Discord OAuth com scope `connections`, o app pode chamar:
```
GET https://discord.com/api/v10/users/@me/connections
Authorization: Bearer <access_token>
```

Resposta inclui array com TODAS as contas que o user vinculou ao Discord:
```json
[
  { "type": "steam", "id": "76561198...", "name": "Username", "verified": true, "visibility": 1 },
  { "type": "twitch", "id": "...", "name": "...", "verified": true },
  { "type": "youtube", "id": "...", ... },
  { "type": "twitter", ... }
]
```

### 3.2 Aplicação anti-smurf no formuladota

Estratégia em camadas:
1. **Login Discord** (já implementado) → identidade social.
2. **Steam OpenID** → Pedro confere que SteamID é real.
3. **Discord connections** com scope `connections` → app verifica se o Steam vinculado ao Discord do user **bate** com o Steam que ele logou diretamente. Se não bate, flag suspeita.
4. **Sinais adicionais**:
   - Idade da conta Discord (`user.created_at`)
   - Idade da conta Steam (Steam Web API → primeira partida ranked, level Steam)
   - Nº de partidas públicas Dota 2 (OpenDota)
   - Behavior score Dota 2 (não exposto pela Valve mas inferível por nº de bans/reports)

### 3.3 Score anti-smurf (sugestão)

Tabela `user_trust_score` com:
- `discord_account_age_days`
- `steam_account_age_days`
- `steam_dota_matches_count`
- `discord_steam_match` (boolean — connection bate?)
- `score` (0-100, calculado server-side)

User com score baixo entra em **probation** (não pode comprar pacote × 2, ou exige aprovação manual Pedro).

---

## 4. Bot Dota 2 — criar lobby customizado via Steam Game Coordinator

### 4.1 Como funciona

Bot precisa:
1. **Conta Steam dedicada** com Dota 2 ativado na conta (gratuito desde sempre).
2. Login via `steam-user` (lib Node) → autentica como cliente Steam normal.
3. `node-dota2` ou fork (ex: [`dotabod/node-dota2-fork`](https://github.com/dotabod/node-dota2-fork)) → fala com o Game Coordinator (GC) Dota.
4. Comandos do GC pra criar lobby: `Dota2.createPracticeLobby({...opções})`.
5. Listener `practiceLobbyUpdate` recebe estado do lobby (jogadores, slot picks, modo, senha).
6. Bot pode adicionar bots IA, kickar jogadores, mudar modo, iniciar match, capturar `match_id` no fim.

### 4.2 Hospedagem

- **Funciona em Docker headless Linux** — não precisa do client Dota 2 instalado, só do `steamcmd` autenticando.
- **Não precisa GUI** — apenas TCP/UDP outbound pros servidores Steam.
- Custo: container 256MB RAM em Railway/Fly.io ~$0-5/mês.

### 4.3 Riscos (importante!)

Pesquisei VAC ban implications. Conclusão:
- **VAC ban** é por cheats em jogo, não por uso da API GC. Bot só pra criar lobby **historicamente não dispara VAC**.
- **Game Ban (Overwatch/Low Behavior)** Dota 2: a Valve bane por "botting" se a conta jogar partidas automatizadas. Bot que **só cria lobby e sai** raramente é banido.
- **Trade ban / community ban**: contas de bot podem ser limitadas se tiverem padrões suspeitos (muitos lobbies seguidos, padrão automatizado).
- **Mitigação**:
  - Conta dedicada (NÃO usar a conta pessoal do Pedro!).
  - Conta com pelo menos 1 jogo comprado, idade > 30 dias, 2FA ativado.
  - Não criar mais de N lobbies/hora (rate limit auto-imposto).
  - Manter bot com nome neutro (não `formuladota-bot-01`).
  - Backup: ter 2-3 contas bot em rotação (não todas em paralelo — fallback se uma cair).

### 4.4 Alternativas mais simples (sem bot Steam)

**Modo "manual com guidance"**: na hora marcada, o sistema mostra ao Pedro:
- Nome de lobby sugerido
- Senha aleatória
- Modo + região
- Lista de SteamIDs convidados

Pedro cria o lobby manualmente em 30s e cola match_id depois. **Zero risco, zero infra extra**. Tradeoff: não tem "criar lobby" automatizado, mas pra mentoria 1-1 não faz diferença real.

---

## 5. APIs de stats Dota 2 — comparação

| API | Tipo | Custo | Pontos fortes | Pontos fracos |
|---|---|---|---|---|
| [**OpenDota**](https://docs.opendota.com/) | REST | Free (5/min sem key, 1200/mês com key free) | Open source, completa, refresh manual via `POST /matches/{id}` | Latência (replay parse pode demorar minutos) |
| [**Stratz**](https://stratz.com/api) | **GraphQL** | Free com auth | Migração concluída pra GraphQL — query exatamente o que precisa, mais leve. Dados de rank progression e leaderboard. Adapta rápido a eventos sazonais. | Documentação menos didática que OpenDota |
| [**Steam Web API (Dota 2)**](https://wiki.teamfortress.com/wiki/WebAPI#Dota_2) | REST | Free com key | Source da verdade (Valve direto). Match details básicos, leaderboards. | Limitado — sem stats agregados, sem histórico longo |
| **STRATZ + OpenDota** combinados | — | — | Cruzar fontes pra robustez | Manter 2 integrações |

**Recomendação**: **OpenDota** primeiro (PRD já planeja). Trocar pra **Stratz GraphQL** se quisermos rank progression detalhado ou queries mais flexíveis (ex: stats por hero × role × patch).

---

## 6. Sistema próprio de ranking + badges Dota 2

### 6.1 Mecânica de MMR (modelo simples Elo-like)

```
delta = K * (resultado - expectativa)
expectativa = 1 / (1 + 10^((mmr_oponente_medio - mmr_jogador) / 400))
K = 25  -- ajuste por partida
```

Se `K=25`: vitória contra time de mesmo MMR → +12,5 a +25; derrota → -12,5 a -25. Aproxima o sistema oficial Dota 2.

Com 5v5 e mentor (Pedro) sempre num lado: a expectativa do time com Pedro é deslocada (ex: +400 MMR equivalente Immortal). Pode-se ignorar Pedro do cálculo do MMR dos clientes (só conta MMR de clientes, mas vitória/derrota é do time).

### 6.2 Tiers — réplica visual Dota 2

8 tiers × 5 estrelas + nivel Immortal numerado:

| Tier | MMR alvo (interno, escala 1000-3500) |
|---|---|
| Herald (1) | 1000-1199 |
| Guardian (2) | 1200-1399 |
| Crusader (3) | 1400-1599 |
| Archon (4) | 1600-1799 |
| Legend (5) | 1800-1999 |
| Ancient (6) | 2000-2199 |
| Divine (7) | 2200-2399 |
| Immortal (8) | 2400+ (com leaderboard rank no top) |

> Cada tier tem 5 sub-divisões (estrelas) — 40 unidades intermediárias antes do Immortal.

### 6.3 Badges (assets)

- Pacote pago: [Etsy bundle Dota 2 Rank Badges](https://www.etsy.com/listing/4343846539/dota-2-rank-badges-herald-to-immortal) — Herald a Immortal em 18×18, 36×36, 72×72.
- Free: [pngaaa.com](https://www.pngaaa.com/detail/8168066), [pngegg.com](https://www.pngegg.com/en/png-ypivc) — qualidade variada.
- DIY estilizado: design próprio com identidade Fórmula Dota (cyan/purple) usando referência visual mas branding distinto.

**Recomendação Pedro**: começar com PNGs free, fazer rebranding cyan/purple de cada badge no Figma/Photoshop. Diferencia da Valve, evita problemas de IP, mantém identidade.

### 6.4 Temporadas

- Tabela `seasons (id, name, start_at, end_at, active)`.
- Reset MMR a cada temporada (-30% padrão Dota 2 oficial).
- Histórico imutável (`player_season_history`) pra mostrar "MMR pico" e "rank final" de cada temporada no perfil.

---

## 7. Recomendação de fasagem (não decidida — para discussão Pedro)

### Phase 1-6 (MVP atual — 7 dias) — manter como está
Mentoria 1-1, Discord OAuth, AbacatePay, agendamento, bot Discord notificações.

### V1.5 (semanas 4-8 pós-launch — só se MVP validar)
- **Steam OpenID** complementar (vincular SteamID via tabela paralela)
- **Discord Connections scope** → score anti-smurf básico
- **Stats automatizados** via OpenDota (substitui input manual de match_id)

### V2 (mês 3-4)
- **Sistema de ligas internas** (Liga Livre + Mentoria mensal como 2 ligas)
- **Ranking interno** com MMR custom + badges Dota 2 reskinned
- **Histórico de temporadas**
- **Lista de Picks/Builds da semana** via Google Sheets CSV (zero esforço admin)

### V3 (mês 6+, só se demanda explodir)
- **Bot lobby Dota 2** via node-dota2 + Steam GC
- **Multi-conta verification** (Twitch/YouTube/X via Discord connections)
- **Captains Mode interno** com draft Phase
- **Sistema de amigos** + chat (real-time WebSocket)
- **Forum** próprio ou integração Discord Forum channels

---

## 8. Próximos passos imediatos

Nada disso vira código antes do MVP V1 sair em produção. **A Phase 1-6 do PRD continua intocada**. Esse documento serve de:

1. Backlog estruturado pro Pedro decidir quando expandir.
2. Referência pra não reinventar pesquisa quando V1.5 começar.
3. Justificativa pra escolhas: Discord-first (não Steam-first) é defensável porque Discord traz comunidade, Steam só identidade técnica.

---

## Sources

### meta-liga (descoberta direta via Playwright)
- Login: https://meta-liga.ggarena.pro/
- Dashboard: https://meta-liga.ggarena.pro/player-dashboard/*
- API: https://api.ggarena.pro/1/*
- Devs: [marceloarc](https://github.com/marceloarc), [felipereducino](https://github.com/felipereducino)

### Steam OAuth
- [Steam Web API docs](https://steamcommunity.com/dev) — chave + endpoints
- [Steam OpenID 2.0 — emgoto tutorial](https://www.emgoto.com/steam-auth-and-openid/)
- [node-steam-openid](https://www.npmjs.com/package/node-steam-openid)
- [authjs-steam-provider](https://github.com/goncalojbsousa/authjs-steam-provider)
- [HilliamT/nextjs-steam-auth](https://github.com/HilliamT/nextjs-steam-auth)
- [Steamworks User Authentication and Ownership](https://partner.steamgames.com/doc/features/auth)

### Discord Connections
- [Discord OAuth2 docs](https://discord.com/developers/docs/topics/oauth2)
- [Discord connections endpoint](https://docs.discord.food/resources/connected-accounts)
- [discordjs guide OAuth2](https://discordjs.guide/legacy/oauth2/oauth2)

### Bot Dota 2 / GC
- [Arcana/node-dota2](https://github.com/Arcana/node-dota2) — original
- [dotabod/node-dota2-fork](https://github.com/dotabod/node-dota2-fork) — fork ativo
- [Arcana/node-dota2-bot](https://github.com/Arcana/node-dota2-bot) — wrapper de login
- [paralin/go-dota2](https://github.com/paralin/go-dota2) — alternativa Go
- [dota2 docs PDF](https://dota2.readthedocs.io/_/downloads/en/stable/pdf/) — referência Python (mesma estrutura GC)

### APIs stats Dota 2
- [OpenDota API](https://docs.opendota.com/)
- [STRATZ API](https://stratz.com/api) (GraphQL)
- [Stratz Knowledge Base](https://stratz.com/knowledge-base/API)
- [Steam Web API Dota 2 wiki](https://wiki.teamfortress.com/wiki/WebAPI#Dota_2)

### Anti-smurf / verification
- [RestoreCord](https://restorecord.com/) — comercial
- [discord-steam-verification eggsy](https://github.com/eggsy/discord-steam-verification)

### VAC / Game Ban context
- [Steam VAC FAQ](https://help.steampowered.com/en/faqs/view/571A-97DA-70E9-FF74)
- [Dota 2 Wiki — Bans](https://dota2.fandom.com/wiki/Ban)

### Rank badges assets
- [Etsy — Dota 2 Rank Badges Herald to Immortal](https://www.etsy.com/listing/4343846539/dota-2-rank-badges-herald-to-immortal)
- [pngaaa.com — Dota 2 rank medal](https://www.pngaaa.com/detail/8168066)
- [Dota 2 Wiki — Matchmaking Seasonal Rankings](https://dota2.fandom.com/wiki/Matchmaking/Seasonal_Rankings)
- [esportsinsider — ranks explained](https://esportsinsider.com/dota-2-ranks)
