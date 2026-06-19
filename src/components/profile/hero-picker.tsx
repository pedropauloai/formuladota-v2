"use client";

// HeroPicker — Phase 9 refator 2026-05-26 (Pedro pediu modal fullscreen sem scroll).
//
// REFATOR: era um picker inline scrollável. Agora é Modal Dialog fullscreen
// com TODOS os 127 heróis visíveis simultaneamente, separados em 4 colunas
// pelos atributos primários canônicos do Dota 2:
//   - FORÇA (str)         — 36 heróis
//   - AGILIDADE (agi)     — 35 heróis
//   - INTELIGÊNCIA (int)  — 34 heróis
//   - UNIVERSAL (uni)     — 22 heróis
//
// UX:
//   - Single: click no herói = onChange + fecha modal
//   - Multi:  click marca/desmarca, botão Confirmar fecha
//   - Search bar no topo filtra todos os atributos simultaneamente
//   - ESC fecha
//
// Controlado: parent passa `open` + `onOpenChange` (estado externo).

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, X, Check } from "lucide-react";
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAllHeroes, type HeroData } from "@/lib/queries/heroes";

type Mode = "multi" | "single";
type PrimaryAttr = "str" | "agi" | "int" | "uni";

interface Props {
  mode: Mode;
  maxSelections?: number;
  initialSelected: string[];
  onChange: (selected: string[]) => void;
  /** Modal controlado pelo parent. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ATTR_LABELS: Record<PrimaryAttr, string> = {
  str: "Força",
  agi: "Agilidade",
  int: "Inteligência",
  uni: "Universal",
};

const ATTR_COLORS: Record<PrimaryAttr, string> = {
  str: "text-red-400 border-red-400/30",
  agi: "text-green-400 border-green-400/30",
  int: "text-blue-400 border-blue-400/30",
  uni: "text-amber-400 border-amber-400/30",
};

export function HeroPicker({
  mode,
  maxSelections,
  initialSelected,
  onChange,
  open,
  onOpenChange,
}: Props) {
  const limit = maxSelections ?? (mode === "multi" ? 3 : 1);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState("");

  // Agrupa heróis por atributo. Filtra por search query simultaneamente.
  const heroesByAttr = useMemo(() => {
    const all = getAllHeroes();
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (h) =>
            h.name_pt.toLowerCase().includes(q) ||
            h.name_en.toLowerCase().includes(q) ||
            h.slug.toLowerCase().includes(q),
        )
      : all;
    const groups: Record<PrimaryAttr, HeroData[]> = {
      str: [],
      agi: [],
      int: [],
      uni: [],
    };
    filtered.forEach((h) => {
      const attr = h.primary_attr as PrimaryAttr;
      if (attr in groups) groups[attr].push(h);
    });
    // Ordem alfabética dentro de cada atributo (pt-BR) — pedido Pedro
    (Object.keys(groups) as PrimaryAttr[]).forEach((attr) => {
      groups[attr].sort((a, b) => a.name_pt.localeCompare(b.name_pt, "pt-BR"));
    });
    return groups;
  }, [query]);

  const isSelected = (slug: string) => selected.includes(slug);
  const isDisabled = (slug: string) =>
    mode === "multi" && selected.length >= limit && !isSelected(slug);

  function toggle(slug: string) {
    let next: string[];
    if (mode === "single") {
      next = [slug];
      setSelected(next);
      onChange(next);
      // Single fecha imediato após escolha
      onOpenChange(false);
      return;
    }
    // Multi: marca/desmarca, mantém aberto
    if (isSelected(slug)) {
      next = selected.filter((s) => s !== slug);
    } else if (selected.length < limit) {
      next = [...selected, slug];
    } else {
      return; // limite atingido
    }
    setSelected(next);
    onChange(next);
  }

  function handleConfirm() {
    onChange(selected);
    onOpenChange(false);
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="takeover" className="!p-4 lg:!p-6">
        {/* Painel principal — ocupa quase toda a viewport. O wrapper takeover
            já tem fixed inset-0 flex items-center justify-center, mas o div
            interno (motion m.div) limita w-full flex-col items-center.
            Forçamos h-full + max-w pra grid ocupar verdadeira tela toda. */}
        <div className="flex h-full w-full max-w-[1600px] flex-col gap-4 rounded-lg border border-brand-primary/40 bg-bg-deep/95 backdrop-blur-xl p-6 lg:p-8 shadow-2xl shadow-black/80">
          {/* Header — título + close */}
          <header className="flex items-center justify-between gap-4 shrink-0">
            <DialogTitle className="font-display text-2xl font-bold uppercase tracking-[0.08em] text-text-display">
              {mode === "single" ? "Escolha um herói" : `Escolha até ${limit} heróis favoritos`}
            </DialogTitle>
            <DialogClose
              className="rounded p-2 text-text-muted hover:bg-bg-elevated hover:text-text-display transition-colors"
              aria-label="Fechar"
            >
              <X size={20} aria-hidden="true" />
            </DialogClose>
          </header>

          {/* Search bar */}
          <div className="relative shrink-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faded pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar herói..."
              autoFocus
              className="w-full rounded border border-brand-primary/40 bg-bg-deep/80 pl-10 pr-3 py-2 font-display text-base 2xl:text-lg text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary"
            />
          </div>

          {/* 4 colunas por atributo — TODOS visíveis sem scroll
              Layout: flex-1 + min-h-0 garante que ocupe o resto do takeover */}
          <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {(["str", "agi", "int", "uni"] as PrimaryAttr[]).map((attr) => (
              <AttrColumn
                key={attr}
                attr={attr}
                heroes={heroesByAttr[attr]}
                isSelected={isSelected}
                isDisabled={isDisabled}
                onToggle={toggle}
              />
            ))}
          </div>

          {/* Footer — só pra multi, mostra contador + botão Confirmar */}
          {mode === "multi" && (
            <footer className="flex items-center justify-between gap-4 border-t border-border-subtle pt-4 shrink-0">
              <p className="font-display text-sm 2xl:text-base font-semibold text-text-body">
                {selected.length}/{limit} selecionados
              </p>
              <Button
                type="button"
                variant="cinematic"
                size="md"
                onClick={handleConfirm}
                disabled={selected.length === 0}
              >
                <Check size={14} aria-hidden="true" />
                Confirmar
              </Button>
            </footer>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

// ===========================================================================
// AttrColumn — uma coluna por atributo com header + grid de heróis
// ===========================================================================

function AttrColumn({
  attr,
  heroes,
  isSelected,
  isDisabled,
  onToggle,
}: {
  attr: PrimaryAttr;
  heroes: HeroData[];
  isSelected: (slug: string) => boolean;
  isDisabled: (slug: string) => boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      {/* Header da coluna — label do atributo com cor temática */}
      <header className={`flex items-center gap-2 border-b pb-2 ${ATTR_COLORS[attr]}`}>
        <span className="font-display text-sm font-bold uppercase tracking-[0.12em]">
          {ATTR_LABELS[attr]}
        </span>
        <span className="font-mono text-sm 2xl:text-base text-text-faded">({heroes.length})</span>
      </header>

      {/* Grid de heróis — auto-fit pra encaixar todos sem scroll */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5 content-start overflow-y-auto no-scrollbar">
        {heroes.map((hero) => {
          const sel = isSelected(hero.slug);
          const disabled = isDisabled(hero.slug);
          return (
            <button
              key={hero.slug}
              type="button"
              onClick={() => onToggle(hero.slug)}
              disabled={disabled}
              aria-pressed={sel}
              title={hero.name_pt}
              className={`relative aspect-[1.778] rounded overflow-hidden border-2 transition-all ${
                sel
                  ? "border-brand-primary ring-2 ring-brand-primary/40 shadow-[0_0_12px_var(--color-brand-primary-glow)]"
                  : disabled
                    ? "border-border-subtle opacity-30 cursor-not-allowed"
                    : "border-border-subtle hover:border-brand-primary/60 hover:scale-105"
              }`}
            >
              <Image
                src={hero.image_full}
                alt={hero.name_pt}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
              {sel && (
                <span className="absolute inset-0 flex items-center justify-center bg-brand-primary/30">
                  <Check size={16} className="text-text-display" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
