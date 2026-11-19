// PROTÓTIPO (descartável): peças pequenas que as três versões usam (preço, party, brasas).
// Só peças; cada versão monta o próprio layout.

import Image from "next/image";
import { Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import styles from "./materiais.module.css";

export { styles as m };

/** Preço em ouro com o "R$" menor, como os números de valor do jogo. */
export function Preco({ cents, className, unit }: { cents: number; className?: string; unit?: string }) {
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

// Posições fixas: a cena é a mesma em toda visita (sem número aleatório na renderização).
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

export function Brasas({ count = 8, className }: { count?: number; className?: string }) {
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

/** Medalha de Imortal com a posição no ranking impressa na placa, como no jogo (PNG de 256 px). */
export function Medalha({ rankTier, rank, size = 96 }: { rankTier: number | null; rank: number | null; size?: number }) {
  const immortal = rankTier !== null && Math.floor(rankTier / 10) >= 8;
  if (!immortal) return null;
  const image = rank === null ? "immortal" : rank <= 100 ? "immortal-top-100" : "immortal-leaderboard";
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <Image
        src={`/icons/dota-ranks/${image}.png`}
        alt=""
        width={256}
        height={256}
        className="size-full object-contain drop-shadow-[0_0_18px_var(--color-brand-primary-glow)]"
      />
      {rank !== null && (
        <span
          className="absolute inset-x-0 top-[78%] flex h-[14%] items-center justify-center font-display leading-none tracking-wide text-gold-cream"
          style={{ fontSize: Math.round(size * 0.135) }}
        >
          {rank}
        </span>
      )}
    </span>
  );
}

/**
 * A party do Pedro como a barra de grupo do cliente: o retrato dele e quatro lugares, o primeiro
 * aceso em verde (a vaga que a compra preenche).
 */
export function PartyBar({
  avatarUrl,
  size = 56,
  labels = true,
  className,
}: {
  avatarUrl: string | null;
  size?: number;
  labels?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-1.5 sm:gap-2", className)} role="img" aria-label="Party do PeterPPA: ele e quatro vagas, uma delas a sua">
      <div className="flex flex-col items-center gap-1.5">
        <span className={cn(styles.slot, styles.slotOwner, "overflow-hidden rounded-sm")} style={{ width: size }}>
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={size * 2} height={size * 2} className="size-full object-cover object-top" />
          ) : (
            <span className="font-display-condensed text-2xl text-gold">PPA</span>
          )}
        </span>
        {labels && <span className="font-display-condensed text-sm uppercase leading-none tracking-[0.12em] text-gold">PPA</span>}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className={cn(styles.slot, styles.slotYou, "rounded-sm")} style={{ width: size }}>
          <UserPlus size={Math.round(size * 0.4)} aria-hidden="true" />
        </span>
        {labels && <span className="font-display-condensed text-sm uppercase leading-none tracking-[0.12em] text-play-primary">Você</span>}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <span className={cn(styles.slot, styles.slotOpen, "rounded-sm")} style={{ width: size }}>
            <Plus size={Math.round(size * 0.3)} aria-hidden="true" />
          </span>
          {labels && <span className="font-display-condensed text-sm uppercase leading-none tracking-[0.12em] text-text-faded">Vaga</span>}
        </div>
      ))}
    </div>
  );
}
