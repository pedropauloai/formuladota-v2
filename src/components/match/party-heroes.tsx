import Image from "next/image";
import { cn } from "@/lib/utils";
import { getHeroById } from "@/lib/queries/heroes";

/** Ícones dos heróis da party numa partida (o do PPA primeiro): o ícone quadrado é o que o cliente do Dota usa em tamanho pequeno. */
export function PartyHeroes({ ids, locale, max, size, className }: { ids: readonly number[]; locale: string; max: number; size: number; className?: string }) {
  const heroes = ids
    .map((id) => getHeroById(id))
    .filter((h): h is NonNullable<ReturnType<typeof getHeroById>> => h !== null)
    .slice(0, max);
  if (heroes.length === 0) return null;
  return (
    <span className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {heroes.map((h) => {
        const nome = locale === "pt" ? h.name_pt : h.name_en;
        return (
          <Image
            key={h.id}
            src={h.image_icon}
            alt={nome}
            title={nome}
            width={size}
            height={size}
            unoptimized
            className="shrink-0 rounded-sm"
            style={{ width: size, height: size }}
          />
        );
      })}
    </span>
  );
}
