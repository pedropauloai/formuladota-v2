// WidgetHeroes — até 3 heróis favoritos do user. Editável inline em edit mode.

import Image from "next/image";
import { WidgetShell } from "./widget-shell";
import { HeroesEditor } from "../inline-edit-controls";
import type { HeroData } from "@/lib/queries/heroes";

interface Props {
  favoriteHeroes: HeroData[];
  editing: boolean;
}

export function WidgetHeroes({ favoriteHeroes, editing }: Props) {
  return (
    <WidgetShell title="Heróis favoritos" editing={editing}>
      {editing ? (
        <HeroesEditor initialFavorites={favoriteHeroes} />
      ) : favoriteHeroes.length > 0 ? (
        <div className="flex items-end gap-3 flex-wrap">
          {favoriteHeroes.slice(0, 3).map((hero) => (
            <div key={hero.slug} className="flex flex-col items-center gap-1">
              <div className="relative w-[72px] h-[40px] rounded-sm overflow-hidden border border-border-subtle">
                <Image
                  src={hero.image_full}
                  alt={hero.name_pt}
                  fill
                  sizes="72px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p className="font-display text-[11px] font-semibold text-text-faded truncate max-w-[72px]">
                {hero.name_pt}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-display text-[13px] font-semibold text-text-faded italic">
          Nenhum herói favorito definido.
        </p>
      )}
    </WidgetShell>
  );
}
