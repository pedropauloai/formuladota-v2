// Peças do design 2.0 que não são placa: painel, preço em ouro, ponto de ao vivo, brasas e
// hexágono. Sem hook: servem em Server e Client Component.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import { lift, panel, type PanelLift, type PanelTone } from "./plate";
import styles from "./v2.module.css";

type PanelTag = "div" | "section" | "article" | "aside";

/** Painel chanfrado com a sombra no invólucro. Para cartão que é link, use panel() e lift(). */
export function Panel({
  as: Tag = "div",
  tone = "neutral",
  shadow = "dark",
  className,
  wrapperClassName,
  children,
  ...rest
}: {
  as?: PanelTag;
  tone?: PanelTone;
  shadow?: PanelLift;
  className?: string;
  wrapperClassName?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <div className={cn(lift(shadow), wrapperClassName)}>
      <Tag className={cn(panel(tone), className)} {...rest}>
        {children}
      </Tag>
    </div>
  );
}

/** Preço da vitrine em ouro, com o "R$" menor. O tamanho vem do font-size da classe. */
export function Price({ cents, unit, className }: { cents: number; unit?: string; className?: string }) {
  const [currency, ...rest] = formatPrice(cents).split(/\s/);
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={styles.price}>
        <span className={styles.priceCurrency}>{currency}</span>
        {rest.join(" ")}
      </span>
      {unit && <span className="font-body text-xs font-medium tracking-normal text-text-muted">{unit}</span>}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn(styles.liveDot, className)} />;
}

// Posições fixas: a cena é a mesma em toda visita e o servidor desenha igual ao navegador.
const EMBER_SEEDS = [
  { left: 8, delay: 0.2, dur: 6.4, drift: 10, rise: 150 },
  { left: 19, delay: 2.9, dur: 7.2, drift: -14, rise: 190 },
  { left: 31, delay: 1.3, dur: 5.6, drift: 18, rise: 140 },
  { left: 44, delay: 4.1, dur: 6.8, drift: -8, rise: 210 },
  { left: 57, delay: 0.8, dur: 7.6, drift: 12, rise: 170 },
  { left: 66, delay: 3.4, dur: 5.9, drift: -16, rise: 150 },
  { left: 78, delay: 1.9, dur: 6.6, drift: 9, rise: 200 },
  { left: 90, delay: 4.8, dur: 7.1, drift: -11, rise: 160 },
];

/** Fagulhas subindo dentro do pai (que precisa de position relativa). Somem com menos movimento. */
export function Embers({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn(styles.embers, className)}>
      {EMBER_SEEDS.slice(0, count).map((s) => (
        <span
          key={s.left}
          className={styles.ember}
          style={
            {
              left: `${s.left}%`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
              "--drift": `${s.drift}px`,
              "--rise": `${s.rise}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** Marcador hexagonal dos eventos do cliente, com aresta dourada. */
export function HexBadge({ size = 64, className, children }: { size?: number; className?: string; children: ReactNode }) {
  return (
    <span className={cn(styles.hex, className)} style={{ width: size }}>
      <span className={styles.hexFace}>{children}</span>
    </span>
  );
}
