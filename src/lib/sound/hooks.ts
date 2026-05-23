"use client";
/**
 * Hooks de Som — FormulaDota V2.5-F5
 *
 * Todos os acessos ao SoundManager por componentes devem usar estes hooks.
 * Nunca importar getSoundManager() diretamente em componentes (regra C16).
 *
 * Hooks disponíveis:
 *   - useSound()       — retorna callback play(id) para SFX pontuais
 *   - useMuteToggle()  — estado de mute + toggle com persistência localStorage
 *   - useFirstGesture()— retorna true após primeiro gesto do usuário
 *   - useAmbient()     — stub para ambient layer (implementação completa em fase futura)
 *
 * Documentação: docs/foundations/SOUND_SYSTEM.md § 8 (Mobile Autoplay Constraints)
 */

import { useCallback, useEffect, useState } from "react";
import { getSoundManager, type SoundLayer, type PlayOptions } from "./manager";
import type { SoundId } from "./sprite-map";

// Re-export de tipos para conveniência dos componentes
export type { SoundId, PlayOptions, SoundLayer };

/**
 * Hook principal de som — retorna callback estável para reproduzir SFX.
 *
 * Uso:
 *   const play = useSound()
 *   <button onMouseEnter={() => play('hover')} onClick={() => play('click')}>
 *
 * O callback é memoizado (useCallback) — seguro para deps de useEffect.
 * No-op silencioso se muted ou antes do primeiro gesto (mobile gate).
 */
export function useSound(): (id: SoundId, opts?: PlayOptions) => void {
  return useCallback((id: SoundId, opts?: PlayOptions) => {
    getSoundManager().play(id, opts);
  }, []);
}

/**
 * Hook de mute toggle com persistência localStorage.
 *
 * Retorna:
 *   - muted: boolean — estado atual de mute
 *   - toggleMute: () => void — alterna mute e persiste em fd-sound-muted
 *
 * O estado é inicializado a partir do localStorage no mount (SSR-safe).
 */
export function useMuteToggle(): {
  muted: boolean;
  toggleMute: () => void;
} {
  // Inicializar com valor do localStorage (lazy initializer evita re-render)
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return getSoundManager().getMuted();
  });

  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    getSoundManager().setMuted(newMuted);
    setMuted(newMuted);
  }, [muted]);

  return { muted, toggleMute };
}

/**
 * Hook de volume por layer.
 *
 * Retorna:
 *   - volume: number (0.0-1.0)
 *   - setVolume: (value: number) => void — persiste em localStorage
 */
export function useVolume(layer: SoundLayer): {
  volume: number;
  setVolume: (value: number) => void;
} {
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return 0.6;
    return getSoundManager().getVolume(layer);
  });

  const setVolume = useCallback(
    (value: number) => {
      getSoundManager().setVolume(layer, value);
      setVolumeState(Math.max(0, Math.min(1, value)));
    },
    [layer]
  );

  return { volume, setVolume };
}

/**
 * Hook de primeiro gesto — mobile autoplay gate.
 *
 * Retorna true após o usuário realizar o primeiro click ou touchstart.
 * Usado internamente pelo SoundProvider para chamar getSoundManager().init().
 *
 * Documentação: docs/foundations/SOUND_SYSTEM.md § 8
 */
export function useFirstGesture(): boolean {
  const [gestureReceived, setGestureReceived] = useState<boolean>(false);

  useEffect(() => {
    // Se já foi inicializado (ex: hook montado tarde), atualizar estado de forma assíncrona
    if (getSoundManager().isInitialized()) {
      // Usar setTimeout para evitar setState síncrono dentro do effect
      const id = setTimeout(() => setGestureReceived(true), 0);
      return () => clearTimeout(id);
    }

    const handler = () => {
      getSoundManager().init();
      setGestureReceived(true);
    };

    // { once: true } remove o listener após o primeiro disparo
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });

    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  return gestureReceived;
}

/**
 * Hook de ambient — stub para ambient layer.
 *
 * Implementação completa planejada para fase posterior (tracks longas
 * carregadas sob demanda com crossfade de 5-10s).
 *
 * Por ora, aguarda o gesto do usuário e registra a intenção de reproduzir.
 * Sem efeito audível — infrastructure ready, asset pendente.
 *
 * Documentação: docs/foundations/SOUND_SYSTEM.md § 6 (Layers Separation)
 */
export function useAmbient(_track: string): void {
  const gestureReceived = useFirstGesture();

  useEffect(() => {
    if (!gestureReceived) return;
    // TODO V2.5-F5+: carregar track ambient e iniciar crossfade
    // getSoundManager().playAmbient(_track)
    // return () => getSoundManager().stopAmbient()
  }, [gestureReceived, _track]);
}
