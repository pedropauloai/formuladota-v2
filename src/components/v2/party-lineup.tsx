// A party como a barra de grupo do cliente do Dota: o retrato do dono e os lugares quadrados.
// O primeiro lugar livre respira em verde: é a vaga que a compra preenche. Os textos vêm de quem
// usa (já traduzidos); aqui só a forma.

import Image from "next/image";
import { Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./v2.module.css";

export interface PartyLineupProps {
  owner: { avatarUrl: string; label: string };
  /** Rótulo do lugar aceso ("Você") e dos demais livres ("Vaga"). */
  youLabel: string;
  openLabel: string;
  /** Frase para leitor de tela que descreve a party inteira. */
  ariaLabel: string;
  /** Lugares além do dono (a party do Dota tem 5, então 4). */
  seats?: number;
  /** Lado do quadrado em px. */
  size?: number;
  labels?: boolean;
  className?: string;
}

const LABEL = "font-display-condensed text-sm uppercase leading-none tracking-[0.12em]";

export function PartyLineup({ owner, youLabel, openLabel, ariaLabel, seats = 4, size = 52, labels = true, className }: PartyLineupProps) {
  return (
    <div role="img" aria-label={ariaLabel} className={cn("flex items-start gap-1.5 sm:gap-2", className)}>
      <div className="flex flex-col items-center gap-1.5">
        <span className={cn(styles.slot, styles.slotOwner)} style={{ width: size }}>
          <Image src={owner.avatarUrl} alt="" width={size * 2} height={size * 2} className="size-full object-cover object-top" />
        </span>
        {labels && <span className={cn(LABEL, "text-gold")}>{owner.label}</span>}
      </div>
      {Array.from({ length: seats }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <span className={cn(styles.slot, i === 0 ? styles.slotYou : styles.slotOpen)} style={{ width: size }}>
            {i === 0 ? <UserPlus size={Math.round(size * 0.4)} aria-hidden="true" /> : <Plus size={Math.round(size * 0.3)} aria-hidden="true" />}
          </span>
          {labels && <span className={cn(LABEL, i === 0 ? "text-play-primary" : "text-text-faded")}>{i === 0 ? youLabel : openLabel}</span>}
        </div>
      ))}
    </div>
  );
}
