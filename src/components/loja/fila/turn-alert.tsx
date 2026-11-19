"use client";

// "Chegou a sua vez": aparece quando o Pedro chama a pessoa para a party, com o som de partida
// encontrada do próprio Dota, vibração no celular e o aviso no título da aba (quem está noutra
// aba vê). O navegador só toca som depois de um toque na página, e a compra já foi um toque.

import { cn } from "@/lib/utils";
import { CtaWarp, panel, plate } from "@/components/v2";
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
      <div className={cn(panel("neutral"), "w-full max-w-sm space-y-4 p-6 text-center shadow-[inset_0_0_0_2px_var(--color-play-primary),0_0_40px_var(--color-play-primary-glow)]")}>
        <Gamepad2 size={40} className="mx-auto text-play-primary" aria-hidden="true" />
        <p id="fila-vez-titulo" className="font-display-condensed text-[2.8rem] uppercase leading-none text-play-primary [text-shadow:0_0_18px_var(--color-play-primary-glow)]">
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
          className={plate({ kind: "cta", block: true })}
        >
          <CtaWarp />
          {t("gotIt")}
        </button>
      </div>
    </div>
  );
}
