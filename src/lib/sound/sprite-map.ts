/**
 * Sprite map FormulaDota — 6 SFX UI canônicos.
 *
 * Offsets em ms [start, duration]. Sincronizado com public/sounds/ui-sprite.{webm,mp3}.
 *
 * Estrutura do sprite (total ~3810ms, gaps de 150ms entre SFX):
 *   [0    ] hover        — 0 a 120ms      (120ms) — pink noise highpass/lowpass whoosh
 *   [270  ] click        — 270 a 360ms    (90ms)  — sine 180Hz + white noise transient
 *   [510  ] confirm      — 510 a 970ms    (460ms) — E5(659Hz) → A5(880Hz) ascending chime
 *   [1120 ] error        — 1120 a 1510ms  (390ms) — A4(440Hz) → E4(330Hz) descending tone
 *   [1660 ] notification — 1660 a 2260ms  (600ms) — C5(523Hz) + harmônicos singing bowl
 *   [2410 ] reward       — 2410 a 3810ms  (1400ms)— Lá maior arpeggio A4→C#5→E5→A5
 *
 * Sprite sintetizado via ffmpeg (receitas reproduzíveis em docs/foundations/SOUND_SYSTEM.md § 11).
 * Licença: domínio público — síntese matemática pura, sem source CC0 derivado.
 *
 * Para substituir por SFX curados do Freesound CC0 no futuro:
 *   1. Salvar 6 WAV curados em assets/sfx-raw/ (hover.wav, click.wav, etc.)
 *   2. Gerar via audiosprite:
 *      audiosprite --output public/sounds/ui-sprite --format howler2 \
 *        --export webm,mp3 --gap 0.1 assets/sfx-raw/*.wav
 *   3. Atualizar offsets abaixo com os valores do JSON gerado.
 *
 * Documentação completa: docs/foundations/SOUND_SYSTEM.md § 9
 */

export type SoundId =
  | "hover"
  | "click"
  | "confirm"
  | "error"
  | "notification"
  | "reward";

export interface SpriteEntry {
  /** Offset em ms onde o SFX começa no sprite */
  start: number;
  /** Duração em ms */
  duration: number;
}

/**
 * Mapa de sprites canônico — consumido pelo HowlerSoundManager em manager.ts.
 * Formato Howler: { id: [start_ms, duration_ms] }
 */
export const SPRITE_MAP: Record<SoundId, SpriteEntry> = {
  /** Micro-feedback de presença — 120ms, pink noise filtrado (whoosh aéreo sutil) */
  hover: { start: 0, duration: 120 },
  /** Confirmação de ação iniciada — 90ms, sine 180Hz + white noise transient */
  click: { start: 270, duration: 90 },
  /** Feedback de sucesso — 460ms, chime ascendente E5→A5 (659→880Hz) */
  confirm: { start: 510, duration: 460 },
  /** Sinal de falha — 390ms, tom descendente A4→E4 (440→330Hz), lowpass 2kHz */
  error: { start: 1120, duration: 390 },
  /** Alerta de evento não-crítico — 600ms, sino harmônico C5 + overtones (singing bowl) */
  notification: { start: 1660, duration: 600 },
  /** Celebração de conquista — 1400ms, arpeggio Lá maior A4→C#5→E5→A5 */
  reward: { start: 2410, duration: 1400 },
};

/**
 * Converte SPRITE_MAP para o formato nativo do Howler.
 * Usado internamente pelo manager ao instanciar o Howl.
 */
export function toHowlerSprite(): Record<string, [number, number]> {
  const result: Record<string, [number, number]> = {};
  for (const [id, entry] of Object.entries(SPRITE_MAP)) {
    result[id] = [entry.start, entry.duration];
  }
  return result;
}
