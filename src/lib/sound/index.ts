/**
 * Sound module barrel exports — FormulaDota V2.5-F5
 *
 * Imports públicos da camada de som.
 * Components usam hooks, nunca acessam manager diretamente.
 */

// Manager singleton e tipos (server-safe — guards internos)
export { getSoundManager } from "./manager";
export type { ISoundManager, SoundLayer, PlayOptions } from "./manager";

// Sprite map
export { SPRITE_MAP, toHowlerSprite } from "./sprite-map";
export type { SoundId, SpriteEntry } from "./sprite-map";

// Hooks (client-only — "use client" declarado nos arquivos)
export {
  useSound,
  useMuteToggle,
  useVolume,
  useFirstGesture,
  useAmbient,
} from "./hooks";
