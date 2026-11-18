"use client";

// Efeitos sonoros nas configurações: liga e desliga os sons e ajusta o volume geral deles.
// Ao soltar a barra, toca o clique no volume escolhido para o jogador ouvir o resultado.

import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useMasterVolume, useMuteToggle, useSound } from "@/lib/sound/hooks";

export function SoundSettings() {
  const t = useTranslations("topbar");
  const { muted, toggleMute } = useMuteToggle();
  const { volume, setVolume } = useMasterVolume();
  const play = useSound();
  const percent = Math.round(volume * 100);

  return (
    <div className="mt-[var(--space-4)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faded">
          {t("soundEffects")}
        </p>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={!muted}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 font-display text-[12px] transition-colors",
            muted ? "text-text-muted hover:bg-bg-elevated" : "text-text-display hover:bg-bg-elevated",
          )}
        >
          {muted ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
          {muted ? t("soundOff") : t("soundOn")}
        </button>
      </div>
      <label className="flex items-center gap-3">
        <span className="sr-only">{t("soundVolume")}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          disabled={muted}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          onPointerUp={() => play("click")}
          onKeyUp={() => play("click")}
          aria-valuetext={`${percent}%`}
          className="h-1.5 w-full cursor-pointer accent-[var(--color-brand-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span className="w-10 text-right font-mono text-[12px] tabular-nums text-text-muted">{percent}%</span>
      </label>
    </div>
  );
}
