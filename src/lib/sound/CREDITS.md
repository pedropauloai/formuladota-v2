# SFX Credits — FORMULADOTA

## Estado atual: SFX DO CLIENTE DOTA 2 (VALVE)

Os arquivos em `public/sounds/ui-sprite.{webm,mp3}` são um **sprite montado a partir
dos sons de UI reais do cliente Dota 2** (categoria `Sounds_ui` da dota2 wiki /
Liquipedia Commons). A escolha foi INTENCIONAL do Pedro (2026-07-07): usar os sons
reais do jogo traz **familiaridade imediata** ao jogador de Dota 2 — o "partida
encontrada", o "deny", o "ding" do tutorial são reconhecíveis na hora.

- **Fonte**: cliente oficial de Dota 2 (Valve Corporation).
- **Data de montagem**: 2026-07-07
- **Ferramenta**: ffmpeg 8.0 (`adelay` + `amix`, sem audiosprite).
- **Reprodução**: `bash scripts/sound/build-sound-sprite.sh` (fontes versionados em
  `scripts/sound/dota-sfx/<id>.mp3`).

### ⚠️ Nota de licença / direitos (importante)

Estes sons são **propriedade da Valve**. Sites de comunidade de Dota (Dotabuff,
OpenDota, GamersClub) usam assets da Valve amplamente e a Valve é permissiva com
fan content — mas o FORMULADOTA é **monetizado**, o que sai do "fan content puro".
O risco prático é **baixo, não-zero**. Decisão do Pedro: usar assim mesmo, por ser
**reversível** — se algum dia chegar qualquer notificação de direitos, basta regerar
o sprite com sons próprios/royalty-free (o mapa de IDs e a API do SoundManager NÃO
mudam; nenhum componente precisa ser tocado). Ver `docs/foundations/SOUND_SYSTEM.md`.

## Mapa arquivo (Valve) → ID → evento na plataforma

| ID           | Arquivo Sounds_ui (Valve)   | Layer       | Dispara em |
|--------------|-----------------------------|-------------|------------|
| hover        | `Ui_buttonrollover.mp3`     | interaction | hover de botão/card (`<Button>`, `<Card>`) |
| click        | `Ui_buttonclick.mp3`        | interaction | click de botão/card |
| confirm      | `Ui_quickbuy_confirm.mp3`   | interaction | ação confirmada (toast success) |
| error        | `Ui_ui_general_deny.mp3`    | interaction | erro/bloqueio; quiz errado (o "deny" do Dota) |
| notification | `Ui_ui_msg_received_team.mp3`| interaction | mensagem/aviso (chat, banners, toasts info) |
| reward       | `Ui_levelup.mp3`            | **reward**  | conquista genérica; ganhou permissão; takeover |
| match_found  | `Ui_ui_findmatch_found_01.mp3`| **reward** | ready check "PARTIDA ENCONTRADA" |
| queue_start  | `Ui_ui_findmatch_search_01.mp3`| interaction| entrou na fila |
| queue_stop   | `Ui_ui_findmatch_quit_01.mp3`| interaction | saiu da fila |
| ready_accept | `Ui_ready_check_yes.mp3`    | interaction | aceitou a partida |
| quiz_correct | `Ui_tutorial_ui_ding_01.mp3`| interaction | acertou questão do quiz |
| coins        | `Ui_coins.mp3`              | **reward**  | crédito de saldo/ficha *(reservado — sem gancho client hoje)* |
| treasure     | `Ui_treasure_01.mp3`        | **reward**  | equipou cosmético; abrir baú futuro |
| objective    | `Ui_npe_objective_complete.mp3`| **reward**| concluiu lição/pilar do quiz |
| stinger      | `Ui_tutorial_fanfare.mp3`   | **reward**  | virou doutrinado (nível 6) — grande marco |

`coins` está no sprite mas **ainda sem gancho** no client (o crédito de saldo/PIX é
server-side via webhook). Fica pronto pra quando existir uma tela client de "recebeu
ficha" (ver `docs/foundations/SOUND_SYSTEM.md`).

## Offsets do sprite

Ver `SPRITE_MAP` em `src/lib/sound/sprite-map.ts` — gerado pelo script de build.
Não editar à mão; regerar o sprite e colar os valores impressos pelo script.

## Como trocar um som

1. Baixar/produzir o novo `<id>.mp3` e sobrescrever `scripts/sound/dota-sfx/<id>.mp3`.
2. Rodar `bash scripts/sound/build-sound-sprite.sh`.
3. Colar o `SPRITE_MAP` impresso em `src/lib/sound/sprite-map.ts` (as durações mudam
   conforme o som novo).
4. Commit de `public/sounds/ui-sprite.{mp3,webm}` + `sprite-map.ts`.

---

*Atualizado em: 2026-07-07 — síntese ffmpeg substituída pelos SFX reais do cliente Dota 2.*
