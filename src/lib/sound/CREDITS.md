# SFX Credits — FORMULADOTA V2.5-F5

## Estado atual: SFX SINTETIZADOS VIA FFMPEG

Os arquivos em `public/sounds/ui-sprite.{webm,mp3}` contêm **6 SFX reais sintetizados
matematicamente via ffmpeg**. Não são mais stubs silenciosos.

- **Licença**: domínio público — síntese matemática pura, sem source CC0 derivado.
  Nenhum som foi copiado ou derivado de obra de terceiros. Os sons são gerados
  diretamente por algoritmos de síntese (geradores de ruído + osciladores de seno
  com envelopes) disponíveis no ffmpeg lavfi.
- **Data de geração**: 2026-05-23
- **Versão ffmpeg**: 8.0-essentials_build

## Duração e offsets reais (sprite total: ~3810ms)

| SFX ID       | Start (ms) | Duração (ms) | Técnica de síntese                                   |
|--------------|-----------|-------------|------------------------------------------------------|
| hover        | 0         | 120         | Pink noise → highpass 1800Hz → lowpass 6500Hz, fade |
| click        | 270       | 90          | Sine 180Hz + white noise highpass 3500Hz, transient  |
| confirm      | 510       | 460         | Dois sines: E5 (659Hz) → A5 (880Hz), ascending chime|
| error        | 1120      | 390         | Dois sines: A4 (440Hz) → E4 (330Hz), lowpass 2kHz  |
| notification | 1660      | 600         | Três sines: C5 523Hz + 1046Hz + 1570Hz (singing bowl)|
| reward       | 2410      | 1400        | Quatro sines: Lá maior A4→C#5→E5→A5 arpeggio       |

*Gaps de 150ms de silêncio entre cada SFX.*

## Receitas ffmpeg (reproduzíveis)

### hover (120ms)
```bash
ffmpeg -y -f lavfi -i "anoisesrc=duration=0.12:color=pink:amplitude=0.15" \
  -af "highpass=f=1800,lowpass=f=6500,volume=0.6,afade=t=in:d=0.02:curve=tri,afade=t=out:d=0.06:curve=exp" \
  -ar 44100 -ac 2 sfx-hover.wav
```

### click (90ms)
```bash
ffmpeg -y \
  -f lavfi -i "sine=frequency=180:duration=0.09" \
  -f lavfi -i "anoisesrc=duration=0.04:color=white:amplitude=0.4" \
  -filter_complex "[1]highpass=f=3500,volume=0.5[noise];[0]volume=0.4,afade=t=in:d=0.005,afade=t=out:d=0.07:curve=exp[punch];[noise][punch]amix=inputs=2:duration=longest:normalize=0,afade=t=out:d=0.02" \
  -ar 44100 -ac 2 sfx-click.wav
```

### confirm (460ms)
```bash
ffmpeg -y \
  -f lavfi -i "sine=frequency=659:duration=0.18" \
  -f lavfi -i "sine=frequency=880:duration=0.32" \
  -filter_complex "[0]volume=0.35,afade=t=in:d=0.02,afade=t=out:d=0.16:curve=exp[a];[1]adelay=140|140,volume=0.4,afade=t=in:d=0.04,afade=t=out:d=0.25:curve=exp[b];[a][b]amix=inputs=2:duration=longest:normalize=0" \
  -ar 44100 -ac 2 sfx-confirm.wav
```

### error (390ms)
```bash
ffmpeg -y \
  -f lavfi -i "sine=frequency=440:duration=0.15" \
  -f lavfi -i "sine=frequency=330:duration=0.28" \
  -filter_complex "[0]volume=0.4,afade=t=in:d=0.02,afade=t=out:d=0.14:curve=exp[a];[1]adelay=110|110,volume=0.45,afade=t=in:d=0.04,afade=t=out:d=0.22:curve=exp[b];[a][b]amix=inputs=2:duration=longest:normalize=0,lowpass=f=2000" \
  -ar 44100 -ac 2 sfx-error.wav
```

