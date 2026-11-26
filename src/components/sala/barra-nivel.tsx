"use client";

// A barra do nível ao vivo do microfone, verde com a porta de ruído aberta (o que passa para a sala) e
// dourada abaixo dela. A mesma na engrenagem (com a régua por cima, no manual) e na entrada da sala.

import type { ReactNode } from "react";
import { SENSIBILIDADE, type MedidaPorta } from "@/lib/sala/cliente/porta-voz";
import { cn } from "@/lib/utils";

/** Posição na régua (0 a 100%) de um nível em dB. */
export const naRegua = (db: number) =>
  ((Math.min(SENSIBILIDADE.max, Math.max(SENSIBILIDADE.min, db)) - SENSIBILIDADE.min) / (SENSIBILIDADE.max - SENSIBILIDADE.min)) * 100;

export function BarraDeNivel({ medida, children }: { medida: MedidaPorta | null; children?: ReactNode }) {
  const nivel = medida?.nivel ?? SENSIBILIDADE.min;
  const aberta = medida?.aberta ?? false;
  return (
    <div
      className="relative h-6"
      data-sala-config-nivel={Math.round(nivel)}
      data-sala-porta={aberta ? "aberta" : "fechada"}
      data-sala-porta-fala={medida?.fala == null ? "" : Math.round(medida.fala * 100)}
      data-sala-porta-corrida={medida?.corrida ?? 0}
    >
      <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-sm bg-bg-deep" aria-hidden="true">
        <div className={cn("h-full transition-[width] duration-75 ease-linear", aberta ? "bg-play-primary" : "bg-gold-muted")} style={{ width: `${naRegua(nivel)}%` }} />
      </div>
      {children}
    </div>
  );
}
