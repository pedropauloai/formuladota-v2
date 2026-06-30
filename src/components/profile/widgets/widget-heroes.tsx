// WidgetHeroes — até 3 heróis favoritos do user. Editável inline em edit mode.

import Image from "next/image";
import { useTranslations } from "next-intl";
import { WidgetShell } from "./widget-shell";
import { HeroesEditor } from "../inline-edit-controls";
import type { HeroData } from "@/lib/queries/heroes";

interface Props {
  favoriteHeroes: HeroData[];
  editing: boolean;
}

export function WidgetHeroes({ favoriteHeroes, editing }: Props) {
  const t = useTranslations("perfil");
  return (
    <WidgetShell title={t("widgetHeroesTitle")} editing={editing}>
      {editing ? (
        <HeroesEditor initialFavorites={favoriteHeroes} />
      ) : favoriteHeroes.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {favoriteHeroes.slice(0, 3).map((hero) => (
            <div key={hero.slug} className="flex flex-col gap-1.5">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm border border-border-subtle">
                <Image
                  src={hero.image_full}
                  alt={hero.name_pt}
                  fill
                  sizes="180px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p className="truncate font-display text-xs font-semibold text-text-muted">
                {hero.name_pt}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-display text-[13px] font-semibold text-text-faded italic">
          {t("noFavoriteHeroes")}
        </p>
      )}
    </WidgetShell>
  );
}