### notification (600ms)
```bash
ffmpeg -y \
  -f lavfi -i "sine=frequency=523:duration=0.6" \
  -f lavfi -i "sine=frequency=1046:duration=0.6" \
  -f lavfi -i "sine=frequency=1570:duration=0.6" \
  -filter_complex "[0]volume=0.5,afade=t=in:d=0.01,afade=t=out:d=0.58:curve=exp[a];[1]volume=0.25,afade=t=in:d=0.01,afade=t=out:d=0.5:curve=exp[b];[2]volume=0.12,afade=t=in:d=0.01,afade=t=out:d=0.4:curve=exp[c];[a][b][c]amix=inputs=3:duration=longest:normalize=0" \
  -ar 44100 -ac 2 sfx-notification.wav
```

### reward (1400ms)
```bash
ffmpeg -y \
  -f lavfi -i "sine=frequency=440:duration=1.1" \
  -f lavfi -i "sine=frequency=554:duration=1.0" \
  -f lavfi -i "sine=frequency=659:duration=0.9" \
  -f lavfi -i "sine=frequency=880:duration=0.8" \
  -filter_complex "[0]volume=0.35,afade=t=in:d=0.02,afade=t=out:d=1.0:curve=exp[a];[1]adelay=200|200,volume=0.35,afade=t=in:d=0.02,afade=t=out:d=0.9:curve=exp[b];[2]adelay=400|400,volume=0.4,afade=t=in:d=0.02,afade=t=out:d=0.8:curve=exp[c];[3]adelay=600|600,volume=0.5,afade=t=in:d=0.02,afade=t=out:d=0.6:curve=exp[d];[a][b][c][d]amix=inputs=4:duration=longest:normalize=0" \
  -ar 44100 -ac 2 sfx-reward.wav
```

### Sprite final (concatenar com gaps de 150ms)
```bash
ffmpeg -y -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t 0.15 gap.wav

ffmpeg -y \
  -i sfx-hover.wav -i gap.wav \
  -i sfx-click.wav -i gap.wav \
  -i sfx-confirm.wav -i gap.wav \
  -i sfx-error.wav -i gap.wav \
  -i sfx-notification.wav -i gap.wav \
  -i sfx-reward.wav \
  -filter_complex "[0][1][2][3][4][5][6][7][8][9][10]concat=n=11:v=0:a=1[out]" \
  -map "[out]" -ar 44100 -ac 2 ui-sprite-full.wav

# WebM
ffmpeg -y -i ui-sprite-full.wav -c:a libvorbis -qscale:a 4 -ar 44100 -ac 2 ui-sprite.webm

# MP3
ffmpeg -y -i ui-sprite-full.wav -c:a libmp3lame -qscale:a 3 -ar 44100 -ac 2 ui-sprite.mp3
```

## Substituição por sons curados (opcional — futuro)

Pedro pode substituir estes sons sintetizados por sons curados do Freesound CC0 a qualquer momento
**sem refactor de código** — o sprite map e a API do SoundManager continuam iguais. Basta:

1. Curar 6 WAV no Freesound seguindo critérios de `docs/foundations/SOUND_SYSTEM.md § 5`
2. Salvar em `assets/sfx-raw/` (não versionado)
3. Gerar novo sprite via `audiosprite` ou pelas receitas ffmpeg acima
4. Atualizar offsets em `src/lib/sound/sprite-map.ts`
5. Preencher tabela de atribuição abaixo com metadados do Freesound

## Tabela de Atribuição Freesound (preencher após curadoria real)

| SFX ID | Nome no Freesound | ID Freesound | Autor | URL | Licença |
|--------|------------------|--------------|-------|-----|---------|
| hover | — | — | — | — | — |
| click | — | — | — | — | — |
| confirm | — | — | — | — | — |
| error | — | — | — | — | — |
| notification | — | — | — | — | — |
| reward | — | — | — | — | — |

---

*Gerado em: 2026-05-23 durante V2.5-F5 Sound Infrastructure*
*Milestone: V2.5 Design Foundations*
*Atualizado em: 2026-05-23 — stubs silenciosos substituídos por síntese ffmpeg*
