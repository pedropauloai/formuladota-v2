/**
 * Sprite map FormulaDota — 6 SFX UI canônicos.
 *
 * Offsets em ms [start, duration]. Sincronizado com public/sounds/ui-sprite.{webm,mp3}.
 *
 * Estrutura do sprite (total ~3300ms):
 *   [0      ] hover        — 0 a 100ms     (100ms)
 *   [200    ] click        — 200 a 350ms   (150ms)
 *   [500    ] confirm      — 500 a 900ms   (400ms)
 *   [1000   ] error        — 1000 a 1350ms (350ms)
 *   [1500   ] notification — 1500 a 2100ms (600ms)
 *   [2300   ] reward       — 2300 a 3500ms (1200ms)
 *
 * IMPORTANTE: estes offsets são placeholders sincronizados com o sprite stub gerado
 * via ffmpeg em V2.5-F5. Para regenerar com SFX reais curados do Freesound:
 *
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
  /** Micro-feedback de presença — 100ms, discreto */
  hover: { start: 0, duration: 100 },
  /** Confirmação de ação iniciada — 150ms, tap sólido */
  click: { start: 200, duration: 150 },
  /** Feedback de sucesso — 400ms, chime ascendente */
  confirm: { start: 500, duration: 400 },
  /** Sinal de falha — 350ms, tom descendente suave */
  error: { start: 1000, duration: 350 },
  /** Alerta de evento não-crítico — 600ms, bell warm */
  notification: { start: 1500, duration: 600 },
  /** Celebração de conquista — 1200ms, chime com sustain */
  reward: { start: 2300, duration: 1200 },
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
