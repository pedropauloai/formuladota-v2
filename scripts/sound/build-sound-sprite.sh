#!/usr/bin/env bash
# Reconstrói o sprite de UI do FORMULADOTA a partir dos SFX do cliente Dota 2.
#
# Fonte: scripts/sound/dota-sfx/<id>.flac (ou .wav/.mp3), extraídos do próprio jogo
# (pak01_dir.vpk da instalação do Dota 2). Mapa arquivo -> evento em src/lib/sound/CREDITS.md.
# Saída: public/sounds/ui-sprite.{mp3,webm} + imprime o SPRITE_MAP pra colar
#        em src/lib/sound/sprite-map.ts.
#
# Os offsets são CALCULADOS automaticamente a partir da duração real de cada mp3
# (via ffmpeg): cada slot = duração + MARGIN, com GAP de silêncio entre eles.
# Assim, ao trocar um som por outro de duração diferente, é só rodar de novo —
# nunca precisa recalcular offset à mão.
#
# Requer: ffmpeg no PATH (usa a duração impressa no stderr; não precisa ffprobe).
# Uso:    bash scripts/sound/build-sound-sprite.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
RAW="$HERE/dota-sfx"
OUT="$REPO/public/sounds"

MARGIN=40   # ms de folga no fim de cada som (evita corte)
GAP=150     # ms de silêncio entre sons

# ORDEM dos IDs no sprite (a mesma lista de src/lib/sound/sprite-map.ts).
IDS=(hover click tab confirm error notification reward \
     match_found queue_start queue_stop ready_accept \
     quiz_correct objective coins treasure stinger)

# Fonte de cada id: o primeiro que existir entre .flac (sem perda), .wav e .mp3.
src_of() {
  local ext
  for ext in flac wav mp3; do
    if [ -f "$RAW/$1.$ext" ]; then echo "$RAW/$1.$ext"; return; fi
  done
  echo "faltou a fonte de $1 em $RAW" >&2
  exit 1
}

# Lê a duração (ms) de um arquivo de áudio a partir do "Duration: HH:MM:SS.ss" do ffmpeg.
dur_ms() {
  local d; d=$(ffmpeg -i "$1" 2>&1 | grep -o 'Duration: [0-9:.]*' | head -1 | sed 's/Duration: //')
  local h=${d%%:*}; local rest=${d#*:}; local m=${rest%%:*}; local s=${rest#*:}
  awk -v h="$h" -v m="$m" -v s="$s" 'BEGIN{printf "%d", (h*3600+m*60+s)*1000}'
}

inputs=(); filter=""; labels=""; i=0; start=0
declare -a MAP_LINES
for id in "${IDS[@]}"; do
  src=$(src_of "$id")
  real=$(dur_ms "$src")
  slot=$((real + MARGIN))
  inputs+=(-i "$src")
  filter+="[$i]adelay=${start}:all=1[a$i];"
  labels+="[a$i]"
  MAP_LINES+=("  $id: { start: $start, duration: $slot },")
  start=$((start + slot + GAP))
  i=$((i+1))
done
filter+="${labels}amix=inputs=${i}:normalize=0[out]"

echo "=== ui-sprite.mp3 ==="
ffmpeg -y -hide_banner -loglevel error "${inputs[@]}" \
  -filter_complex "$filter" -map "[out]" \
  -ac 1 -ar 44100 -c:a libmp3lame -q:a 5 "$OUT/ui-sprite.mp3"

echo "=== ui-sprite.webm ==="
ffmpeg -y -hide_banner -loglevel error "${inputs[@]}" \
  -filter_complex "$filter" -map "[out]" \
  -ac 1 -ar 48000 -c:a libopus -b:a 72k "$OUT/ui-sprite.webm"

ls -la "$OUT/ui-sprite.mp3" "$OUT/ui-sprite.webm"

echo "=== cole em src/lib/sound/sprite-map.ts (SPRITE_MAP) ==="
printf '%s\n' "${MAP_LINES[@]}"
