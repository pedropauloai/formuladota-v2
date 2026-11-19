"use client";

// "Chegou a sua vez": aparece quando o Pedro chama a pessoa para a party, com o som de partida
// encontrada do próprio Dota, vibração no celular e o aviso no título da aba (quem está noutra
// aba vê). O navegador só toca som depois de um toque na página, e a compra já foi um toque.

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Gamepad2 } from "lucide-react";
import { useSound } from "@/lib/sound/hooks";

export function TurnAlert({ dotaId, onClose }: { dotaId: string | null; onClose: () => void }) {
  const t = useTranslations("fila");
  const play = useSound();
  const button = useRef<HTMLButtonElement>(null);
  const title = t("calledTitle");

  useEffect(() => {
    play("match_found");
    try {
      navigator.vibrate?.([300, 120, 300]);
    } catch {
      // Sem vibração (computador ou navegador que não deixa): o aviso na tela basta.
    }
    const original = document.title;
    document.title = `${title} | FORMULADOTA`;
    button.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.title = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [play, title, onClose]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fila-vez-titulo"
      aria-describedby="fila-vez-texto"
      data-fila-aviso
      className="fixed inset-0 z-[var(--z-system)] flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-sm space-y-4 rounded-md border-2 border-play-primary bg-bg-deep p-6 text-center shadow-2xl shadow-[var(--color-play-primary-glow)]">
        <Gamepad2 size={40} className="mx-auto text-play-primary" aria-hidden="true" />
        <p id="fila-vez-titulo" className="font-display text-4xl uppercase leading-none tracking-wide text-play-primary">
          {title}
        </p>
        <p id="fila-vez-texto" className="text-base leading-relaxed text-text-body">
          {t("calledText")}
        </p>
        {dotaId && <p className="text-sm text-text-muted">{t("dotaId", { id: dotaId })}</p>}
        <button
          ref={button}
          type="button"
          onClick={onClose}
          className="w-full rounded-sm bg-play-primary px-4 py-3 font-display text-lg uppercase tracking-widest text-bg-deep hover:bg-play-primary-hover"
        >
          {t("gotIt")}
        </button>
      </div>
    </div>
  );
}
