// O resto da loja em linhas densas, como a lista de amigos do cliente do Dota, agrupado por onde
// o serviço acontece: ícone do item, nome, o que é, vagas do mês, preço em ouro e a placa de comprar.

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Price, plate } from "@/components/v2";
import type { StoreMode, StoreProduct } from "@/lib/loja/catalog";
import type { SlotInfo } from "@/lib/loja/slots";
import { ItemArt } from "./item-art";
import { SlotsMeter } from "./slots-meter";

// Ordem: o tempo contado do Pedro (âncora de preço), o que mais acontece na live e o resto.
const GROUPS: Array<{ key: string; modes: StoreMode[] }> = [
  { key: "Scheduled", modes: ["agendado"] },
  { key: "Live", modes: ["live"] },
  { key: "Off", modes: ["fora_da_live", "gravado"] },
  { key: "Digital", modes: ["digital"] },
];

function ServiceRow({ product, slots }: { product: StoreProduct; slots?: SlotInfo }) {
  const t = useTranslations("loja");
  const soldOut = slots?.left === 0;
  return (
    <li>
      <Link
        href={`/loja/${product.slug}`}
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-border-subtle px-2 py-4 transition-colors duration-150 hover:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-gold)_8%,transparent),transparent_70%)] focus-visible:outline-2 focus-visible:outline-text-display md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:px-4"
      >
        <span className="grid place-items-center self-start rounded-sm bg-bg-deep p-1.5 shadow-[inset_0_0_0_1px_var(--color-border-strong)] transition-shadow group-hover:shadow-[inset_0_0_0_1px_var(--color-gold)] md:self-center">
          <ItemArt art={product.art} size="sm" className="border-0" />
        </span>
        <span className="min-w-0">
          <span className="block font-display-condensed text-[1.6rem] uppercase leading-none text-text-display">{product.title}</span>
          <span className="mt-1 block text-sm leading-snug text-text-muted">{product.summary}</span>
          {slots && <SlotsMeter slots={slots} className="mt-2" />}
        </span>
        <Price cents={product.fromPriceCents} unit={product.priceUnit} className="col-start-2 text-[1.9rem] md:col-start-auto" />
        <span className={cn(plate({ kind: "ghost", small: true }), "col-start-3 row-span-2 row-start-1 self-center group-hover:text-text-display md:col-start-auto md:row-auto md:row-span-1")}>
          <span className="hidden sm:inline">{soldOut ? t("seeProduct") : t("ctaBuy")}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

export function ServiceRows({ products, slots }: { products: StoreProduct[]; slots: Map<string, SlotInfo> }) {
  const t = useTranslations("loja");
  const groups = GROUPS.map((g) => ({ ...g, items: products.filter((p) => g.modes.includes(p.mode)) })).filter((g) => g.items.length > 0);
  return (
    <div className="grid gap-10 xl:grid-cols-2">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`secao-${g.key.toLowerCase()}`} className={cn("space-y-2", g.items.length > 2 && "xl:col-span-2")}>
          <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-b-2 border-brand-primary/70 pb-2">
            <h2 id={`secao-${g.key.toLowerCase()}`} className="font-display-condensed text-[2.2rem] uppercase leading-none text-text-display">
              {t(`section${g.key}Title`)}
            </h2>
            <p className="text-xs text-text-muted">{t(`section${g.key}Text`)}</p>
          </header>
          <ul>
            {g.items.map((p) => (
              <ServiceRow key={p.id} product={p} slots={slots.get(p.id)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
