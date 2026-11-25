// O destaque de quem está falando, como no Discord: anel verde nítido em volta do avatar, com um brilho
// leve. É o mesmo na árvore de canais, no palco e no painel de voz. Acende e apaga pelo nível de voz
// (segurado um instante para não piscar); a transição some para quem pediu menos movimento.

import { cn } from "@/lib/utils";

export function anelFala(falando: boolean): string {
  return cn(
    "motion-safe:transition-shadow motion-safe:duration-150",
    falando && "ring-2 ring-play-primary ring-offset-2 ring-offset-bg-base shadow-[0_0_12px_2px_color-mix(in_oklab,var(--color-play-primary)_55%,transparent)]",
  );
}
