// Cards da vitrine, no molde da loja do cliente do Dota: ícone do item no slot, nome, onde acontece
// e o preço em dourado. O destaque (mentoria e acompanhamento) leva os itens do que vem no pacote
// e o contador de vagas do mês. Preço e vagas vêm do banco.

import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import { mdBullets } from "@/lib/loja/text";
import type { StoreProduct } from "@/lib/loja/catalog";
import type { SlotInfo } from "@/lib/loja/slots";
import { ItemArt } from "./item-art";
import { ModeTag } from "./mode-tag";
import { SlotsMeter } from "./slots-meter";

interface CardProps {
  product: StoreProduct;
  slots?: SlotInfo;
}

function Price({ product, large = false }: { product: StoreProduct; large?: boolean }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className={cn("font-display leading-none tabular-nums text-gold", large ? "text-4xl md:text-5xl" : "text-3xl")}>
        {formatPrice(product.fromPriceCents)}
      </span>
      {product.priceUnit && <span className="text-xs text-text-muted">{product.priceUnit}</span>}
    </p>
  );
}

export function ProductCard({ product, slots }: CardProps) {
  const t = useTranslations("loja");
  return (
    <Link
      href={`/loja/${product.slug}`}
      className="group flex h-full flex-col rounded-md border border-border-strong bg-bg-base p-5 transition-colors duration-200 hover:border-gold/50 hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <div className="flex items-start justify-between gap-3">
        <ItemArt art={product.art} size="md" className="transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5" />
        <ModeTag mode={product.mode} />
      </div>
      <h3 className="mt-4 font-display text-2xl uppercase leading-none tracking-wide text-text-display">{product.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{product.summary}</p>
      {slots && <SlotsMeter slots={slots} className="mt-4" />}
      <div className="mt-5 flex items-end justify-between gap-3 border-t border-border-subtle pt-4">
        <Price product={product} />
        <span className="inline-flex items-center gap-1 font-display text-base uppercase tracking-wide text-text-body group-hover:text-text-display">
          {slots?.left === 0 ? t("seeProduct") : t("ctaBuy")}
          <ArrowRight size={15} aria-hidden="true" className="transition-transform motion-safe:group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function FeaturedProductCard({ product, slots }: CardProps) {
  const t = useTranslations("loja");
  const bullets = mdBullets(product.descriptionMd).slice(0, 3);
  const soldOut = slots?.left === 0;
  return (
    <Link
      href={`/loja/${product.slug}`}
      className="group grid h-full gap-5 rounded-md border border-gold/40 bg-bg-base p-5 shadow-[inset_0_1px_0_var(--color-border-gold)] transition-colors duration-200 hover:border-gold/70 hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:grid-cols-[auto_minmax(0,1fr)] md:p-6"
    >
      <ItemArt art={product.art} size="lg" className="transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5" />
      <div className="flex min-w-0 flex-col">
        <div className="min-w-0 space-y-2.5">
          <ModeTag mode={product.mode} />
          <h3 className="font-display text-3xl uppercase leading-none tracking-wide text-text-display">{product.title}</h3>
          <Price product={product} large />
        </div>
        {/* No destaque os itens do pacote substituem o resumo, que diria o mesmo. */}
        {bullets.length === 0 && <p className="mt-3 text-sm leading-relaxed text-text-muted">{product.summary}</p>}
        {bullets.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {bullets.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-body">
                <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="min-h-5 flex-1" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
          {slots ? <SlotsMeter slots={slots} /> : <span />}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-4 py-2 font-display text-base uppercase tracking-widest",
              soldOut ? "border border-border-strong text-text-body" : "bg-brand-primary text-text-display group-hover:bg-brand-primary-hover"
            )}
          >
            {soldOut ? t("seeProduct") : t("ctaReserve")}
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
