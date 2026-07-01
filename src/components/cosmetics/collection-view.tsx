"use client";

// Biblioteca de cosméticos (rota /colecao). Agrupa a coleção por slot e mostra o
// preview + estado de cada item. Fase 0 do Compendium (ver docs/foundations/COMPENDIUM.md).

import { useTranslations } from "next-intl";
import { Palette } from "lucide-react";
import { CosmeticCard } from "./cosmetic-card";
import type { MyCollection } from "@/lib/queries/cosmetics";
import type { CosmeticSlot } from "@/lib/cosmetics";

// Ordem de exibição dos slots (os funcionais primeiro).
const SLOT_ORDER: CosmeticSlot[] = [
  "ring",
  "frame",
  "smoke",
  "badge",
  "profile_theme",
  "name_effect",
  "notification_sound",
  "chat_reaction",
];

export function CollectionView({
  collection,
}: {
  collection: MyCollection | null;
}) {
  const t = useTranslations("colecao");

  if (!collection || collection.slots.length === 0) {
    return (
      <p className="py-16 text-center font-display text-sm text-text-faded">
        {t("empty")}
      </p>
    );
  }

  const ordered = [...collection.slots].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-2">
        <p className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary">
          <Palette size={16} aria-hidden="true" /> {t("eyebrow")}
        </p>
        <h1 className="font-display text-2xl uppercase tracking-tight text-text-display">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
          {t("subtitle")}
        </p>
      </header>

      {ordered.map((group) => (
        <section key={group.slot} className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-body">
            {t(`slots.${group.slot}`)}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {group.items.map((item) => (
              <CosmeticCard key={item.id} item={item} level={collection.level} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
