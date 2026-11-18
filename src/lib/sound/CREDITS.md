# SFX Credits — FORMULADOTA

## Estado atual: SONS ORIGINAIS DO CLIENTE DOTA 2 (VALVE)

Os arquivos em `public/sounds/ui-sprite.{webm,mp3}` são um **sprite montado com os sons de
interface tirados do próprio jogo**: o `pak01_dir.vpk` da instalação do Dota 2, lido com o
pacote `vpk` do Python. Os `.vsnd_c` de interface guardam PCM de 16 bits a 44,1 kHz, e a
extração para FLAC não perde nada.

- **Fonte**: cliente oficial de Dota 2 (Valve Corporation), arquivos `sounds/ui/...`.
- **Data da extração**: 18/11/2026. A versão anterior (07/07/2026) veio de MP3 da wiki
  (categoria `Sounds_ui`). Eram sons da era Source 1, como o estalo seco de 0,05 s no hover,
  e o Pedro reclamou do barulho.
- **Como cada som foi escolhido**: pelo evento que o cliente toca no mesmo momento. O nome
  do evento sai do código do jogo (`client.dll`) ou dos estilos do menu (Panorama,
  `panorama/styles/*.vcss_c`), e o arquivo `.vsnd` tem o mesmo nome do evento.
- **Reprodução**: `bash scripts/sound/build-sound-sprite.sh` (fontes em
  `scripts/sound/dota-sfx/<id>.flac`; `match_found.mp3` já vem em MP3 dentro do jogo).

### Nota de licença / direitos (importante)

Estes sons são **propriedade da Valve**. Sites de comunidade de Dota (Dotabuff,
OpenDota, GamersClub) usam assets da Valve amplamente e a Valve é permissiva com
fan content, mas o FORMULADOTA é **monetizado**, o que sai do "fan content puro".
O risco prático é **baixo, não-zero**. Decisão do Pedro (07/07/2026): usar assim mesmo, por ser
**reversível**. Se algum dia chegar qualquer notificação de direitos, basta regerar
o sprite com sons próprios ou royalty-free: o mapa de IDs e a API do SoundManager não
mudam, e nenhum componente precisa ser tocado. Ver `docs/foundations/SOUND_SYSTEM.md`.

## Mapa arquivo (Valve) → ID → evento na plataforma

| ID | Arquivo no jogo (`sounds/ui/...`) | Evento do Dota e onde ele aparece | Layer | Dispara em |
|---|---|---|---|---|
| hover | `panorama/panorama_rollover_micro_01` | `ui_rollover_micro` (estilo do dashboard) | interaction | **reservado**: no Dota, botão comum não soa no hover |
| click | `panorama/panorama_generic_button_click_01` | `ui_generic_button_click` (client.dll e 58 estilos) | interaction | clique de botão/card |
| tab | `panorama/panorama_topmenu_select_01` | `ui_topmenu_select` (client.dll) e `ui_topmenu_activate` (`.TopBarMenuItem:selected`) | interaction | troca de aba no topo |
| confirm | `quickbuy_confirm` | compra confirmada no jogo | interaction | ação confirmada (toast success) |
| error | `deny_general` | o "deny" do jogo | interaction | erro/bloqueio; quiz errado |
| notification | `panorama/panorama_chat_message_rec_01` | `ui_chat_msg_rec` (client.dll) | interaction | mensagem/aviso |
| reward | `levelup` | subir de nível | **reward** | conquista genérica |
| match_found | `stingers/match_ready` | o stinger do aceite (confirmado pelo Pedro em 07/2026) | **reward** | ready check "PARTIDA ENCONTRADA" |
| queue_start | `menu/matchmaking_find` | `ui.matchmaking_find` (client.dll) | interaction | entrou na fila |
| queue_stop | `menu/matchmaking_cancel` | `ui.matchmaking_cancel` (client.dll) | interaction | saiu da fila |
| ready_accept | `ready_check_yes` | aceitar a partida | interaction | aceitou a partida |
| quiz_correct | `tutorial_ui_ding_01` | acerto no tutorial | interaction | acertou questão do quiz |
| objective | `npe_objective_complete` | objetivo concluído no tutorial | **reward** | concluiu lição/pilar do quiz |
| coins | `coins` | ouro | **reward** | crédito de saldo *(reservado)* |
| treasure | `treasure_01` | baú | **reward** | equipou cosmético |
| stinger | `tutorial_fanfare` | fim do tutorial | **reward** | virou doutrinado (nível 6) |

O volume geral dos efeitos (0 a 100%) e o mudo ficam nas configurações (engrenagem do topo) e
são guardados no navegador (`fd-sound-volume-master`, `fd-sound-muted`).

## Offsets do sprite

Ver `SPRITE_MAP` em `src/lib/sound/sprite-map.ts` — gerado pelo script de build.
Não editar à mão; regerar o sprite e colar os valores impressos pelo script.

## Como trocar um som

1. Pôr o novo `<id>.flac` (ou `.wav`/`.mp3`) em `scripts/sound/dota-sfx/`. Para um som do jogo, o `.vsnd_c` é PCM 16 bits: o bloco DATA traz o número de amostras e a duração.
2. Rodar `bash scripts/sound/build-sound-sprite.sh`.
3. Colar o `SPRITE_MAP` impresso em `src/lib/sound/sprite-map.ts` (as durações mudam
   conforme o som novo).
4. Commit de `public/sounds/ui-sprite.{mp3,webm}` + `sprite-map.ts`.

---

*Atualizado em 18/11/2026: sons extraídos do próprio jogo, sem som de hover nos botões, som de aba no topo e volume nas configurações.*
