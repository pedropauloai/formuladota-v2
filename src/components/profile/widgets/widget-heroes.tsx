// WidgetHeroes — até 3 heróis favoritos do user. Editável inline em edit mode.

import { useTranslations } from "next-intl";
import { WidgetShell } from "./widget-shell";
import { HeroesEditor } from "../inline-edit-controls";
import { HeroVideo } from "@/components/dota/hero-video";
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
        // Vídeo VIVO do herói (webm Valve) preenchendo a altura — sem scroll interno.
        <div className="grid h-full grid-cols-3 grid-rows-1 gap-3">
          {favoriteHeroes.slice(0, 3).map((hero) => (
            <div key={hero.slug} className="flex min-h-0 flex-col gap-1.5">
              <div className="min-h-0 flex-1">
                <HeroVideo
                  heroSlug={hero.slug}
                  heroName={hero.name_pt}
                  className="h-full w-full rounded-sm"
                />
              </div>
              <p className="shrink-0 truncate text-center font-display text-xs font-semibold text-text-muted">
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
