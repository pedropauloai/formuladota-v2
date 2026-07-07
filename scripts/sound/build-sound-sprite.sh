#!/usr/bin/env bash
# Reconstrói o sprite de UI do FORMULADOTA a partir dos SFX do cliente Dota 2.
#
# Fonte: scripts/sound/dota-sfx/<id>.mp3 (sons da Valve, categoria Sounds_ui).
# Saída: public/sounds/ui-sprite.{mp3,webm} + imprime o SPRITE_MAP pra colar
#        em src/lib/sound/sprite-map.ts (offsets determinísticos por slots fixos).
#
# Requer: ffmpeg no PATH (não precisa de ffprobe/audiosprite).
# Uso:    bash scripts/sound/build-sound-sprite.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
RAW="$HERE/dota-sfx"
OUT="$REPO/public/sounds"

# id | start_ms | dur_ms — slots com folga >= 150ms; sons não se sobrepõem.
ROWS=(
  "hover|0|90"
  "click|200|130"
  "confirm|400|760"
  "error|1300|210"
  "notification|1650|190"
  "reward|2000|2040"
  "match_found|4200|2750"
  "queue_start|7100|2730"
  "queue_stop|10000|1540"
  "ready_accept|11700|3520"
  "quiz_correct|15400|2110"
  "coins|17700|1630"
  "treasure|19500|3420"
  "objective|23100|3040"
  "stinger|26300|1510"
)

inputs=(); filter=""; labels=""; i=0
for row in "${ROWS[@]}"; do
  IFS='|' read -r id start dur <<< "$row"
  inputs+=(-i "$RAW/$id.mp3")
  filter+="[$i]adelay=${start}:all=1[a$i];"
  labels+="[a$i]"
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
for row in "${ROWS[@]}"; do
  IFS='|' read -r id s d <<< "$row"
  echo "  $id: { start: $s, duration: $d },"
done
