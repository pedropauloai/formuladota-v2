"use client";

// Aba em placa do topbar. Fica no navegador só para tocar o som de troca de aba do cliente do
// Dota (ui_topmenu_select) quando o jogador vai para outra aba.

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import styles from "./top-bar.module.css";

export function PlateTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  const play = useSound();
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={() => {
        if (!active) play("tab");
      }}
      // Teko na nav (2026-06-11): 18px de Teko equivalem a uns 14px de Ubuntu pela altura-x baixa.
      // Entre 1024 e 1279px cai para 16px para as abas caberem ao lado dos atalhos do logado.
      className={cn(
        styles.plate,
        styles.tab,
        "font-display-condensed text-base leading-none font-medium uppercase tracking-[0.08em] xl:text-lg xl:tracking-[0.12em] 2xl:tracking-[0.14em]",
      )}
    >
      {label}
    </Link>
  );
}
