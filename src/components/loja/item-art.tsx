// Arte de cada produto: ícone oficial de item do Dota (regra do projeto, arte da Valve por hotlink
// do CDN), retrato de herói, ou a escada de medalhas do boost. Sem hook: serve em Server e Client.

import { cn } from "@/lib/utils";
import Image from "next/image";

const DOTA_IMG = "https://cdn.steamstatic.com/apps/dota2/images/dota_react";

// Os ícones de item da Valve têm 88x64.
const SIZES = { sm: [44, 32], md: [66, 48], lg: [99, 72], xl: [132, 96] } as const;
export type ArtSize = keyof typeof SIZES;

export function artSrc(art: string | null): string | null {
  const match = art?.match(/^(item|hero):([a-z0-9_]+)$/);
  if (!match) return null;
  return match[1] === "item" ? `${DOTA_IMG}/items/${match[2]}.png` : `${DOTA_IMG}/heroes/${match[2]}.png`;
}

// Do Ancião ao Imortal: a subida que o boost vende.
const LADDER = ["ancient-3", "divine-3", "immortal"] as const;

function MedalLadder({ size, className }: { size: ArtSize; className?: string }) {
  const height = SIZES[size][1];
  const medal = Math.round(height * 0.92);
  // Três medalhas sobrepostas ocupam umas 2,1 alturas: a escada ganha largura própria.
  const width = Math.round(height * 2.1);
  return (
    <span className={cn("relative inline-flex shrink-0 items-end justify-start", className)} style={{ width, height }} aria-hidden="true">
      {LADDER.map((image, i) => (
        <Image
          key={image}
          src={`/icons/dota-ranks/${image}.png`}
          alt=""
          width={medal}
          height={medal}
          className={cn("object-contain", i < LADDER.length - 1 && "opacity-60")}
          style={{
            width: medal,
            height: medal,
            marginLeft: i > 0 ? -Math.round(medal * 0.38) : 0,
            marginBottom: -Math.round((LADDER.length - 1 - i) * height * 0.08),
          }}
        />
      ))}
    </span>
  );
}

export function ItemArt({ art, size = "md", className }: { art: string | null; size?: ArtSize; className?: string }) {
  if (art === "medalhas") return <MedalLadder size={size} className={className} />;
  const src = artSrc(art);
  if (!src) return null;
  const [width, height] = SIZES[size];
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-sm border border-border-strong bg-bg-deep", className)}
      style={{ width, height }}
      aria-hidden="true"
    >
      <Image src={src} alt="" width={width} height={height} className="h-full w-full object-cover" />
    </span>
  );
}
