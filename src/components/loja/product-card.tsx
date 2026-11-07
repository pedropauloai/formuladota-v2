// Card de produto da vitrine: título, resumo e o preço (ou o "a partir de"). O preço vem do banco.

import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { StoreProduct } from "@/lib/loja/catalog";

export function ProductCard({ product, priceLabel, cta }: { product: StoreProduct; priceLabel: string; cta: string }) {
  return (
    <Link
      href={`/loja/${product.slug}`}
      className="group flex flex-col rounded-md border border-border-strong bg-bg-base p-5 transition-colors hover:border-brand-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <h2 className="font-display text-xl uppercase tracking-wide text-text-display">{product.title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{product.summary}</p>
      <div className="mt-5 flex items-end justify-between gap-3">
        <span className="font-display text-2xl font-bold tabular-nums text-gold">{priceLabel}</span>
        <span className="flex items-center gap-1 font-display text-sm uppercase tracking-wide text-text-body group-hover:text-text-display">
          {cta}
          <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
