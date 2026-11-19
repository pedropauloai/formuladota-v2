// A party como a barra de grupo do cliente do Dota: o retrato do dono, quem já está na party e os
// lugares livres. O primeiro lugar livre respira em verde: é a vaga que a compra preenche. Os
// textos vêm de quem usa (já traduzidos); aqui só a forma.

import Image from "next/image";
import { Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./v2.module.css";

export interface PartySeat {
  label: string;
  avatarUrl: string | null;
}

export interface PartyLineupProps {
  owner: { avatarUrl: string; label: string };
  /** Quem já está na party (na fila da live); ocupa os primeiros lugares. */
  members?: PartySeat[];
  /** Rótulo do lugar aceso ("Você") e dos demais livres ("Vaga"). */
  youLabel: string;
  openLabel: string;
  /** Frase para leitor de tela que descreve a party inteira. */
  ariaLabel: string;
  /** Lugares além do dono (a party do Dota tem 5, então 4). */
  seats?: number;
  /** O primeiro lugar livre convida em verde ("Você"); sem vaga de verdade, todos ficam neutros. */
  invite?: boolean;
  /** Lado do quadrado em px. */
  size?: number;
  labels?: boolean;
  className?: string;
}

const LABEL = "max-w-full truncate font-display-condensed text-sm uppercase leading-none tracking-[0.12em]";

function Avatar({ src, label, size }: { src: string | null; label: string; size: number }) {
  if (src) return <Image src={src} alt="" width={size * 2} height={size * 2} className="size-full object-cover object-top" />;
  return <span className="font-display-condensed text-lg uppercase text-text-body">{label.slice(0, 2)}</span>;
}

export function PartyLineup({ owner, members = [], youLabel, openLabel, ariaLabel, seats = 4, invite = true, size = 52, labels = true, className }: PartyLineupProps) {
  const filled = members.slice(0, seats);
  const open = Math.max(0, seats - filled.length);
  return (
    <div role="img" aria-label={ariaLabel} className={cn("flex items-start gap-1.5 sm:gap-2", className)}>
      <div className="flex flex-col items-center gap-1.5" style={{ width: size }}>
        <span className={cn(styles.slot, styles.slotOwner)} style={{ width: size }}>
          <Avatar src={owner.avatarUrl} label={owner.label} size={size} />
        </span>
        {labels && <span className={cn(LABEL, "text-gold")}>{owner.label}</span>}
      </div>
      {filled.map((m, i) => (
        <div key={`m${i}`} className="flex flex-col items-center gap-1.5" style={{ width: size }}>
          <span className={cn(styles.slot, styles.slotMember)} style={{ width: size }}>
            <Avatar src={m.avatarUrl} label={m.label} size={size} />
          </span>
          {labels && <span className={cn(LABEL, "text-text-body")}>{m.label}</span>}
        </div>
      ))}
      {Array.from({ length: open }, (_, i) => {
        const you = invite && i === 0;
        return (
          <div key={`o${i}`} className="flex flex-col items-center gap-1.5" style={{ width: size }}>
            <span className={cn(styles.slot, you ? styles.slotYou : styles.slotOpen)} style={{ width: size }}>
              {you ? <UserPlus size={Math.round(size * 0.4)} aria-hidden="true" /> : <Plus size={Math.round(size * 0.3)} aria-hidden="true" />}
            </span>
            {labels && <span className={cn(LABEL, you ? "text-play-primary" : "text-text-faded")}>{you ? youLabel : openLabel}</span>}
          </div>
        );
      })}
    </div>
  );
}
