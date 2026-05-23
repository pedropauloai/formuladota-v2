"use client";
/**
 * SoundProvider — Client Component montado no root layout.
 *
 * Responsabilidades:
 *   1. Carrega o sprite de 6 SFX no mount (um único request HTTP)
 *   2. Registra listeners de primeiro gesto para mobile autoplay gate
 *   3. Inicializa AudioContext após o gesto ser detectado
 *
 * Posição no layout: direto dentro de <body>, wrapping todos os children.
 * Não renderiza nenhum elemento visual — transparente no DOM.
 *
 * Documentação: docs/foundations/SOUND_SYSTEM.md § 9 (Sprite Sheet)
 */

import { useEffect } from "react";
import { getSoundManager } from "@/lib/sound/manager";
import { useFirstGesture } from "@/lib/sound/hooks";

interface SoundProviderProps {
  children: React.ReactNode;
}

export function SoundProvider({ children }: SoundProviderProps) {
  // Registra listeners de primeiro gesto e inicializa AudioContext
  const gestureReceived = useFirstGesture();

  // Carrega o sprite no mount — um request, 6 SFX disponíveis
  useEffect(() => {
    const manager = getSoundManager();
    void manager.loadSprite(
      "/sounds/ui-sprite.webm",
      "/sounds/ui-sprite.mp3"
    );
  }, []);

  // Log informativo apenas em dev — confirma que o AudioContext foi ativado
  useEffect(() => {
    if (gestureReceived && process.env.NODE_ENV === "development") {
      console.info("[SoundProvider] AudioContext inicializado após primeiro gesto.");
    }
  }, [gestureReceived]);

  return <>{children}</>;
}
