// Medalha de Imortal com a posição no ranking impressa na placa, como no jogo. PNG de 256 px:
// nítida até 128 px na tela de densidade 2. Abaixo de Imortal não desenha nada.

import Image from "next/image";

export function ImmortalMedal({ rankTier, rank, size = 96 }: { rankTier: number | null; rank: number | null; size?: number }) {
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
