"use client";
// HeroPicker reutilizável (Phase 9).
// Modos:
//   - "multi" (Aba Heróis Favoritos): até 3 seleções, ordem importa
//   - "single" (Aba Hero Portrait): exatamente 1 seleção

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { getAllHeroes, searchHeroes, type HeroData } from "@/lib/queries/heroes";

type Mode = "multi" | "single";

interface Props {
  mode: Mode;
  maxSelections?: number;
  initialSelected: string[];
  onChange: (selected: string[]) => void;
}

export function HeroPicker({ mode, maxSelections, initialSelected, onChange }: Props) {
  const limit = maxSelections ?? (mode === "multi" ? 3 : 1);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState("");

  // Busca linear client-side nos 127 heróis — sub-1ms (D-23)
  const heroes = useMemo<HeroData[]>(() => {
    return query.trim() ? searchHeroes(query, 200) : getAllHeroes();
  }, [query]);

  const isSelected = (slug: string) => selected.includes(slug);
  const isDisabled = (slug: string) =>
    mode === "multi" && selected.length >= limit && !isSelected(slug);

  const toggle = (slug: string) => {
    let next: string[];
    if (mode === "single") {
      next = [slug];
    } else if (isSelected(slug)) {
      next = selected.filter((s) => s !== slug);
    } else if (selected.length < limit) {
      next = [...selected, slug];
    } else {
      return; // limite atingido — ignore clique em herói desabilitado
    }
    setSelected(next);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Campo de busca */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faded pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar herói..."
          aria-label="Buscar herói"
          className="w-full pl-9 pr-3 py-2 bg-bg-elevated border border-border-strong rounded-sm font-display text-[13px] font-semibold text-text-display placeholder:text-text-faded focus:outline-2 focus:outline-brand-primary"
        />
      </div>

      {/* Contador de selecionados (modo multi) */}
      {mode === "multi" && (
        <p className="font-display text-[13px] font-semibold text-text-muted">
          Selecionados: {selected.length}/{limit}
        </p>
      )}

      {/* Grid de heróis com role listbox para acessibilidade (C5) */}
      <div
        role="listbox"
        aria-multiselectable={mode === "multi"}
        aria-label="Catálogo de heróis"
        className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto"
      >
        {heroes.map((hero) => {
          const sel = isSelected(hero.slug);
          const dis = isDisabled(hero.slug);
          return (
            <button
              key={hero.slug}
              type="button"
              role="option"
              aria-selected={sel}
              aria-disabled={dis}
              disabled={dis}
              onClick={() => toggle(hero.slug)}
              className={[
                "flex flex-col items-center gap-1 p-1 rounded-sm transition-all",
                sel ? "ring-2 ring-brand-primary ring-offset-1 ring-offset-bg-deep" : "",
                dis
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-bg-elevated/40 cursor-pointer",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="relative w-[56px] h-[32px] rounded-sm overflow-hidden">
                <Image
                  src={hero.image_full}
                  alt={hero.name_pt}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p className="font-display text-[11px] font-semibold text-text-faded truncate max-w-[56px]">
                {hero.name_pt}
              </p>
            </button>
          );
        })}
      </div>

      {/* Empty state da busca */}
      {heroes.length === 0 && (
        <p className="text-center font-display text-[13px] font-semibold text-text-muted py-4">
          Nenhum herói encontrado.
        </p>
      )}
    </div>
  );
}
