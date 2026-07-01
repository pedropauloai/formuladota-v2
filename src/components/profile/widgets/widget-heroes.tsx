// WidgetHeroes — heróis DESTAQUE do perfil (híbrido, Pedro 2026-07-01):
// leitura mostra os fixados + auto-fill pelos melhores por stat (tag "fixado"/"auto");
// edição edita a lista de FIXADOS (favoriteHeroes) via HeroesEditor.

import { useTranslations } from "next-intl";
import { Pin, BarChart3 } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import { HeroesEditor } from "../inline-edit-controls";
import { HeroVideo } from "@/components/dota/hero-video";
import type { HeroData } from "@/lib/queries/heroes";

interface Props {
  /** Fixados pelo user — o que o editor manipula. */
  favoriteHeroes: HeroData[];
  /** Exibição: fixados + auto-fill por stat. */
  featuredHeroes: { hero: HeroData; pinned: boolean }[];
  editing: boolean;
}

export function WidgetHeroes({ favoriteHeroes, featuredHeroes, editing }: Props) {
  const t = useTranslations("perfil");
  return (
    <WidgetShell title={t("widgetHeroesTitle")} editing={editing}>
      {editing ? (
        <HeroesEditor initialFavorites={favoriteHeroes} />
      ) : featuredHeroes.length > 0 ? (
        // Vídeo VIVO do herói (webm Valve) preenchendo a altura — sem scroll interno.
        <div className="grid h-full grid-cols-3 grid-rows-1 gap-3">
          {featuredHeroes.slice(0, 3).map(({ hero, pinned }) => (
            <div key={hero.slug} className="flex min-h-0 flex-col gap-1.5">
              <div className="relative min-h-0 flex-1">
                <HeroVideo
                  heroSlug={hero.slug}
                  heroName={hero.name_pt}
                  className="h-full w-full rounded-sm"
                />
                {/* Tag "fixado" (escolha do user) x "auto" (melhor por stat). */}
                <span
                  className={`absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-wide ${
                    pinned
                      ? "bg-brand-primary/85 text-text-display"
                      : "bg-bg-deep/80 text-text-muted"
                  }`}
                >
                  {pinned ? (
                    <Pin size={9} aria-hidden="true" />
                  ) : (
                    <BarChart3 size={9} aria-hidden="true" />
                  )}
                  {pinned ? t("heroPinned") : t("heroAuto")}
                </span>
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
