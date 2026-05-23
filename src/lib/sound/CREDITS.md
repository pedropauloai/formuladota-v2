# SFX Credits — FORMULADOTA V2.5-F5

## Estado atual: STUBS SILENCIOSOS

Os arquivos em `public/sounds/ui-sprite.{webm,mp3}` são stubs silenciosos gerados
automaticamente via ffmpeg em 2026-05-23. O sprite map está correto e o sistema de som
está funcional — mas os sons são silêncio puro.

## TODO: Curadoria SFX Freesound CC0

Pedro precisa curar 6 SFX reais no Freesound (https://freesound.org) seguindo os critérios
documentados em `docs/foundations/SOUND_SYSTEM.md § 5`:

| ID | Descrição | Duração ideal | Queries de busca |
|----|-----------|---------------|-----------------|
| hover | Micro-feedback de presença | 80-100ms | "ui hover subtle dark", "swoosh short ui" |
| click | Confirmação de ação | 100-150ms | "button click sci-fi dark", "click metal dark" |
| confirm | Sucesso de ação | 300-400ms | "chime short ascending", "positive chime dark" |
| error | Falha sem alarmar | 250-350ms | "descending tone soft", "ui error subtle" |
| notification | Alerta não-crítico | 500-700ms | "bell warm short", "notification bell dark" |
| reward | Celebração | 800-1200ms | "ui reward chime", "achievement short fantasy" |

### Filtros obrigatórios no Freesound

- **Licença**: CC0 1.0 Universal apenas (verificar diretamente na página, não confiar em filtro)
- **Duração**: conforme tabela acima
- **Rating**: 4.0+ estrelas
- **Downloads**: 500+ como proxy de qualidade

### Processo após curadoria

1. Salvar 6 WAV em `assets/sfx-raw/` (criar pasta — não é versionada no git)
2. Gerar sprite:
   ```bash
   npx audiosprite \
     --output public/sounds/ui-sprite \
     --format howler2 \
     --export webm,mp3 \
     --gap 0.1 \
     assets/sfx-raw/hover.wav \
     assets/sfx-raw/click.wav \
     assets/sfx-raw/confirm.wav \
     assets/sfx-raw/error.wav \
     assets/sfx-raw/notification.wav \
     assets/sfx-raw/reward.wav
   ```
3. Atualizar offsets em `src/lib/sound/sprite-map.ts` com os valores do JSON gerado
4. Preencher tabela de atribuição abaixo
5. Adicionar "CC0 SFX: Freesound.org" no footer (DF8.5)

## Tabela de Atribuição (preencher após curadoria real)

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
